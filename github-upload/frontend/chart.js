function wg({ summary, error, scale, title, xLabel, visible, order, chartType = 'line' }) {
  const h = Ue.createElement, [hover, setHover] = Ue.useState(null);
  const allSeries = Oa(summary.map(row => row.gene + ' · ' + row.group));
  const series = allSeries.filter(name => visible.includes(name));
  const data = summary.filter(row => visible.includes(row.gene + ' · ' + row.group));
  const available = qn(Oa(summary.map(row => row.time)));
  const times = [...Oa(order.filter(time => available.includes(time))), ...available.filter(time => !order.includes(time))];
  const bars = chartType !== 'line', lines = chartType !== 'bar';
  const numeric = !bars && !order.length && times.length > 1 && times.every(time => time.trim() && Number.isFinite(Number(time))) && Number(times[0]) !== Number(times.at(-1));
  const width = Math.max(820, times.length * Math.max(64, bars ? series.length * 24 : 52) + 150), height = 440;
  const left = 90, right = 38, top = 70, bottom = 72, plotWidth = width - left - right, plotHeight = height - top - bottom;
  const range = data.flatMap(row => row.mean == null ? [] : [row.mean, row.mean + (row[error] ?? 0), row.mean - (row[error] ?? 0)]).filter(value => Number.isFinite(value) && (scale === 'linear' || value > 0));
  let min = range.length ? Math.min(...range) : 0, max = range.length ? Math.max(...range) : 1;
  if (scale === 'linear') { min = Math.min(0, min); max = max > 0 ? max * 1.14 : 1; if (min < 0) min *= 1.12; }
  else { min = range.length ? 10 ** Math.floor(Math.log10(min)) : 0.001; max = range.length ? 10 ** Math.ceil(Math.log10(max)) : 1; if (max <= min) max = min * 10; }
  const slot = plotWidth / Math.max(1, times.length), barWidth = Math.min(38, slot * 0.78 / Math.max(1, series.length));
  const xCenter = time => bars ? left + slot * (times.indexOf(time) + 0.5) : times.length === 1 ? left + plotWidth / 2 : left + (numeric ? (Number(time) - Number(times[0])) / (Number(times.at(-1)) - Number(times[0])) : times.indexOf(time) / Math.max(1, times.length - 1)) * plotWidth;
  const x = (time, name) => xCenter(time) + (bars ? (series.indexOf(name) - (series.length - 1) / 2) * barWidth : 0);
  const y = value => top + plotHeight - (scale === 'linear' ? (value - min) / (max - min) : (Math.log10(Math.max(value, min)) - Math.log10(min)) / (Math.log10(max) - Math.log10(min))) * plotHeight;
  const baseline = y(scale === 'linear' ? 0 : min);
  const ticks = Array.from({ length: 6 }, (_, index) => scale === 'linear' ? min + (max - min) * index / 5 : 10 ** (Math.log10(min) + (Math.log10(max) - Math.log10(min)) * index / 5));
  const truncated = scale === 'log' && data.some(row => row.mean != null && row[error] != null && row.mean - row[error] <= 0);
  const typeName = { line: '折线图', bar: '柱形图', overlay: '柱形与折线叠加图' }[chartType];
  const point = (row, name, color) => {
    const px = x(row.time, name), py = y(row.mean), amount = row[error];
    return h('g', { key: row.key, tabIndex: 0, role: 'img', onMouseEnter: () => setHover(row), onMouseLeave: () => setHover(null), onFocus: () => setHover(row), onBlur: () => setHover(null), 'aria-label': `${name}，${row.time}，均值 ${St(row.mean)}，n=${row.n}，${error}=${St(amount)}` },
      h('title', null, `${name} | ${row.time} | Mean ${St(row.mean, 6)} ± ${St(amount, 6)} (${error.toUpperCase()}) | n = ${row.n}`),
      bars && h('rect', { className: 'expression-bar', x: px - barWidth * 0.42, y: Math.min(py, baseline), width: barWidth * 0.84, height: Math.abs(baseline - py), fill: color, fillOpacity: lines ? 0.30 : 0.72, stroke: color, strokeWidth: 1 }),
      Number.isFinite(amount) && h('g', { className: 'expression-error', stroke: color, strokeWidth: 1.5 },
        h('line', { x1: px, x2: px, y1: y(row.mean + amount), y2: y(row.mean - amount) }),
        h('line', { x1: px - 5, x2: px + 5, y1: y(row.mean + amount), y2: y(row.mean + amount) }),
        h('line', { x1: px - 5, x2: px + 5, y1: y(row.mean - amount), y2: y(row.mean - amount) })),
      lines && h('circle', { cx: px, cy: py, r: '4.5', stroke: 'white', strokeWidth: 1.5, fill: color }),
      h('circle', { cx: px, cy: py, r: 13, fill: 'transparent' }));
  };
  return h('div', { className: 'chart-frame' },
    h('div', { className: 'chart-scroll' }, h('svg', { id: 'expression-svg', xmlns: 'http://www.w3.org/2000/svg', viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': `${title}，${typeName}，纵轴 2 的负 ΔCt 次方，误差棒 ${error.toUpperCase()}`, 'data-chart-type': chartType, style: { width: '100%', minWidth: Math.min(width, 720), fontFamily: 'Georgia, "Noto Serif SC", SimSun, serif', background: '#fff' } },
      h('title', null, title), h('desc', null, `${typeName}。均值 ± ${error.toUpperCase()}；缺失值留空并断线，n < 2 不绘制误差棒。${bars && scale === 'log' ? '对数柱形的基线为纵轴最小正值。' : ''}`),
      h('rect', { width, height, fill: '#fff' }), h('text', { x: width / 2, y: 28, textAnchor: 'middle', fontSize: 19, fill: '#233449' }, title),
      ticks.map((tick, index) => h('g', { key: index }, h('line', { x1: left, x2: width - right, y1: y(tick), y2: y(tick), stroke: '#e8ecf0', strokeDasharray: '3 5' }), h('text', { x: left - 14, y: y(tick) + 5, textAnchor: 'end', fontSize: 14, fill: '#637083' }, St(tick, 3)))),
      h('line', { x1: left, x2: left, y1: top, y2: height - bottom, stroke: '#405166' }), h('line', { x1: left, x2: width - right, y1: height - bottom, y2: height - bottom, stroke: '#405166' }),
      times.map(time => h('g', { key: time }, h('line', { x1: xCenter(time), x2: xCenter(time), y1: height - bottom, y2: height - bottom + 6, stroke: '#405166' }), h('text', { x: xCenter(time), y: height - bottom + 27, textAnchor: 'middle', fontSize: 14, fill: '#405166' }, time.length > 12 ? time.slice(0, 11) + '…' : time))),
      h('text', { x: left + plotWidth / 2, y: height - 12, textAnchor: 'middle', fontSize: 16, fill: '#34475b' }, xLabel),
      h('text', { x: 23, y: top + plotHeight / 2, transform: `rotate(-90 23 ${top + plotHeight / 2})`, textAnchor: 'middle', fontSize: 17, fill: '#34475b' }, '2', h('tspan', { baselineShift: 'super', fontSize: 12 }, '−ΔCt')),
      series.map(name => {
        const rows = data.filter(row => row.gene + ' · ' + row.group === name), color = Hn[allSeries.indexOf(name) % Hn.length];
        let path = '', connected = false;
        for (const time of times) { const row = rows.find(item => item.time === time); if (row?.mean == null) { connected = false; continue; } path += (connected ? ' L' : ' M') + x(time, name) + ' ' + y(row.mean); connected = true; }
        return h('g', { key: name }, lines && h('path', { className: 'expression-line', d: path, fill: 'none', stroke: color, strokeWidth: 2.25 }), rows.filter(row => row.mean != null).map(row => point(row, name, color)));
      }),
      !data.some(row => row.mean != null) && h('text', { x: left + plotWidth / 2, y: top + plotHeight / 2, textAnchor: 'middle', fontSize: 17, fill: '#778291' }, '暂无可绘制结果，请检查内参与分组设置'))),
    h('div', { className: 'chart-caption', 'aria-live': 'polite' }, hover ? h(Ue.Fragment, null, h('strong', null, `${hover.gene} · ${hover.group} / ${hover.time}`), h('span', null, `Mean ${St(hover.mean, 6)} ± ${St(hover[error], 6)} · n = ${hover.n}`)) : h(Ue.Fragment, null, h('span', null, `${typeName} · 算术均值 ± ${error.toUpperCase()}`), h('span', null, `n < 2 无误差棒${truncated ? ' · 对数轴截断非正误差端点' : ''}${bars && scale === 'log' ? ' · 柱形基线为最小正刻度' : ''}`))));
}
