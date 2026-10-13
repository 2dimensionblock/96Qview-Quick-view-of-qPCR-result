'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { createRequire } = require('node:module');
const builderRequire = createRequire(require.resolve('electron-builder'));
const libraryRequire = createRequire(builderRequire.resolve('app-builder-lib'));
const asar = libraryRequire('@electron/asar');
const { getPath7za } = builderRequire('app-builder-lib/out/toolsets/7zip');
process.env.ELECTRON_BUILDER_CACHE ||= path.resolve(__dirname, '../work/builder-cache');

// Inspect the actual portable EXE, not just the build staging directory.
(async () => {
  const root = path.resolve(__dirname, '..');
  const portable = path.join(root, 'dist/96Qview_Windows_x64.exe');
  assert.ok(fs.statSync(portable).size > 50 * 1024 * 1024, 'Portable executable is unexpectedly small.');
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'qpcr-verify-'));
  try {
    const sevenZip = await getPath7za();
    const run = args => execFileSync(sevenZip, args, { stdio: 'pipe', timeout: 180000, windowsHide: true });
    run(['t', '-bd', portable]);
    run(['x', '-y', '-bd', `-o${work}`, portable]);
    // Full 7-Zip may expose the NSIS container; standalone 7za opens its embedded 7z payload directly.
    let unpacked = work;
    if (!fs.existsSync(path.join(work, 'resources/app.asar'))) {
      const payload = path.join(work, '$PLUGINSDIR', 'app-64.7z');
      assert.ok(fs.statSync(payload).size > 50 * 1024 * 1024, 'Embedded runtime archive is missing or incomplete.');
      run(['t', '-bd', payload]);
      unpacked = path.join(work, 'payload');
      run(['x', '-y', '-bd', `-o${unpacked}`, payload]);
    }
    const packaged = path.join(unpacked, 'resources', 'app.asar');
    assert.ok(!fs.existsSync(path.join(unpacked, 'resources/default_app.asar')), 'Development launcher must not ship.');
    for (const file of ['app/index.html', 'app/main.cjs', 'app/icon.png', 'app/THIRD_PARTY_NOTICES.txt']) {
      assert.deepEqual(asar.extractFile(packaged, file), fs.readFileSync(path.join(root, file)), `Packaged file differs: ${file}`);
    }
    const runtime = fs.readFileSync(path.join(unpacked, '96Qview.exe'));
    const packagedMetadata = JSON.parse(asar.extractFile(packaged, 'package.json'));
    const sourceMetadata = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));
    assert.equal(packagedMetadata.name, sourceMetadata.name);
    assert.equal(packagedMetadata.version, sourceMetadata.version);
    const pe = runtime.readUInt32LE(0x3c);
    assert.equal(runtime.subarray(pe, pe + 4).toString('hex'), '50450000');
    assert.equal(runtime.readUInt16LE(pe + 4), 0x8664, 'Expected Windows x64 runtime.');
    const digest = crypto.createHash('sha256').update(fs.readFileSync(portable)).digest('hex');
    const report = { archiveVerified: true, frontendMatches: true, architecture: 'x64', bytes: fs.statSync(portable).size, sha256: digest };
    fs.writeFileSync(path.join(root, 'dist/verification.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(report);
  } finally {
    const resolved = fs.realpathSync(work), intended = fs.realpathSync(os.tmpdir());
    assert.ok(resolved.startsWith(intended + path.sep) && path.basename(resolved).startsWith('qpcr-verify-'), 'Refuse cleanup outside verification temp directory.');
    fs.rmSync(work, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
