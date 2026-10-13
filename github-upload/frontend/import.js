function wk(sample, context) { return Q96.inferSample(sample, context); }
function Vc(table, header, mapping) {
  if (header < 0 || header >= table.length || mapping.ct < 0) throw new Error('请指定表头行和 Ct / Cq 列。');
  const rows = [], get = (row, field) => mapping[field] >= 0 ? Yi(row[mapping[field]]) : '';
  const data = table.slice(header + 1);
  const valid = row => row.some(value => value != null && Yi(value) !== '') &&
    !(mapping.well >= 0 && !/^[A-Za-z]{1,2}0?\d{1,3}$/.test(get(row, 'well')) && !/^\d+$/.test(get(row, 'well'))) &&
    !!(get(row, 'sample') || get(row, 'gene') || get(row, 'ct'));
  // Only sample-name dimensions participate; Ct and well numbers never affect the threshold.
  const context = Q96.namingContext(data.filter(valid).map(row => get(row, 'sample')));
  data.forEach((values, index) => {
    if (!valid(values)) return;
    const sample = get(values, 'sample'), inferred = wk(sample, context), explicitGene = get(values, 'gene');
    const gene = Q96.canonicalGene(Q96.isGene(explicitGene) ? explicitGene : inferred.gene) || (mapping.refCt >= 0 ? 'Target' : '待指定');
    const group = get(values, 'group') || inferred.group, time = get(values, 'time') || inferred.time;
    const bio = get(values, 'bio') || (mapping.gene >= 0 && mapping.group >= 0 && mapping.time >= 0 && sample ? sample : '');
    const rawCt = get(values, 'ct');
    const controlType = get(values, 'type');
    const row = { id: String(header + index + 2), well: get(values, 'well') || String(index + 1), sample: sample || [gene, group, time, bio].filter(Boolean).join('-'), gene, group, time, bio, ct: gw(rawCt), rawCt, excluded: false, controlType, control: /ntc|no.?template|阴性|无模板|空白对照|negative/i.test(controlType) };
    rows.push(row);
    if (mapping.refCt >= 0) rows.push({ ...row, id: row.id + 'r', well: row.well + 'r', gene: 'Reference', sample: row.sample + ' / Reference', ct: gw(get(values, 'refCt')), rawCt: get(values, 'refCt') });
  });
  if (rows.length > 10000) throw new Error('单次最多分析 10,000 个反应孔，请拆分文件。');
  if (!rows.length) throw new Error('没有找到反应孔。请核对工作表、表头行及列名映射。');
  return rows;
}
function jc(rows) {
  const genes = Oa(rows.map(row => row.gene));
  const reference = genes.find(Q96.isReference) || genes[0] || '';
  const groups = qn(Oa(rows.map(row => row.group))), times = qn(Oa(rows.map(row => row.time)));
  return { reference, refGroup: '__same', mode: 'technical', calGroup: groups[0] || '', calTime: times[0] || '', error: 'sd', cutoff: '', highCt: 35, spread: 0.5 };
}
