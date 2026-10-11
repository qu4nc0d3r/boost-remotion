// node stills.mjs <out.jpg>  → contact sheet: 2 stills per scene (just after entrance, 75 %), red = platform UI zones
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
const data = JSON.parse(fs.readFileSync('./src/aff.json', 'utf8'));
const out = process.argv[2] || 'out/stills.jpg';
fs.mkdirSync('out/st', {recursive: true});
for (const f of fs.readdirSync('out/st')) fs.unlinkSync('out/st/' + f);
const serve = await bundle({entryPoint: './src/index.ts'});
const comp = await selectComposition({serveUrl: serve, id: 'Aff'});
const frames = [];
for (const sc of data.scenes) frames.push(sc.from + 8, sc.from + Math.round(sc.dur * 0.75));
for (const fr of frames) await renderStill({composition: comp, serveUrl: serve, output: `out/st/${String(fr).padStart(5, '0')}.jpg`, frame: fr, imageFormat: 'jpeg'});
execFileSync('python3', ['pipeline/review.py', 'sheet', 'out/st', out], {stdio: 'inherit'});
