// Renderiza o vídeo quadro a quadro com o Playwright e envia cada quadro direto para o ffmpeg.
// Roda da raiz do projeto do vídeo (a pasta que tem index.html, tempos.js e trilha.js):
//   node motor/render.js                     -> out/<pasta>.mp4 (precisa de out/trilha.wav)
//   node motor/render.js --previa 1.2 13.4   -> out/previa-1.20.png, out/previa-13.40.png
//   node motor/render.js --folha             -> out/folha.png (contato com 24 quadros espalhados)
// Os quadros vão por pipe para o ffmpeg: nada de milhares de PNGs no disco.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const RAIZ = path.resolve(__dirname, '..');
const T = require(path.join(RAIZ, 'tempos.js'));

const OUT = path.join(RAIZ, 'out');
// tamanho do quadro: 1920x1080 por padrão; vídeo vertical declara T.largura = 1080 e T.altura = 1920 no tempos.js
const W = T.largura || 1920, H = T.altura || 1080;
const CLIP = { x: 0, y: 0, width: W, height: H };

async function abrir() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const erros = [];
  page.on('pageerror', (e) => erros.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
  await page.goto('file://' + path.join(RAIZ, 'index.html'));
  await page.evaluate(() => window.prep());
  if (erros.length) { console.error(erros.join('\n')); process.exit(1); }
  return { browser, page };
}

const quadro = (page, t) => page.evaluate((t) => window.renderAt(t), t);

async function previa(tempos) {
  const { browser, page } = await abrir();
  for (const t of tempos) {
    await quadro(page, t);
    const f = path.join(OUT, `previa-${t.toFixed(2)}.png`);
    await page.screenshot({ path: f, clip: CLIP });
    console.log(f);
  }
  await browser.close();
}

async function folha() {
  const { browser, page } = await abrir();
  const passo = T.dur / 24;
  const tempos = Array.from({ length: 24 }, (_, i) => +(passo * 0.6 + i * passo).toFixed(2));
  const dir = path.join(OUT, 'folha'); fs.mkdirSync(dir, { recursive: true });
  for (const [i, t] of tempos.entries()) {
    await quadro(page, t);
    await page.screenshot({ path: path.join(dir, `${String(i).padStart(2, '0')}.jpg`), type: 'jpeg', quality: 80, clip: CLIP });
  }
  await browser.close();
  await new Promise((ok, erro) => spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-framerate', '1', '-i', path.join(dir, '%02d.jpg'),
    '-vf', H > W ? 'scale=240:-1,tile=8x3:padding=6:color=white' : 'scale=480:-1,tile=4x6:padding=6:color=white', '-frames:v', '1', path.join(OUT, 'folha.png')], { stdio: 'inherit' })
    .on('close', (c) => (c === 0 ? ok() : erro(new Error('ffmpeg ' + c)))));
  console.log(path.join(OUT, 'folha.png'), tempos.join(' '));
}

async function video() {
  const wav = path.join(OUT, 'trilha.wav');
  if (!fs.existsSync(wav)) { console.error('Falta out/trilha.wav: rode node trilha.js antes.'); process.exit(1); }
  const { browser, page } = await abrir();
  const n = Math.round(T.dur * T.fps);
  const saida = path.join(OUT, (T.saida || path.basename(RAIZ)) + '.mp4');
  const ff = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(T.fps), '-c:v', 'png', '-i', '-',
    '-i', wav,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', '-tune', 'animation',
    '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', '-shortest', saida], { stdio: ['pipe', 'inherit', 'inherit'] });
  const fim = new Promise((ok) => ff.on('close', ok));
  const t0 = Date.now();
  for (let f = 0; f < n; f++) {
    await quadro(page, f / T.fps);
    const buf = await page.screenshot({ type: 'png', clip: CLIP });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 90 === 0) console.log(`quadro ${f}/${n} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  ff.stdin.end();
  const code = await fim;
  await browser.close();
  if (code !== 0) { console.error('ffmpeg falhou: ' + code); process.exit(1); }
  console.log(`${saida} em ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}

const args = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
if (args[0] === '--previa') previa(args.slice(1).map(Number));
else if (args[0] === '--folha') folha();
else video();
