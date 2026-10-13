import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM, ResourceLoader, VirtualConsole } from 'jsdom';
import { instrumentWorkbook } from './fixtures/instrument-xlsx.mjs';

const html = await readFile(new URL('../app/index.html', import.meta.url), 'utf8');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const parseCsv = text => text.replace(/^\uFEFF/, '').trim().split(/\r?\n/).map(line =>
  (line.match(/"(?:[^"]|"")*"|[^,]+/g) ?? []).map(cell => cell.startsWith('"') ? cell.slice(1, -1).replace(/""/g, '"') : cell));

async function openApp() {
  const requests = [], errors = [], downloads = [], blobs = new Map();
  let sequence = 0;
  class LocalOnly extends ResourceLoader {
    fetch(url) { requests.push(url); return null; }
  }
  const console = new VirtualConsole();
  console.on('jsdomError', error => {
    if (!String(error.message).includes('CSS')) errors.push(error.message);
  });
  const dom = new JSDOM(html, {
    url: 'file:///qPCR_Studio.html', runScripts: 'dangerously', pretendToBeVisual: true,
    resources: new LocalOnly(), virtualConsole: console,
    beforeParse(w) {
      w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;
      w.Blob = Blob; w.File = File; w.structuredClone = structuredClone;
      w.URL.createObjectURL = blob => { const key = `blob:local/${++sequence}`; blobs.set(key, blob); return key; };
      w.URL.revokeObjectURL = () => {};
      w.HTMLAnchorElement.prototype.click = function () { downloads.push({ name: this.download, blob: blobs.get(this.href) }); };
      w.HTMLElement.prototype.scrollIntoView = () => {};
      w.HTMLElement.prototype.hasPointerCapture = () => false;
      w.HTMLElement.prototype.releasePointerCapture = () => {};
      w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
      Object.defineProperty(w.SVGSVGElement.prototype, 'viewBox', { get() {
        const [x, y, width, height] = this.getAttribute('viewBox').split(/\s+/).map(Number);
        return { baseVal: { x, y, width, height } };
      } });
    }
  });
  const w = dom.window, document = w.document;
  async function until(fn, message) {
    for (let n = 0; n < 100; n++) { if (fn()) return; await wait(30); }
    assert.fail(`${message}; errors: ${errors.join('; ')}`);
  }
  const button = label => {
    const value = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === label);
    assert.ok(value, `Missing button: ${label}`); return value;
  };
  const metrics = () => [...document.querySelectorAll('.metrics strong')].map(x => x.textContent.trim());
  const importFile = (data, name) => {
    const input = document.querySelector('input[type=file]');
    Object.defineProperty(input, 'files', { configurable: true, value: [new File([data], name)] });
    input.dispatchEvent(new w.Event('change', { bubbles: true }));
  };
  await until(() => document.querySelector('h1'), 'Initial render');
  const input = async (selector, value) => {
    const element = typeof selector === 'string' ? document.querySelector(selector) : selector;
    assert.ok(element, 'Input exists: ' + selector);
    const proto = element.tagName === 'SELECT' ? w.HTMLSelectElement.prototype : w.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(element, value);
    element.dispatchEvent(new w.Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
    await wait(40);
  };
  return { dom, document, button, metrics, until, importFile, input, requests, errors, downloads };
}

test('Instrument XLSX explains excluded references; explicit override restores all 72 target wells and can be undone', async t => {
  const app = await openApp(); t.after(() => app.dom.window.close());
  app.importFile(instrumentWorkbook(), 'synthetic-instrument.xlsx');
  await app.until(() => app.document.querySelector('.file-card')?.textContent.includes('96 个反应孔'), 'Read instrument XLSX');
  assert.equal(app.document.querySelector('[role=dialog]'), null);
  assert.match(app.document.querySelector('.reference-conflict').textContent, /24 个 GAPDH.*阴性对照/);
  app.button('开始分析').click();
  await app.until(() => app.metrics()[2] === '0', 'References initially excluded');
  app.document.querySelector('[data-action=use-reference]').click();
  await app.until(() => app.metrics()[2] === '72', 'Apply reference interpretation');
  assert.equal(app.document.querySelectorAll('#expression-svg circle[r="4.5"]').length, 24);
  app.button('汇总 CSV').click();
  await app.until(() => app.downloads.length === 1, 'Export corrected summary');
  const [header, ...rows] = parseCsv(await app.downloads[0].blob.text());
  assert.equal(rows.length, 24);
  assert.ok(rows.every(row => Number(row[header.indexOf('n')]) === 3));
  const mean = Number(rows[0][header.indexOf('Mean_2^-DeltaCt')]);
  assert.ok(Math.abs(mean - (2 ** -4 + 2 ** -5 + 2 ** -6) / 3) < 1e-12);
  assert.match(await app.downloads[0].blob.text(), /内参检测类型由用户确认为样本/);
  app.document.querySelector('[data-action=restore-control]').click();
  await app.until(() => app.metrics()[2] === '0', 'Undo override');
  app.document.querySelector('[data-action=use-reference]').click();
  await app.until(() => app.metrics()[2] === '72', 'Reapply override');
  app.importFile(instrumentWorkbook(), 'synthetic-reimport.xlsx');
  await app.until(() => app.document.querySelector('.file-card')?.textContent.includes('synthetic-reimport.xlsx'), 'Reimport');
  assert.equal(app.document.querySelector('[data-action=restore-control]'), null, 'Override must not leak to another import');
  assert.deepEqual(app.errors, []);
});

test('Explicit NTC wells remain excluded when ambiguous negative reference labels are overridden', async t => {
  const app = await openApp(); t.after(() => app.dom.window.close());
  app.importFile('Well,Sample,Gene,Group,Time,BioRep,Type,Cq\nA1,ref,GAPDH,Control,6,1,Negative,20\nA2,ref-ntc,GAPDH,Control,6,1,NTC,35\nA3,GAPDH-NTC,GAPDH,Control,6,1,阴性对照,30\nB1,target,GeneX,Control,6,1,Unknown,24', 'controls.csv');
  await app.until(() => app.document.querySelector('[data-action=use-reference]'), 'Read controls');
  assert.match(app.document.querySelector('[data-action=use-reference]').textContent, /这 1 孔/);
  app.document.querySelector('[data-action=use-reference]').click();
  await app.until(() => app.metrics()[2] === '1', 'Analyze with one reference');
  app.button('汇总 CSV').click();
  await app.until(() => app.downloads.length === 1, 'Export controls summary');
  const [header, row] = parseCsv(await app.downloads[0].blob.text());
  assert.equal(Number(row[header.indexOf('Mean_DeltaCt')]), 4);
  assert.deepEqual(app.errors, []);
});

test('Results stay empty until explicit analysis; synthetic demo and exports work offline', async t => {
  const app = await openApp(); t.after(() => app.dom.window.close());
  assert.equal(app.document.title, '96Qview');
  assert.equal(app.document.querySelector('.author-signature'), null);
  assert.deepEqual(app.metrics(), ['', '', '', '']);
  assert.ok(app.button('开始分析').disabled);
  assert.ok(app.button('汇总 CSV').disabled);
  app.button('模拟示例').click();
  await app.until(() => app.document.querySelector('.file-card')?.textContent.includes('96'), 'Load demo');
  assert.deepEqual(app.metrics(), ['', '', '', '']);
  assert.equal(app.document.querySelector('#expression-svg'), null);
  app.button('开始分析').click();
  await app.until(() => app.document.querySelector('#expression-svg'), 'Analyze demo');
  assert.deepEqual(app.metrics(), ['96 wells', '96 / 96', '24', 'Reference']);
  assert.equal(app.document.querySelectorAll('#expression-svg circle[r="4.5"]').length, 8);
  assert.ok(app.document.querySelectorAll('#expression-svg g[stroke] line').length >= 24);
  app.button('汇总 CSV').click();
  await app.until(() => app.downloads.length === 1, 'Export CSV');
  const csv = await app.downloads[0].blob.text();
  assert.match(csv, /Mean_2\^-DeltaCt/);
  assert.equal(csv.trim().split(/\r?\n/).length, 9);
  const [csvHeader, ...csvRows] = parseCsv(csv);
  const [expectedHeader, ...expectedRows] = parseCsv(await readFile(new URL('../examples/synthetic_96_expected_summary.csv', import.meta.url), 'utf8'));
  for (const expected of expectedRows) {
    const row = csvRows.find(candidate => candidate.slice(0, 3).join('|') === expected.slice(0, 3).join('|'));
    assert.ok(row, `Missing simulated summary ${expected.slice(0, 3).join('/')}`);
    for (const column of ['n', 'Mean_2^-DeltaCt', 'SD', 'SEM']) {
      assert.ok(Math.abs(Number(row[csvHeader.indexOf(column)]) - Number(expected[expectedHeader.indexOf(column)])) < 1e-12, column);
    }
  }
  app.button('SVG').click();
  await app.until(() => app.downloads.length === 2, 'Export SVG');
  const svg = await app.downloads[1].blob.text();
  assert.ok(svg.includes('@font-face') && svg.includes('data:font/woff2'));
  assert.ok(svg.includes('SIMULATED DATA'));
  app.importFile(await readFile(new URL('../examples/synthetic_96_wells.csv', import.meta.url)), 'synthetic_96_wells.csv');
  await app.until(() => app.document.querySelector('.file-card')?.textContent.includes('synthetic_96_wells.csv'), 'Import example');
  assert.deepEqual(app.metrics(), ['', '', '', '']);
  assert.equal(app.document.querySelector('#expression-svg'), null);
  app.button('清空数据').click();
  await app.until(() => !app.document.querySelector('.file-card'), 'Clear');
  assert.deepEqual(app.metrics(), ['', '', '', '']);
  assert.deepEqual(app.requests, []);
  assert.deepEqual(app.errors, []);
});

test('Known Ct values use mean of transformed expression values', async t => {
  const app = await openApp(); t.after(() => app.dom.window.close());
  app.importFile('Gene,Group,Time,Cq\nReference,Control,0,20\nGeneX,Control,0,23\nGeneX,Control,0,24\nGeneX,Control,0,25', 'known-values.csv');
  await app.until(() => app.document.querySelector('.file-card')?.textContent.includes('known-values.csv'), 'Import known data');
  assert.deepEqual(app.metrics(), ['', '', '', '']);
  app.button('开始分析').click();
  await app.until(() => app.document.querySelector('#expression-svg'), 'Analyze known data');
  app.button('汇总 CSV').click();
  await app.until(() => app.downloads.length === 1, 'Export known results');
  const [header, row] = parseCsv(await app.downloads[0].blob.text());
  const mean = Number(row[header.indexOf('Mean_2^-DeltaCt')]);
  assert.ok(Math.abs(mean - (0.125 + 0.0625 + 0.03125) / 3) < 1e-6, JSON.stringify({ header, row, mean }));
  assert.ok(Math.abs(mean - 2 ** -4) > 0.001);
  assert.equal(Number(row[header.indexOf('Mean_DeltaCt')]), 4);
  assert.equal(Number(row[header.indexOf('Mean_DeltaDeltaCt')]), 0);
  assert.deepEqual(app.errors, []);
});

test('Sample-only import infers both layouts without a naming popup and canonicalizes references', async t => {
  const app = await openApp(); t.after(() => app.dom.window.close());
  app.importFile('Well,Sample,Cq\nA1,18s rRNA-1-0,20\nA2,18S RRNA-2-24,20\nB1,GeneX-1-0,24\nB2,GeneX-2-24,25', 'names.csv');
  await app.until(() => app.document.querySelector('.file-card')?.textContent.includes('names.csv'), 'Import names');
  assert.equal(app.document.querySelector('[role=dialog]'), null);
  app.button('开始分析').click();
  await app.until(() => app.document.querySelector('#expression-svg'), 'Analyze names');
  assert.equal(app.metrics()[3], '18S rRNA');
  app.button('汇总 CSV').click();
  await app.until(() => app.downloads.length === 1, 'Export names');
  const [head, ...rows] = parseCsv(await app.downloads[0].blob.text());
  assert.deepEqual(rows.map(row => row.slice(0, 3)), [['GeneX', '默认组', '0'], ['GeneX', '默认组', '24']]);
  assert.deepEqual(rows.map(row => Number(row[head.indexOf('Mean_2^-DeltaCt')])), [0.0625, 0.03125]);
  app.importFile('Sample,Cq\nGAPDH-0,20\nGeneX-0,24\nGAPDH-8,20\nGeneX-8,25', 'small.csv');
  await app.until(() => app.document.querySelector('.file-card')?.textContent.includes('small.csv'), 'Import small times');
  assert.equal(app.document.querySelector('[role=dialog]'), null);
  assert.deepEqual([...app.document.querySelectorAll('.sample-editor input[aria-label$=" time"]')].map(element => element.value), ['0', '0', '8', '8']);
  assert.deepEqual(app.errors, []);
});

test('Naming failure appears only if every gene is unspecified; explicit columns take precedence', async t => {
  const app = await openApp(); t.after(() => app.dom.window.close());
  app.importFile('Sample,Cq\n24-1,20\n24-2,24', 'unknown.csv');
  await app.until(() => app.document.querySelector('.naming-dialog'), 'Failure popup');
  assert.match(app.document.querySelector('.naming-dialog').textContent, /仅包含数字/);
  app.button('知道了').click();
  await app.until(() => !app.document.querySelector('.naming-dialog'), 'Close failure');
  app.importFile('Sample,Cq\nGAPDH-24,20\n24-1,24', 'partial.csv');
  await app.until(() => app.document.querySelector('.file-card')?.textContent.includes('partial.csv'), 'Partial data');
  assert.equal(app.document.querySelector('.naming-dialog'), null);
  app.importFile('Sample,Gene,Group,Time,Cq\nGeneX-1-24,TBP,2,4,20\nGeneX-1-24,Target,2,4,24', 'explicit.csv');
  await app.until(() => app.document.querySelector('.file-card')?.textContent.includes('explicit.csv'), 'Explicit columns');
  const values = [...app.document.querySelectorAll('.sample-editor input')].map(element => element.value);
  assert.deepEqual(values.slice(0, 4), ['TBP', '2', '4', 'GeneX-1-24']);
  assert.deepEqual(app.errors, []);
});

test('96-well editor swaps axes, saves a single-well override and confirms correct analysis without changing Ct', async t => {
  const app = await openApp(); t.after(() => app.dom.window.close());
  app.importFile('Well,Sample,Cq\nA1,1,20\nB1,2,24\nB2,3,25', 'plate.csv');
  await app.until(() => app.document.querySelector('.naming-dialog'), 'Missing names');
  [...app.document.querySelectorAll('.naming-dialog button')].find(button => button.textContent === '孔自定义').click();
  await app.until(() => app.document.querySelector('.plate-dialog'), 'Plate dialog');
  assert.equal(app.document.querySelectorAll('.plate-well').length, 96);
  assert.equal(app.document.querySelectorAll('.plate-row-name').length, 8);
  assert.equal(app.document.querySelectorAll('.plate-col-name').length, 12);
  await app.input('#plate-col-kind', 'gene');
  assert.equal(app.document.querySelector('#plate-row-kind').value, 'group');
  await app.input('#plate-row-kind', 'gene');
  assert.equal(app.document.querySelector('#plate-col-kind').value, 'group');
  await app.input('[aria-label="行 A 命名"]', 'gapdh');
  await app.input('[aria-label="行 B 命名"]', 'GeneX');
  await app.input('[aria-label="列 1 命名"]', '24');
  await app.input('[aria-label="列 2 命名"]', '24');
  await app.input('[aria-label="组别单位"]', 'h');
  app.document.querySelector('[data-well="B2"]').dispatchEvent(new app.dom.window.MouseEvent('dblclick', { bubbles: true }));
  await app.until(() => app.document.querySelector('.well-editor'), 'Edit B2');
  await app.input('[aria-label="单孔基因名称"]', 'GeneY');
  app.button('保存该孔').click();
  await app.until(() => !app.document.querySelector('.well-editor'), 'Save B2');
  assert.match(app.document.querySelector('[data-well="B2"]').textContent, /GeneY/);
  await app.input('[aria-label="行 B 命名"]', 'GeneZ');
  assert.match(app.document.querySelector('[data-well="B2"]').textContent, /GeneY/, 'Per-well overrides have priority');
  app.button('确认命名').click();
  await app.until(() => !app.document.querySelector('.plate-dialog') && app.document.querySelector('#expression-svg'), 'Confirm and analyze');
  assert.deepEqual(app.metrics(), ['3 wells', '3 / 3', '2', 'GAPDH']);
  app.button('汇总 CSV').click();
  await app.until(() => app.downloads.length === 1, 'Custom summary');
  const [head, ...rows] = parseCsv(await app.downloads[0].blob.text());
  assert.deepEqual(rows.map(row => row[2]), ['24 h', '24 h']);
  assert.deepEqual(rows.map(row => Number(row[head.indexOf('Mean_2^-DeltaCt')])) .sort((a, b) => a - b), [0.03125, 0.0625]);
  const detail = [...app.document.querySelectorAll('.sample-editor input[aria-label$=" gene"]')].map(element => element.value);
  assert.deepEqual(detail, ['GAPDH', 'GeneZ', 'GeneY']);
  app.button('孔自定义').click();
  await app.until(() => app.document.querySelector('.plate-dialog'), 'Reopen plate');
  await app.input('[aria-label="行 B 命名"]', 'Cancelled');
  app.button('取消').click();
  await app.until(() => !app.document.querySelector('.plate-dialog'), 'Cancel plate');
  assert.equal(app.document.querySelector('.sample-editor input[aria-label$=" gene"]').value, 'GAPDH');
  assert.deepEqual(app.errors, []);
});

test('Bar and overlay modes preserve error bars and export the selected SVG geometry', async t => {
  const app = await openApp(); t.after(() => app.dom.window.close());
  app.button('模拟示例').click();
  await app.until(() => app.document.querySelector('.file-card'), 'Load demo');
  app.button('开始分析').click();
  await app.until(() => app.document.querySelector('#expression-svg'), 'Analyze demo');
  await app.input('[aria-label="图形类型"]', 'bar');
  assert.equal(app.document.querySelectorAll('.expression-bar').length, 8);
  assert.equal(app.document.querySelectorAll('.expression-line').length, 0);
  assert.equal(app.document.querySelectorAll('.expression-error').length, 8);
  const bars = [...app.document.querySelectorAll('.expression-bar')];
  assert.ok(bars.every(bar => Number(bar.getAttribute('height')) > 0 && Number(bar.getAttribute('x')) >= 90));
  const firstX = bars[0].getAttribute('x');
  assert.notEqual(firstX, bars[4].getAttribute('x'), 'Different series have separate bars');
  await app.input('[aria-label="图形类型"]', 'overlay');
  assert.equal(app.document.querySelectorAll('.expression-line').length, 2);
  assert.equal(app.document.querySelectorAll('.expression-bar').length, 8);
  app.button('SVG').click();
  await app.until(() => app.downloads.length === 1, 'Export overlay');
  const svg = await app.downloads[0].blob.text();
  assert.match(svg, /data-chart-type="overlay"/);
  assert.match(svg, /expression-bar/); assert.match(svg, /expression-line/); assert.match(svg, /expression-error/);
  assert.ok(!/="[^"]*(?:NaN|Infinity)[^"]*"/.test(svg));
  assert.deepEqual(app.errors, []);
});
