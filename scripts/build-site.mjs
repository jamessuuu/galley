// Assembles the deployable site/ directory. Vercel's outputDirectory for
// this project is "site" — only that folder's contents ship to production,
// but site/index.html, site/limitations.html, and site/style.css reference
// public/brand/*, public/fonts/jetbrains-mono/*, and examples/* via relative
// paths that reach outside site/. Nobody noticed because there is no local
// dev server that reproduces the outputDirectory boundary — opening the file
// directly, or serving the repo root, both happen to resolve the "../"
// paths. Vercel does not: it uploads exactly the outputDirectory. This
// copies the exact assets the site references into site/vendor/ before
// deploy; the canonical source stays in public/ and examples/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const FILES = [
  ['public/brand/favicon.svg', 'site/vendor/public/brand/favicon.svg'],
  ['public/brand/apple-touch-icon.png', 'site/vendor/public/brand/apple-touch-icon.png'],
  ['public/brand/lockup.svg', 'site/vendor/public/brand/lockup.svg'],
  ['public/fonts/jetbrains-mono/JetBrainsMono-Regular.woff2', 'site/vendor/public/fonts/jetbrains-mono/JetBrainsMono-Regular.woff2'],
  ['public/fonts/jetbrains-mono/JetBrainsMono-Medium.woff2', 'site/vendor/public/fonts/jetbrains-mono/JetBrainsMono-Medium.woff2'],
  ['public/fonts/jetbrains-mono/JetBrainsMono-Bold.woff2', 'site/vendor/public/fonts/jetbrains-mono/JetBrainsMono-Bold.woff2'],
  ['examples/dogwatch-ci-fix.mp4', 'site/vendor/examples/dogwatch-ci-fix.mp4'],
  ['examples/dogwatch-ci-fix.png', 'site/vendor/examples/dogwatch-ci-fix.png'],
  ['examples/tiltmeter-latest.png', 'site/vendor/examples/tiltmeter-latest.png'],
];

for (const [src, dest] of FILES) {
  const srcPath = path.join(ROOT, src);
  const destPath = path.join(ROOT, dest);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.copyFileSync(srcPath, destPath);
  console.log(`build-site: ${src} -> ${dest}`);
}

console.log('build-site: done.');
