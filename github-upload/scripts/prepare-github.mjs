import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'github-upload');
const rootFiles = ['.editorconfig', '.gitattributes', '.gitignore', '.nvmrc', 'README.md', 'README.en.md', 'CHANGELOG.md', 'GITHUB_UPDATE.md', 'CONTRIBUTING.md', 'SECURITY.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'package.json', 'package-lock.json'];
const folders = ['.github', 'app', 'build', 'docs', 'examples', 'frontend', 'scripts', 'tests'];
const files = [...rootFiles];
async function walk(folder) {
  for (const entry of await fs.readdir(path.join(root, folder), { withFileTypes: true })) {
    const relative = path.join(folder, entry.name);
    assert.ok(!entry.isSymbolicLink(), `Do not package linked paths: ${relative}`);
    if (entry.isDirectory()) await walk(relative);
    else files.push(relative);
  }
}
for (const folder of folders) await walk(folder);
const manifest = [];
for (const relative of files.sort()) {
  const source = path.join(root, relative), info = await fs.lstat(source);
  assert.ok(info.isFile() && !info.isSymbolicLink(), relative);
  assert.ok(info.size < 100 * 1024 * 1024, `Oversized source file: ${relative}`);
  assert.ok(!/\.(exe|zip|7z|xlsx?|pfx|pem|p12)$/i.test(relative), `Not a source asset: ${relative}`);
  if (relative.endsWith('.csv')) assert.ok(relative.startsWith('examples' + path.sep) && path.basename(relative).startsWith('synthetic_'), relative);
  manifest.push({ path: relative.split(path.sep).join('/'), bytes: info.size, sha256: createHash('sha256').update(await fs.readFile(source)).digest('hex') });
}
try {
  assert.equal((await fs.lstat(output)).isSymbolicLink(), false, 'Output must not be a linked directory');
  assert.equal((await fs.readdir(output)).length, 0, 'Move the existing github-upload folder aside before preparing a new source bundle.');
} catch (error) { if (error.code !== 'ENOENT') throw error; }
await fs.mkdir(output, { recursive: true });
for (const item of manifest) {
  const target = path.join(output, item.path);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.copyFile(path.join(root, item.path), target);
  assert.equal(createHash('sha256').update(await fs.readFile(target)).digest('hex'), item.sha256);
}
await fs.mkdir(path.join(root, 'work'), { recursive: true });
const version = JSON.parse(await fs.readFile(path.join(root, 'package.json'))).version;
await fs.writeFile(path.join(root, 'work/github-source-manifest.json'), JSON.stringify({ version, files: manifest }, null, 2) + '\n');
console.log(`Prepared and verified ${manifest.length} source files for 96Qview ${version} in github-upload/.`);
