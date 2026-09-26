// Importa uma narração gravada fora (ex.: gerada e baixada do site da ElevenLabs) em vez de gerar por API.
//   node importar.js narracao/gravada/tomada.mp3 [--velocidade 1.1]
// --velocidade acelera a fala sem mudar o tom (atempo do ffmpeg); cada frase sai sem o silêncio das pontas.
// Tempo de cada palavra pelo alinhamento forçado da ElevenLabs (POST /v1/forced-alignment, com o texto que a voz leu;
// cache em <arquivo>.alinhamento.json). Corta a gravação nos silêncios entre frases e grava narracao/<id>.wav +
// narracao.js no mesmo formato do narrar.js. A legenda vem de falas.js (campo texto); a voz leu o campo fala.
// Chave só por variável de ambiente: ELEVENLABS_API_KEY.
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const FRASES = require('./falas.js').map((f) => [f.id, f.texto, f.fala]);
const falado = (f) => f[2] || f[1];

const args = process.argv.slice(2);
const iVel = args.indexOf('--velocidade');
const VEL = iVel >= 0 ? parseFloat(args[iVel + 1]) : 1;
const entrada = args.find((a, i) => !a.startsWith('--') && (iVel < 0 || i !== iVel + 1));
if (!entrada) { console.error('Uso: node importar.js <gravação.mp3> [--velocidade 1.1]'); process.exit(1); }
const arq = path.resolve(entrada);
const DIR = path.join(__dirname, 'narracao');
const wavTodo = arq.replace(/\.\w+$/, '.wav');
const cacheAlin = arq.replace(/\.\w+$/, '.alinhamento.json');
const ff = (...a) => execFileSync('ffmpeg', ['-hide_banner', '-nostats', ...a], { stdio: ['ignore', 'pipe', 'pipe'] });

(async () => {
  ff('-y', '-loglevel', 'error', '-i', arq, '-ac', '1', '-ar', '44100', ...(VEL !== 1 ? ['-af', `atempo=${VEL}`] : []), '-c:a', 'pcm_s16le', wavTodo);
  const dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wavTodo]).toString());
  // tempo de cada palavra: alinhamento forçado da ElevenLabs com o texto que a voz leu (mais preciso que transcrever)
  let alin;
  if (fs.existsSync(cacheAlin)) alin = JSON.parse(fs.readFileSync(cacheAlin, 'utf8'));
  else {
    const chave = (process.env.ELEVENLABS_API_KEY || '').trim();
    if (!chave) throw new Error('Falta a variável ELEVENLABS_API_KEY (o alinhamento forçado é da ElevenLabs).');
    const fd = new FormData();
    fd.append('file', new Blob([fs.readFileSync(arq)]), path.basename(arq));
    fd.append('text', FRASES.map(falado).join(' '));
    const r = await fetch('https://api.elevenlabs.io/v1/forced-alignment', { method: 'POST', headers: { 'xi-api-key': chave }, body: fd });
    if (!r.ok) throw new Error('alinhamento ' + r.status + ' ' + (await r.text()).slice(0, 200));
    alin = await r.json();
    fs.writeFileSync(cacheAlin, JSON.stringify(alin, null, 1));
  }
  // o alinhamento foi feito na gravação original: na versão acelerada todo tempo encolhe pelo mesmo fator
  const ws = alin.words.filter((w) => w.text.trim()).map((w) => ({ word: w.text, start: w.start / VEL, end: w.end / VEL }));

  // palavras de cada frase: 1 para 1; se a gravação tiver mais palavras (endereço lido por partes), a última palavra da legenda absorve o resto
  let k = 0;
  const frases = FRASES.map((f) => {
    const [id, texto] = f, tokens = texto.split(' '), n = falado(f).split(' ').length;
    const minhas = ws.slice(k, k + n);
    k += n;
    const pal = tokens.map((p, i) => {
      const ultimo = i === tokens.length - 1;
      const w0 = minhas[i], w1 = ultimo ? minhas[minhas.length - 1] : minhas[i];
      return { p, a: w0.start, b: w1.end, ouvido: ultimo ? minhas.slice(i).map((w) => w.word).join(' ') : w0.word };
    });
    return { id, texto, pal };
  });
  if (k !== ws.length) console.warn(`aviso: ${ws.length - k} palavras da gravação sobraram`);

  // silêncios reais para cortar entre as frases
  // argumentos em lista, sem shell: o nome do arquivo nunca é interpretado (o silencedetect escreve no stderr)
  const saidaSil = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', wavTodo, '-af', 'silencedetect=noise=-38dB:d=0.12', '-f', 'null', '-'], { encoding: 'utf8' }).stderr || '';
  const ini = [...saidaSil.matchAll(/silence_start: ([\d.]+)/g)].map((m) => +m[1]);
  const fim = [...saidaSil.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1]);
  const sil = ini.map((a, i) => [a, fim[i] ?? dur]);
  // silêncio entre cada par de frases: o primeiro que começa depois do início da última palavra
  const pausas = [];
  for (let i = 0; i < frases.length - 1; i++) {
    const fimFrase = frases[i].pal.at(-1).a, iniProx = frases[i + 1].pal[0].a;
    const s = sil.find(([a]) => a > fimFrase + 0.05 && a < iniProx + 0.05);
    if (!s) console.warn(`aviso: sem silêncio entre ${frases[i].id} e ${frases[i + 1].id}; corte no meio`);
    pausas.push(s || [(fimFrase + iniProx) / 2, (fimFrase + iniProx) / 2]);
  }
  // cada frase vai do fim da pausa anterior (menos 0,05 s) ao começo da próxima pausa (mais 0,1 s)
  const trechos = frases.map((f, i) => [
    i === 0 ? Math.max(0, f.pal[0].a - 0.05) : Math.max(pausas[i - 1][0], Math.min(pausas[i - 1][1], f.pal[0].a) - 0.05),
    i === frases.length - 1 ? dur : Math.min(pausas[i][1], pausas[i][0] + 0.1),
  ]);
  const N = {};
  frases.forEach((f, i) => {
    const [a, b] = trechos[i];
    const wav = path.join(DIR, f.id + '.wav');
    ff('-y', '-loglevel', 'error', '-i', wavTodo, '-ss', String(a), '-to', String(b), '-af', 'afade=t=in:d=0.02,areverse,afade=t=in:d=0.04,areverse', wav);
    N[f.id] = { id: f.id, texto: f.texto, dur: +(b - a).toFixed(3), origem: a, palavras: f.pal.map((w) => ({ p: w.p, a: +(w.a - a).toFixed(3), b: +(w.b - a).toFixed(3) })) };
    console.log(`${f.id} ${a.toFixed(2)}-${b.toFixed(2)} | ${f.pal.map((w) => `${w.p}(${w.ouvido})`).join(' ')}`);
  });
  const js = `// Gerado por importar.js a partir de ${path.basename(arq)}, velocidade ${VEL}. Tempos em segundos, relativos ao início de cada frase.\n(function (root) {\n  const N = ${JSON.stringify(N, null, 1)};\n  if (typeof module !== 'undefined' && module.exports) module.exports = N; else root.NARRACAO = N;\n})(this);\n`;
  fs.writeFileSync(path.join(__dirname, 'narracao.js'), js);
})().catch((e) => { console.error(e.message); process.exit(1); });
