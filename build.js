#!/usr/bin/env node
/* Build a deployable copy of the app into dist/.
 *
 * Development stays buildless — open index.html through any static server and
 * edit files directly. This exists for deployment only, where three things
 * matter that do not matter locally:
 *
 *   1. One request instead of seventeen on a cold mobile connection.
 *   2. Content-hashed filenames, so a redeploy cannot serve a stale mix of old
 *      and new files out of the HTTP cache.
 *   3. A service worker whose cache name changes when the content does, so
 *      installed copies actually pick up an update.
 *
 * The script order comes from index.html itself, so the bundle can never drift
 * out of step with the page. No dependencies, no minification: every source
 * file is an IIFE, so concatenation is the whole transform and the output stays
 * readable and debuggable.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = __dirname;
const dist = path.join(root, 'dist');

const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const hash = (text) => crypto.createHash('sha256').update(text).digest('hex').slice(0, 10);

function scriptOrder(html) {
  const order = [];
  const pattern = /<script\s+src="([^"]+)"\s*><\/script>/g;
  let found;
  while ((found = pattern.exec(html)) !== null) order.push(found[1]);
  if (!order.length) throw new Error('No <script src> tags found in index.html');
  return order;
}

function bundle(files) {
  return files.map(function (file) {
    return '/* ' + file + ' */\n' + read(file).trim() + '\n';
  }).join('\n');
}

function serviceWorker(assets, cacheName) {
  const template = read('sw.js');
  const list = assets.map(function (asset) { return "  '" + asset + "'"; }).join(',\n');
  return template
    .replace(/const CACHE = '[^']*';/, "const CACHE = '" + cacheName + "';")
    .replace(/const ASSETS = \[[\s\S]*?\];/, 'const ASSETS = [\n' + list + '\n];');
}

function copy(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function write(file, contents) {
  const target = path.join(dist, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
  return Buffer.byteLength(contents);
}

function build() {
  const html = read('index.html');
  const sources = scriptOrder(html);
  const js = bundle(sources);
  const css = read('assets/styles.css');

  // One hash over everything the page loads: any change to any source file
  // renames the bundle and invalidates the service worker cache together.
  const stamp = hash(js + css);
  const jsName = 'app.' + stamp + '.js';
  const cssName = 'styles.' + stamp + '.css';

  fs.rmSync(dist, { recursive: true, force: true });
  fs.mkdirSync(dist, { recursive: true });

  const page = html
    .replace(/\s*<script src="[^"]+"><\/script>/g, '')
    .replace('</body>', '  <script src="' + jsName + '"></script>\n</body>')
    .replace('assets/styles.css', 'assets/' + cssName);

  if (page.indexOf(jsName) < 0 || page.indexOf(cssName) < 0) {
    throw new Error('Failed to rewrite index.html asset references');
  }

  const jsBytes = write(jsName, js);
  const cssBytes = write(path.join('assets', cssName), css);
  write('index.html', page);

  ['assets/icon.svg', 'manifest.webmanifest',
   'data/sample-inventory.json', 'data/my-tools.json'].forEach(function (file) {
    copy(path.join(root, file), path.join(dist, file));
  });

  // Photos shipped with the inventory bundle. They are fetched on import, not
  // on page load, so they are copied but deliberately left out of the precache.
  const photoDir = path.join(root, 'data', 'photos');
  let photoCount = 0;
  if (fs.existsSync(photoDir)) {
    fs.readdirSync(photoDir).forEach(function (name) {
      copy(path.join(photoDir, name), path.join(dist, 'data', 'photos', name));
      photoCount += 1;
    });
  }

  write('sw.js', serviceWorker([
    './', './index.html', './manifest.webmanifest',
    './' + jsName, './assets/' + cssName, './assets/icon.svg',
    './data/sample-inventory.json', './data/my-tools.json'
  ], 'nesa-' + stamp));

  // Pages would otherwise run the output through Jekyll, which drops files and
  // directories beginning with an underscore.
  write('.nojekyll', '');

  const kb = (bytes) => (bytes / 1024).toFixed(1) + ' KB';
  console.log('Built dist/ (' + stamp + ')');
  console.log('  ' + jsName + '  ' + kb(jsBytes) + '  from ' + sources.length + ' source files');
  console.log('  assets/' + cssName + '  ' + kb(cssBytes));
  console.log('  sw.js cache: nesa-' + stamp);
  console.log('  data/photos: ' + photoCount + ' images');
}

build();
