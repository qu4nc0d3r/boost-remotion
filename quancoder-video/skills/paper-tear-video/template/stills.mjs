import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'path';
const frames = process.argv[2].split(',').map(Number);
const outDir = process.argv[3];
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const composition = await selectComposition({serveUrl, id: 'Main'});
for (const f of frames) {
  await renderStill({composition, serveUrl, frame: f, output: `${outDir}/f${String(f).padStart(5,'0')}.jpeg`, imageFormat: 'jpeg', jpegQuality: 70, scale: 0.4});
  console.log('done', f);
}
