// Vitrine do cardápio de trilhas: cada estilo tocando sozinho no andamento natural dele (meio da faixa de BPM), com
// uma cartela com o nome, o clima e o BPM enquanto toca. Serve para escolher estilos de ouvido antes do vídeo.
// Rode na pasta de um projeto (usa o Playwright e as fontes dele):
//   node motor/cardapio.js piano violao kalimba bossa-calma lofi [--segundos 16] [--saida out/cardapio.mp4]
const { chromium } = require(require.resolve('playwright', { paths: [process.cwd()] }));
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const criar = require('./estilos.js');

const RAIZ = process.cwd();
const arg = (n, p) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : p; };
const SEG = +arg('segundos', 16);
const SAIDA = path.resolve(RAIZ, arg('saida', 'out/cardapio.mp4'));
const estilos = process.argv.slice(2).filter((x, k, l) => !x.startsWith('--') && !(l[k - 1] || '').startsWith('--'));
const CAMAS = criar({ bpm: 120, dur: 1, fps: 30 }).CAMAS;
const ROTULO = { bossa: 'Bossa', disco: 'Disco', afro: 'Afro house', synthwave: 'Synthwave', funk: 'Funk', house: 'House', pop: 'Pop', lofi: 'Lo-fi',
  piano: 'Piano', violao: 'Violão', kalimba: 'Kalimba', 'bossa-calma': 'Bossa calma' };
const DIR = path.join(path.dirname(SAIDA), 'cardapio');
fs.mkdirSync(DIR, { recursive: true });
const ff = (a) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...a]);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  const partes = [];
  for (const [n, e] of estilos.entries()) {
    const c = CAMAS[e];
    if (!c) throw new Error(`estilo desconhecido: ${e}`);
    const bpm = Math.round((c.bpm[0] + c.bpm[1]) / 2), comp = (60 / bpm) * 4;
    const T = { fps: 30, bpm, dur: SEG };
    const S = criar(T);
    S.cama(e, { compassos: Math.ceil(SEG / comp) + 1, entrada: comp * 2 });
    const wav = path.join(DIR, `${e}.wav`);
    S.exportar(wav, { fadeOut: 1.5, lufs: -14 });
    const fontes = fs.existsSync(path.join(RAIZ, 'assets/fonts/fonts.css')) ? `<link rel="stylesheet" href="file://${path.join(RAIZ, 'assets/fonts/fonts.css')}">` : '';
    const html = path.join(DIR, `${e}.html`);
    fs.writeFileSync(html, `<html><head><meta charset="utf-8">${fontes}<style>body{margin:0;width:1080px;height:1920px;background:${n % 2 ? '#121212' : '#EFEFEC'};color:${n % 2 ? '#fff' : '#121212'};
      font-family:Archivo,Arial,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
      .n{font-size:40px;font-weight:700;color:#E4262C;letter-spacing:.08em}.t{font-size:170px;font-weight:900;letter-spacing:-.05em;line-height:1;margin:28px 0}
      .c{font-size:44px;font-weight:600;max-width:860px;line-height:1.25;opacity:.75}.b{font:500 38px 'JetBrains Mono',monospace;margin-top:40px;opacity:.6}</style></head>
      <body><div class="n">${String(n + 1).padStart(2, '0')} / ${String(estilos.length).padStart(2, '0')}</div><div class="t">${ROTULO[e] || e}</div><div class="c">${c.clima}</div><div class="b">${bpm} BPM</div></body></html>`,
    );
    await page.goto('file://' + html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const png = path.join(DIR, `${e}.png`);
    await page.screenshot({ path: png });
    const mp4 = path.join(DIR, `${e}.mp4`);
    ff(['-loop', '1', '-framerate', '15', '-t', String(SEG), '-i', png, '-i', wav, '-c:v', 'libx264', '-tune', 'stillimage', '-pix_fmt', 'yuv420p', '-r', '15',
      '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', mp4]);
    partes.push(mp4);
    console.log(`${ROTULO[e] || e}: ${bpm} BPM`);
  }
  await browser.close();
  const lista = path.join(DIR, 'lista.txt');
  fs.writeFileSync(lista, partes.map((p) => `file '${p}'`).join('\n'));
  ff(['-f', 'concat', '-safe', '0', '-i', lista, '-c', 'copy', '-movflags', '+faststart', SAIDA]);
  console.log(`${SAIDA}: ${estilos.map((e, i) => `${Math.floor((i * SEG) / 60)}:${String((i * SEG) % 60).padStart(2, '0')} ${ROTULO[e] || e}`).join(' | ')}`);
})();
