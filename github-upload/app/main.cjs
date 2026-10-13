'use strict';

const { app, BrowserWindow, Menu, dialog, session, shell, screen } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

app.setName('96Qview');
app.setAppUserModelId('com.2dimensionblock.96qview');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('disable-background-networking');

const entry = path.join(__dirname, 'index.html');
const entryURL = pathToFileURL(entry).href;
const referenceURL = 'https://assets.thermofisher.com/TFS-Assets/LSG/manuals/cms_042380.pdf';
const authorURL = 'https://github.com/2dimensionblock';
const releaseURL = 'https://github.com/2dimensionblock/qPCR-studio-Quick-view-of-qPCR-result';
let mainWindow;

function openReference(url) {
  if ([referenceURL, authorURL, releaseURL].includes(url)) {
    void shell.openExternal(url).catch(() => {
      dialog.showErrorBox('无法打开链接', '请检查默认浏览器及网络连接。数据分析功能可继续离线使用。');
    });
  }
}

function createWindow() {
  const workArea = screen.getPrimaryDisplay().workAreaSize;
  mainWindow = new BrowserWindow({
    width: Math.min(1440, workArea.width),
    height: Math.min(940, workArea.height),
    minWidth: Math.min(960, workArea.width),
    minHeight: Math.min(650, workArea.height),
    title: '96Qview',
    backgroundColor: '#f5f6f8',
    icon: path.join(__dirname, 'icon.png'),
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
      devTools: false,
      navigateOnDragDrop: false
    }
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openReference(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== entryURL) {
      event.preventDefault();
      openReference(url);
    }
  });
  mainWindow.webContents.on('will-attach-webview', event => event.preventDefault());
  mainWindow.webContents.on('page-title-updated', event => event.preventDefault());
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    if (details.reason !== 'clean-exit') {
      dialog.showErrorBox('程序页面已停止', '请关闭并重新打开 96Qview，然后重新导入数据。');
    }
  });
  void mainWindow.loadFile(entry).catch(error => {
    dialog.showErrorBox('无法打开 96Qview', error.message);
    app.quit();
  });
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    const localSession = session.defaultSession;
    localSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    localSession.setPermissionCheckHandler(() => false);
    localSession.webRequest.onBeforeRequest(
      { urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*', 'ftp://*/*'] },
      (_details, callback) => callback({ cancel: true })
    );
    localSession.on('will-download', (event, item) => {
      if (!/^(blob:|data:)/.test(item.getURL())) {
        event.preventDefault();
        return;
      }
      const name = path.basename(item.getFilename());
      const ext = path.extname(name).slice(1).toLowerCase();
      if (!['csv', 'svg', 'png'].includes(ext)) {
        event.preventDefault();
        return;
      }
      item.setSaveDialogOptions({
        title: '保存导出文件',
        defaultPath: path.join(app.getPath('documents'), name),
        filters: [{ name: ext.toUpperCase() + ' 文件', extensions: [ext] }],
        properties: ['showOverwriteConfirmation', 'createDirectory']
      });
      item.once('done', (_downloadEvent, state) => {
        if (state === 'interrupted') {
          dialog.showErrorBox('导出未完成', '文件未能写入，请重新导出并选择可写入的文件夹。');
        }
      });
    });

    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: '文件', submenu: [{ label: '退出', role: 'quit' }] },
      { label: '编辑', submenu: [
        { label: '撤销', role: 'undo' }, { label: '重做', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', role: 'cut' }, { label: '复制', role: 'copy' },
        { label: '粘贴', role: 'paste' }, { label: '全选', role: 'selectAll' }
      ] },
      { label: '视图', submenu: [
        { label: '放大', role: 'zoomIn' }, { label: '缩小', role: 'zoomOut' },
        { label: '实际大小', role: 'resetZoom' },
        { type: 'separator' }, { label: '全屏', role: 'togglefullscreen' }
      ] },
      { label: '帮助', submenu: [
        { label: '使用说明', click: () => { void dialog.showMessageBox(mainWindow, {
          type: 'info', title: '使用说明', message: '96Qview',
          detail: '1. 导入 XLSX、CSV 或 TSV，支持“基因-时间”和“基因-组别-时间”命名。\n2. 确认内参及分组，或打开“孔自定义”批量命名 96 孔；双击可编辑单孔。\n3. 点击“开始分析”，或在孔自定义中点击“确认命名”完成分析。\n4. 选择折线图、柱形图或叠加图，导出 CSV、SVG、PNG。\n\n全部分析在本机完成。',
          buttons: ['确定']
        }); } },
        { label: '关于 96Qview', click: () => { void dialog.showMessageBox(mainWindow, {
          type: 'info', title: '关于 96Qview', message: '96Qview ' + app.getVersion(),
          detail: 'qPCR 数据分析与即时绘图\nWindows 64 位桌面程序\n\nGitHub: 2dimensionblock', buttons: ['确定']
        }); } }
      ] },
      { label: '关于作者', submenu: [
        { label: 'GitHub · 2dimensionblock', click: () => openReference(authorURL) },
        { label: '前往发布页', click: () => openReference(releaseURL) }
      ] }
    ]));
    createWindow();
  }).catch(error => {
    dialog.showErrorBox('启动失败', error.message);
    app.quit();
  });
  app.on('window-all-closed', () => app.quit());
}
