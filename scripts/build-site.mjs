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
  // Four real frames lifted out of the shipped mp4 with ffmpeg (see
  // examples/beats/README.md for the exact timestamps and command). They are
  // the video's own pixels, not re-drawn mockups of it, so the "beats" strip
  // on the home page cannot drift away from what the render actually shows.
  ['examples/beats/beat-1-title.webp', 'site/vendor/examples/beats/beat-1-title.webp'],
  ['examples/beats/beat-2-commits.webp', 'site/vendor/examples/beats/beat-2-commits.webp'],
  ['examples/beats/beat-3-numbers.webp', 'site/vendor/examples/beats/beat-3-numbers.webp'],
  ['examples/beats/beat-4-source.webp', 'site/vendor/examples/beats/beat-4-source.webp'],
  // The site's display and prose faces. Self-hosted beside their OFL licences
  // so the page makes no third-party font request.
  ['public/fonts/space-grotesk/SpaceGrotesk[wght].woff2', 'site/vendor/public/fonts/space-grotesk/SpaceGrotesk[wght].woff2'],
  ['public/fonts/space-grotesk/OFL.txt', 'site/vendor/public/fonts/space-grotesk/OFL.txt'],
  ['public/fonts/manrope/Manrope[wght].woff2', 'site/vendor/public/fonts/manrope/Manrope[wght].woff2'],
  ['public/fonts/manrope/OFL.txt', 'site/vendor/public/fonts/manrope/OFL.txt'],
];

// The shipped lockup is drawn in brand ink (#1A1712) for a paper ground, and
// the site is now a dark surface — on which it is very nearly invisible. The
// reverse variant is DERIVED here rather than hand-drawn and committed, so it
// cannot drift from the real lockup: exactly one substitution, ink -> paper,
// leaving the amber rule untouched. Same rule the brand kit itself uses for
// its reverse variants.
const DERIVED = [
  {
    src: 'public/brand/lockup.svg',
    dest: 'site/vendor/public/brand/lockup-reverse.svg',
    transform: (svg) =>
      svg
        .replaceAll('#1A1712', '#FAF7F2')
        .replace('aria-label="galley', 'aria-label="galley, reverse variant — galley'),
  },
];

for (const { src, dest, transform } of DERIVED) {
  const destPath = path.join(ROOT, dest);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, transform(fs.readFileSync(path.join(ROOT, src), 'utf8')));
  console.log(`build-site: ${src} -> ${dest} (derived)`);
}

for (const [src, dest] of FILES) {
  const srcPath = path.join(ROOT, src);
  const destPath = path.join(ROOT, dest);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.copyFileSync(srcPath, destPath);
  console.log(`build-site: ${src} -> ${dest}`);
}

console.log('build-site: done.');
