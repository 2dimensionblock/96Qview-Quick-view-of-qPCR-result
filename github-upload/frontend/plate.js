function Q96PlateEditor({ rows, onApply, onClose }) {
  const h = Ue.createElement;
  const [rowKind, setRowKind] = Ue.useState('gene'), [rowNames, setRowNames] = Ue.useState(Array(8).fill('')), [colNames, setColNames] = Ue.useState(Array(12).fill(''));
  const [kind, setKind] = Ue.useState('time'), [unit, setUnit] = Ue.useState(''), [overrides, setOverrides] = Ue.useState({});
  const [selected, setSelected] = Ue.useState(''), [draft, setDraft] = Ue.useState(null), [error, setError] = Ue.useState('');
  let wells = new Map(), loadError = '';
  try { wells = Q96.plateRows(rows); } catch (exception) { loadError = exception.message; }
  function assignment(row, col) {
    const well = String.fromCharCode(65 + row) + (col + 1), original = wells.get(well);
    const originalValue = original ? (original.group !== '默认组' ? original.group + ' / ' : '') + original.time : '';
    const gene = (rowKind === 'gene' ? rowNames[row] : colNames[col]) || (original?.gene === '待指定' ? '' : original?.gene) || '';
    const value = (rowKind === 'gene' ? colNames[col] : rowNames[row]);
    return overrides[well] || { gene, value: value || originalValue, unit: value ? unit : '', kind };
  }
  const field = (label, value, onChange, props = {}) => h('label', { className: 'field' }, h('span', null, label), h('input', { value, onChange: event => onChange(event.target.value), ...props }));
  const select = (label, value, onChange, options, id) => h('label', { className: 'field' }, h('span', null, label), h('select', { id, value, 'aria-label': label, onChange: event => onChange(event.target.value) }, options.map(([key, text]) => h('option', { key, value: key }, text))));
  const types = [['time', '时间'], ['concentration', '浓度'], ['temperature', '温度'], ['custom', '自定义']];
  const swap = value => { if (value !== rowKind) { setRowKind(value); setRowNames(Array(8).fill('')); setColNames(Array(12).fill('')); } };
  const choices = [['gene', '基因名称'], ['group', '组别 + 单位']];
  const openWell = (row, col) => { setSelected(String.fromCharCode(65 + row) + (col + 1)); setDraft({ ...assignment(row, col) }); setError(''); };
  function confirm() {
    try {
      const assignments = {};
      for (let row = 0; row < 8; row++) for (let col = 0; col < 12; col++) assignments[String.fromCharCode(65 + row) + (col + 1)] = assignment(row, col);
      const updated = Q96.applyPlate(rows, assignments);
      onApply(updated, { time: '时间', concentration: '浓度', temperature: '温度', custom: '组别' }[kind] + (unit ? ` / ${unit}` : ''));
    } catch (exception) { setError(exception.message); }
  }
  return h(xg, { open: true, onOpenChange: open => { if (!open) onClose(); } }, h(Sg, { className: 'plate-dialog' },
    h(bg, null, h(Cg, null, '孔自定义'), h(Lg, null, '96 孔板 · A–H 行 × 1–12 列。填写行列名称批量命名；双击孔位或按 Enter 单独编辑。')),
    h('div', { className: 'plate-toolbar' }, select('行命名', rowKind, swap, choices, 'plate-row-kind'), select('列命名', rowKind === 'gene' ? 'group' : 'gene', value => swap(value === 'gene' ? 'group' : 'gene'), choices, 'plate-col-kind'),
      select('组别类型', kind, value => { setKind(value); setUnit({ time: 'h', concentration: 'μM', temperature: '°C', custom: '' }[value]); }, types, 'plate-group-kind'), field('组别单位', unit, setUnit, { placeholder: '如 h、μM、°C；可留空', 'aria-label': '组别单位' })),
    h('p', { className: 'plate-note' }, '行与列自动互换命名类型。单孔编辑优先于行列命名；留空沿用已有名称。灰色孔没有导入数据，不参与计算。'),
    loadError && h('p', { className: 'mapping-error', role: 'alert' }, loadError),
    h('div', { className: 'plate-scroll' }, h('div', { className: 'plate-grid', role: 'group', 'aria-label': '96 孔命名表' },
      h('div', { className: 'plate-corner' }, '行 / 列', h('small', null, rowKind === 'gene' ? '基因 / 组别' : '组别 / 基因')),
      colNames.map((name, col) => h('label', { className: 'plate-col-name', key: 'col' + col }, h('span', null, col + 1), h('input', { 'aria-label': `列 ${col + 1} 命名`, value: name, placeholder: rowKind === 'gene' ? '组别' : '基因', onChange: event => setColNames(previous => previous.map((value, index) => index === col ? event.target.value : value)) }))),
      Array.from({ length: 8 }, (_, row) => h(Ue.Fragment, { key: row },
        h('label', { className: 'plate-row-name' }, h('span', null, String.fromCharCode(65 + row)), h('input', { 'aria-label': `行 ${String.fromCharCode(65 + row)} 命名`, value: rowNames[row], placeholder: rowKind === 'gene' ? '基因名称' : '组别', onChange: event => setRowNames(previous => previous.map((value, index) => index === row ? event.target.value : value)) })),
        Array.from({ length: 12 }, (_, col) => {
          const well = String.fromCharCode(65 + row) + (col + 1), entry = assignment(row, col), loaded = wells.has(well);
          return h('button', { type: 'button', key: well, className: 'plate-well' + (loaded ? ' loaded' : '') + (overrides[well] ? ' overridden' : ''), 'data-well': well, 'aria-label': `${well} ${entry.gene || '未命名'} ${entry.value} ${entry.unit}${loaded ? '' : ' 无数据'}`, title: `${well}\n${entry.gene || '未命名'}\n${entry.value} ${entry.unit}${overrides[well] ? '\n单孔命名' : ''}`, onDoubleClick: () => openWell(row, col), onKeyDown: event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openWell(row, col); } } }, h('span', { className: 'well-id' }, well), h('strong', null, entry.gene || '—'), h('small', null, `${entry.value} ${entry.unit}`.trim() || '—'));
        }))))),
    draft && h('section', { className: 'well-editor', 'aria-label': `编辑孔 ${selected}` }, h('strong', null, `编辑孔 ${selected}`),
      h('div', { className: 'plate-toolbar' }, field('基因名称', draft.gene, gene => setDraft(previous => ({ ...previous, gene })), { autoFocus: true, 'aria-label': '单孔基因名称' }), field('组别值', draft.value, value => setDraft(previous => ({ ...previous, value })), { 'aria-label': '单孔组别值' }), select('单孔组别类型', draft.kind, kind => setDraft(previous => ({ ...previous, kind })), types), field('单位', draft.unit, unit => setDraft(previous => ({ ...previous, unit })), { 'aria-label': '单孔单位' })),
      h('div', { className: 'plate-edit-actions' }, h('button', { className: 'button primary', onClick: () => { if (!Q96.isGene(draft.gene.trim()) || !draft.value.trim()) { setError('请输入含字母或汉字的基因名称，并填写组别值。'); return; } setOverrides(previous => ({ ...previous, [selected]: { ...draft } })); setDraft(null); setError(''); } }, '保存该孔'), h('button', { className: 'button', onClick: () => { setOverrides(previous => { const next = { ...previous }; delete next[selected]; return next; }); setDraft(null); setError(''); } }, '恢复行列命名'), h('button', { className: 'button', onClick: () => { setDraft(null); setError(''); } }, '取消单孔编辑'))),
    error && h('p', { className: 'mapping-error', role: 'alert' }, error),
    h('div', { className: 'plate-footer' }, h('span', null, `${wells.size} 个有数据的孔 · ${Object.keys(overrides).length} 个单独命名`), h('button', { className: 'button', onClick: onClose }, '取消'), h('button', { className: 'button primary', onClick: confirm, disabled: !rows.length || !!loadError || !!draft }, '确认命名'))));
}
function Q96NamingFailure({ reason, onClose, onMapping, onPlate }) {
  const h = Ue.createElement;
  return h(xg, { open: !!reason, onOpenChange: open => { if (!open) onClose(); } }, h(Sg, { className: 'naming-dialog' }, h(bg, null, h(Cg, null, '样本命名识别失败'), h(Lg, null, reason)), h('div', { className: 'plate-edit-actions' }, h('button', { className: 'button', onClick: onMapping }, '检查列名映射'), h('button', { className: 'button primary', onClick: onPlate }, '孔自定义'), h('button', { className: 'button', onClick: onClose }, '知道了'))));
}
