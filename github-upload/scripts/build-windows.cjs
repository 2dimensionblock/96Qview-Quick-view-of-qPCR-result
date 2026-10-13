'use strict';
const { build, Platform, Arch } = require('electron-builder');
const path = require('node:path');
require('node:child_process').execFileSync(process.execPath, [path.join(__dirname, 'build-frontend.mjs')], { stdio: 'inherit' });

// Use a moderate 7z level to avoid excessive compression memory use.
process.env.ELECTRON_BUILDER_COMPRESSION_LEVEL ||= '5';
process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';
// Keep downloaded toolsets on the same volume as their extraction directories.
process.env.ELECTRON_BUILDER_CACHE ||= path.resolve(__dirname, '../work/builder-cache');
let electronDist;
try { electronDist = path.dirname(require('electron')); } catch { /* builder downloads the locked runtime if needed */ }
build({
  projectDir: path.resolve(__dirname, '..'),
  targets: Platform.WINDOWS.createTarget(['portable'], Arch.x64),
  publish: 'never',
  config: {
    ...(electronDist ? { electronDist } : {}),
    afterPack: async context => {
      // A reused unpacked runtime may include Electron's development launcher.
      const launcher = path.resolve(context.appOutDir, 'resources/default_app.asar');
      if (!launcher.startsWith(path.resolve(__dirname, '../dist') + path.sep)) throw new Error('Unexpected packaging output directory.');
      await require('node:fs/promises').rm(launcher, { force: true });
    }
  }
}).catch(error => { console.error(error); process.exitCode = 1; });
