'use strict';
const { app, Menu, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'qpcr-smoke-'));
app.setPath('userData', path.join(temp, 'profile'));
const downloads = [];
const externalLinks = [];
shell.openExternal = async url => { externalLinks.push(url); };
let completed = false;
const watchdog = setTimeout(() => { console.error('Desktop smoke test timed out.'); app.exit(1); }, 65000);
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn) {
  for (let i = 0; i < 150; i++) { if (fn()) return; await pause(100); }
  throw new Error('Timed out waiting for export.');
}
app.on('browser-window-created', (_event, win) => {
  // Run desktop checks in a hidden window without interrupting the user's desktop.
  win.show = () => {};
  win.webContents.setBackgroundThrottling(false);
  win.webContents.session.on('will-download', (_event, item) => {
    const file = path.join(temp, path.basename(item.getFilename()));
    item.setSavePath(file);
    item.once('done', (_event, state) => downloads.push({ file, state }));
  });
  win.webContents.once('did-finish-load', async () => {
    if (completed) return;
    completed = true;
    try {
      await win.webContents.insertCSS('* { animation-duration: 0s !important; transition-duration: 0s !important; }');
      const result = await win.webContents.executeJavaScript(`(async () => {
        const delay = ms => new Promise(r => setTimeout(r, ms));
        const button = label => [...document.querySelectorAll('button')].find(x => x.textContent.trim() === label);
        for (let n = 0; n < 100 && !button('模拟示例'); n++) await delay(50);
        const initial = [...document.querySelectorAll('.metrics strong')].map(x => x.textContent.trim());
        button('模拟示例').click(); await delay(150);
        const staged = [...document.querySelectorAll('.metrics strong')].map(x => x.textContent.trim());
        button('开始分析').click();
        for (let n = 0; n < 100 && !document.querySelector('#expression-svg'); n++) await delay(50);
        await document.fonts.ready;
        return {initial, staged, points: document.querySelectorAll('#expression-svg circle[r="4.5"]').length};
      })()`);
      assert.deepEqual(result.initial, ['', '', '', '']);
      assert.deepEqual(result.staged, ['', '', '', '']);
      assert.equal(result.points, 8);
      const menu = Menu.getApplicationMenu().items.find(item => item.label === '关于作者');
      assert.ok(menu);
      menu.submenu.items.find(item => item.label === '前往发布页').click();
      assert.deepEqual(externalLinks, ['https://github.com/2dimensionblock/qPCR-studio-Quick-view-of-qPCR-result']);
      await win.webContents.executeJavaScript(`(async () => {
        const select = document.querySelector('[aria-label="图形类型"]');
        select.value = 'overlay'; select.dispatchEvent(new Event('change', {bubbles:true}));
        await new Promise(r => setTimeout(r, 150));
        if (document.querySelectorAll('.expression-bar').length !== 8 || document.querySelectorAll('.expression-error').length !== 8) throw Error('Overlay geometry mismatch');
      })()`);
      fs.mkdirSync(path.join(root, 'test-results'), { recursive: true });
      await win.webContents.capturePage(undefined, { stayHidden: true, stayAwake: true });
      await pause(300);
      fs.writeFileSync(path.join(root, 'test-results/96Qview-overlay.png'), (await win.webContents.capturePage(undefined, { stayHidden: true, stayAwake: true })).toPNG());
      for (const label of ['汇总 CSV', 'SVG', 'PNG']) {
        const before = downloads.length;
        await win.webContents.executeJavaScript(`([...document.querySelectorAll('button')].find(x=>x.textContent.trim()===${JSON.stringify(label)})).click()`);
        await until(() => downloads.length > before);
        const item = downloads.at(-1);
        assert.equal(item.state, 'completed');
        const bytes = fs.readFileSync(item.file);
        assert.ok(bytes.length > 100);
        if (label === 'PNG') assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
        if (label === 'SVG') assert.ok(bytes.toString().includes('data:font/woff2'));
        if (label === '汇总 CSV') assert.ok(bytes.toString().includes('Mean_2^-DeltaCt'));
      }
      const plate = await win.webContents.executeJavaScript(`(async () => {
        const delay = ms => new Promise(r => setTimeout(r, ms));
        [...document.querySelectorAll('button')].find(x => x.textContent.trim() === '孔自定义').click();
        for (let n = 0; n < 50 && !document.querySelector('.plate-dialog'); n++) await delay(50);
        await document.fonts.ready; await delay(150);
        const well = document.querySelector('.plate-well').getBoundingClientRect();
        return {count:document.querySelectorAll('.plate-well').length,width:well.width,height:well.height,rows:document.querySelectorAll('.plate-row-name').length,columns:document.querySelectorAll('.plate-col-name').length};
      })()`);
      assert.equal(plate.count, 96); assert.equal(plate.rows, 8); assert.equal(plate.columns, 12);
      assert.ok(Math.abs(plate.width - plate.height) < 1, JSON.stringify(plate));
      await win.webContents.capturePage(undefined, { stayHidden: true, stayAwake: true });
      await pause(300);
      fs.writeFileSync(path.join(root, 'test-results/96Qview-plate.png'), (await win.webContents.capturePage(undefined, { stayHidden: true, stayAwake: true })).toPNG());
      const report = { startup: true, emptyBeforeAnalysis: true, demo96: true, plotPoints: 8, csv: true, svg: true, png: true, overlay: true, authorMenu: true, square96Wells: true };
      fs.mkdirSync(path.join(root, 'test-results'), { recursive: true });
      fs.writeFileSync(path.join(root, 'test-results/windows-smoke.json'), JSON.stringify(report, null, 2));
      console.log(report);
      clearTimeout(watchdog); app.exit(0);
    } catch (error) { console.error(error); clearTimeout(watchdog); app.exit(1); }
  });
});
require('../app/main.cjs');
