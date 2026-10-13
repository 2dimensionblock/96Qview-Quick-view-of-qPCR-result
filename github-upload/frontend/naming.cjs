/* Shared by the embedded frontend and regression tests. No runtime dependencies. */
(function (root) {
  'use strict';
  const REFERENCES = ['GAPDH','ACTB','18S rRNA','28S rRNA','B2M','HPRT1','TBP','PPIA','UBC','SDHA','RPL13A','RPLP0','YWHAZ','PGK1','HMBS','GUSB','ALAS1','ACT7','ACT11','ACT2','TUB','EF1a','UBQ10','UBQ9','PP2A','SAND','16S rRNA','rpoB','gyrB','recA','ACT1','PDA1','TEF1','RDN18'];
  const key = value => String(value ?? '').normalize('NFKC').replace(/\s+/g, '').toLowerCase();
  const referenceNames = new Map(REFERENCES.map(name => [key(name), name]));
  for (const [alias, name] of [['reference','Reference'],['18s','18S rRNA'],['28s','28S rRNA'],['16s','16S rRNA'],['β-actin','ACTB'],['beta-actin','ACTB']]) referenceNames.set(key(alias), name);
  const canonicalGene = value => referenceNames.get(key(value)) || String(value ?? '').trim();
  const isReference = value => referenceNames.has(key(value));
  const isGene = value => /[a-z\p{Script=Han}]/iu.test(value) && !/^检测项目\d*$/.test(value) && value !== '待指定';
  function numericToken(value) {
    const match = String(value).trim().match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)\s*(h|hr|hrs|hour|hours|hpf|min|mins|s|sec|d|day|days|小时|分钟|秒|天|°?c|℃|°?f|℉|k|μm|µm|um|mm|nm|m|mg\/?ml|μg\/?ml|µg\/?ml|ug\/?ml|ng\/?ml|g\/?l|%|倍)?$/i);
    return match && Number.isFinite(Number(match[1])) ? { value: Number(match[1]), unit: match[2] || '' } : null;
  }
  function tokenize(sample) {
    const parts = String(sample ?? '').trim().replace(/[–—－]/g, '-').split(/[-_]/).map(s => s.trim());
    // A doubled delimiter before a number represents its minus sign.
    for (let i = 0; i < parts.length - 1; i++) if (parts[i] === '' && numericToken(parts[i + 1])) parts.splice(i, 2, '-' + parts[i + 1]);
    return parts.filter(Boolean);
  }
  function tokensFor(sample) {
    const parts = tokenize(sample);
    let geneIndex = parts.findIndex(isReference);
    if (geneIndex < 0) geneIndex = parts.findIndex(part => isGene(part) && !numericToken(part));
    const gene = geneIndex < 0 ? '' : canonicalGene(parts[geneIndex]);
    return { gene, dimensions: parts.filter((_, i) => i !== geneIndex) };
  }
  function namingContext(samples) {
    const maxima = new Map();
    for (const sample of samples) {
      const { dimensions } = tokensFor(sample);
      dimensions.forEach((part, index) => {
        const number = numericToken(part);
        if (!number) return;
        const position = dimensions.length - index;
        maxima.set(position, Math.max(maxima.get(position) ?? -Infinity, number.value));
      });
    }
    return { maxima, hasLarge: [...maxima.values()].some(max => max > 8) };
  }
  function inferSample(sample, context = namingContext([sample])) {
    const parsed = tokensFor(sample);
    const dimensions = parsed.dimensions.filter((part, index) => {
      if (!numericToken(part)) return true;
      const max = context.maxima.get(parsed.dimensions.length - index);
      return !context.hasLarge || max > 8;
    });
    return { gene: parsed.gene, group: dimensions.length > 1 ? dimensions.slice(0, -1).join('-') : '默认组', time: dimensions.at(-1) || '1' };
  }
  function failureReason(rows, mapping) {
    if (!rows.length || rows.some(row => row.gene !== '待指定')) return '';
    if (mapping.sample < 0 && mapping.gene < 0) return '未找到样本名称列或基因名称列，因此所有基因均为“待指定”。请在“列名映射”中选择对应列，或使用“孔自定义”指定孔位。';
    if (rows.every(row => !isGene(row.sample))) return '样本名称为空或仅包含数字，未找到含字母或汉字的基因名称，因此所有基因均为“待指定”。数字只用于分组，不能作为基因。请修正列名映射，或使用“孔自定义”。';
    return '所选基因列为空、仅包含数字或为仪器占位名称；样本名中也未识别到基因，因此所有基因均为“待指定”。支持“基因-时间”和“基因-组别-时间”，例如 GAPDH-24、GeneX-Control-24。可通过“列名映射”或“孔自定义”修正。';
  }
  function wellKey(value) {
    const text = String(value ?? '').trim().toUpperCase();
    const match = text.match(/^([A-H])0?([1-9]|1[0-2])$/);
    if (match) return match[1] + Number(match[2]);
    if (/^\d+$/.test(text) && Number(text) >= 1 && Number(text) <= 96) {
      const index = Number(text) - 1;
      return String.fromCharCode(65 + Math.floor(index / 12)) + (index % 12 + 1);
    }
    return '';
  }
  function plateRows(rows) {
    const wells = new Map();
    for (const row of rows) {
      const well = wellKey(row.well);
      if (!well) throw new Error(`孔位“${row.well}”不属于 A1–H12 或 1–96。请先在“列名映射”中选择正确的孔位列；配对宽表请改为每孔一行。`);
      if (wells.has(well)) throw new Error(`孔位 ${well} 出现多次。孔自定义适用于单块 96 孔板，请将多板数据拆分后导入。`);
      wells.set(well, row);
    }
    return wells;
  }
  function applyPlate(rows, assignments) {
    plateRows(rows);
    return rows.map(row => {
      const well = wellKey(row.well), entry = assignments[well];
      if (!entry || !isGene(entry.gene.trim()) || !entry.value.trim()) throw new Error(`请完整命名 ${well}：基因名称需含字母或汉字，组别不能为空。`);
      const unit = (entry.unit || '').trim(), value = entry.value.trim();
      const time = unit && !value.toLowerCase().endsWith(unit.toLowerCase()) ? value + ' ' + unit : value;
      return { ...row, gene: canonicalGene(entry.gene), group: '默认组', time, groupKind: entry.kind || 'custom', groupUnit: unit };
    });
  }
  const api = { REFERENCES, canonicalGene, isReference, isGene, numericToken, namingContext, inferSample, failureReason, wellKey, plateRows, applyPlate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Q96 = api;
})(globalThis);
