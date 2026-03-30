import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

const assetDirs = [
  ['src/views', 'dist/views'],
  ['src/public', 'dist/public'],
  ['src/emails', 'dist/emails'],
];

for (const [from, to] of assetDirs) {
  const sourcePath = path.join(rootDir, from);
  const targetPath = path.join(rootDir, to);

  if (!fs.existsSync(sourcePath)) continue;
  fs.cpSync(sourcePath, targetPath, { recursive: true });
}
