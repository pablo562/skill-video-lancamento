// Mixa a narração com a música: coloca cada fala (narracao/<id>.wav) no seu instante, monta out/voz.wav e mistura com
// out/musica.wav usando sidechain (a música abaixa quando a voz fala). Saída: out/trilha.wav, que o render usa.
//   node mixar.js [--musica 0.6]
// No trilha.js, exporte a música com S.exportar('out/musica.wav') e declare em tempos.js onde cada fala entra:
//   T.falas = { f1: 0.4, f2: 3.1, ... }   (segundos; a ordem das chaves é a ordem das falas)
// Com voz gravada no site (mais alta, perto de -17 LUFS), use --musica 0.72.
const path = require('path');
const { execFileSync } = require('child_process');
const T = require('./tempos.js');

const args = process.argv.slice(2);
const iM = args.indexOf('--musica');
const VOL = iM >= 0 ? parseFloat(args[iM + 1]) : 0.6;
const OUT = path.join(__dirname, 'out');
if (!T.falas || !Object.keys(T.falas).length) { console.error('Declare T.falas no tempos.js: { f1: 0.4, f2: 3.1, ... }'); process.exit(1); }

const falas = Object.entries(T.falas);
const entradas = falas.flatMap(([id]) => ['-i', path.join(__dirname, 'narracao', id + '.wav')]);
const atrasos = falas.map(([, t0], i) => `[${i}:a]aresample=48000,adelay=${Math.round(t0 * 1000)}:all=1[v${i}]`).join(';');
const juntar = falas.map((_, i) => `[v${i}]`).join('');
execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...entradas, '-filter_complex',
  `${atrasos};${juntar}amix=inputs=${falas.length}:normalize=0,highpass=f=80,acompressor=threshold=0.15:ratio=2.5:attack=8:release=120:makeup=1.3,apad=whole_dur=${T.dur},atrim=0:${T.dur},pan=stereo|c0=c0|c1=c0[voz]`,
  '-map', '[voz]', '-ar', '48000', path.join(OUT, 'voz.wav')]);
execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', path.join(OUT, 'musica.wav'), '-i', path.join(OUT, 'voz.wav'), '-filter_complex',
  `[0:a]volume=${VOL}[m];[1:a]asplit[v1][v2];[m][v1]sidechaincompress=threshold=0.035:ratio=4:attack=15:release=320:makeup=1[md];[md][v2]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[s]`,
  '-map', '[s]', '-ar', '48000', path.join(OUT, 'trilha.wav')]);
console.log(`out/trilha.wav: ${falas.length} falas, música a ${VOL}`);
