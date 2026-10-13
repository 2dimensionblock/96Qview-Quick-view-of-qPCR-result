import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../', import.meta.url));
const exe = await readFile(path.join(root, 'dist/96Qview_Windows_x64.exe'));
const report = JSON.parse(await readFile(path.join(root, 'dist/verification.json')));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(digest(exe), report.sha256, 'Run npm run verify:dist on the current EXE first.');
assert.equal(report.archiveVerified, true);
const release = path.join(root, 'release');
await mkdir(release, { recursive: true });
const files = [
  ['dist/96Qview_Windows_x64.exe', '96Qview_Windows_x64.exe'],
  ['app/index.html', '96Qview.html'],
  ['examples/synthetic_96_wells.csv', 'synthetic_96_wells.csv'],
  ['docs/RELEASE_NOTES.md', 'RELEASE_NOTES.md'],
  ['docs/96QVIEW_1.1.md', '96QVIEW_1.1.md'],
  ['CHANGELOG.md', 'CHANGELOG.md'],
  ['LICENSE', 'LICENSE.txt'],
  ['THIRD_PARTY_NOTICES.md', 'THIRD_PARTY_NOTICES.md'],
  ['app/THIRD_PARTY_NOTICES.txt', 'THIRD_PARTY_LICENSES.txt'],
  ['dist/verification.json', 'verification.json']
];
for (const [source, target] of files) await copyFile(path.join(root, source), path.join(release, target));
const sums = [];
for (const file of files.map(([, target]) => target).sort()) sums.push(`${digest(await readFile(path.join(release, file)))}  ${file}`);
await writeFile(path.join(release, 'SHA256SUMS.txt'), sums.join('\n') + '\n');
console.log('Release files prepared in release/. Nothing has been uploaded or published.');
