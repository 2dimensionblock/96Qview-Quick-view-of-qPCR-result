// Preserve the imported control flag. Overrides only apply to the selected reference.
function Q96referenceCandidates(rows, reference) {
  const explicitNtc = /(?:^|[^a-z])ntc(?:$|[^a-z])|no[\s_-]*template|无模板|空白对照/i;
  return rows.filter(row => row.gene === reference && row.control &&
    !explicitNtc.test(row.controlType || '') && !explicitNtc.test(row.sample || ''));
}
function Q96analysisRows(rows, reference) {
  const allowed = new Set(Q96referenceCandidates(rows, reference)
    .filter(row => row.referenceOverride === reference).map(row => row.id));
  return rows.map(row => allowed.has(row.id) ? { ...row, control: false } : row);
}
function Q96ReferenceConflict({ rows, reference, onChange }) {
  const h = Ue.createElement;
  const candidates = Q96referenceCandidates(rows, reference);
  if (!candidates.length) return null;
  const active = candidates.filter(row => row.referenceOverride === reference).length;
  const types = [...new Set(candidates.map(row => row.controlType || '阴性对照'))].join(' / ');
  return h('div', { className: 'reference-conflict' + (active ? ' resolved' : ''), role: 'status' },
    h('div', null,
      h('strong', null, active ? `已将 ${active} 个 ${reference} 孔按内参样本使用` : '检测类型与内参选择冲突'),
      h('p', null, active
        ? `这些孔在原表中标为“${types}”。当前按你的确认参与归一化，原表未修改。`
        : `${candidates.length} 个 ${reference} 孔在表格中标为“${types}”，因此被排除，可能导致没有可计算结果。只有确认它们是实际内参样本时，才按内参使用。`)),
    h('div', { className: 'reference-conflict-actions' },
      active < candidates.length && h('button', { className: 'button primary', 'data-action': 'use-reference', onClick: () => onChange(candidates, true) }, `将这 ${candidates.length} 孔用作内参`),
      active > 0 && h('button', { className: 'button', 'data-action': 'restore-control', onClick: () => onChange(candidates, false) }, '恢复按阴性对照排除')));
}
