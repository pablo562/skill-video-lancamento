// Versões do vídeo com outras trilhas na MESMA imagem (a imagem é copiada, sem novo render), para quem pediu o vídeo escolher
// de ouvido. Rode na pasta do projeto, com o MP4 já renderizado:
//   node motor/alternativas.js bossa disco afro synthwave funk      -> out/<saida>-<estilo>.mp4 e out/vitrine-trilhas.mp4
//   --trecho 4 14   janela de cada estilo na vitrine (padrão: do drop até 10 s depois)
// O trilha.js do projeto precisa aceitar ESTILO e gravar out/trilha-<estilo>.wav (ver modelo/trilha.js). Se existir a
// cópia leve (out/<saida>-leve.mp4), as versões saem dela, para caberem no WhatsApp; a escolhida vira a trilha oficial
// (ESTILO=<estilo> vira o padrão no trilha.js) e o MP4 principal é remontado com -c:v copy.
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const RAIZ = process.cwd();
const T = require(path.join(RAIZ, 'tempos.js'));
const nome = T.saida || path.basename(RAIZ);
const OUT = path.join(RAIZ, 'out');
const leve = path.join(OUT, `${nome}-leve.mp4`), cheio = path.join(OUT, `${nome}.mp4`);
const base = fs.existsSync(leve) ? leve : cheio;
if (!fs.existsSync(base)) { console.error(`Falta ${cheio}: renderize o vídeo antes (node motor/render.js).`); process.exit(1); }
const i = process.argv.indexOf('--trecho');
const [a, b] = i > 0 ? [+process.argv[i + 1], +process.argv[i + 2]] : [T.drop ?? 4, (T.drop ?? 4) + 10];
const estilos = process.argv.slice(2).filter((x, k, l) => !x.startsWith('--') && l[k - 1] !== '--trecho' && l[k - 2] !== '--trecho');
if (!estilos.length) { console.error('uso: node motor/alternativas.js <estilo> [<estilo>...] [--trecho a b]'); process.exit(1); }
const ff = (args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });

const faixas = [['atual', path.join(OUT, 'trilha.wav')]];
for (const e of estilos) {
  execFileSync('node', ['trilha.js'], { cwd: RAIZ, env: { ...process.env, ESTILO: e }, stdio: 'inherit' });
  const wav = path.join(OUT, `trilha-${e}.wav`), mp4 = path.join(OUT, `${nome}-${e}.mp4`);
  ff(['-i', base, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', mp4]);
  faixas.push([e, wav]);
  console.log(mp4);
}
// vitrine: o mesmo trecho da imagem com cada trilha em sequência (atual primeiro)
const n = faixas.length, d = b - a;
const filtros = [`[0:v]trim=start=${a}:end=${b},setpts=PTS-STARTPTS,split=${n}${faixas.map((_, k) => `[v${k}]`).join('')}`];
faixas.forEach((_, k) => filtros.push(`[${k + 1}:a]atrim=start=${a}:end=${b},asetpts=PTS-STARTPTS,afade=t=in:d=0.08,afade=t=out:st=${(d - 0.25).toFixed(2)}:d=0.25[a${k}]`));
filtros.push(`${faixas.map((_, k) => `[v${k}][a${k}]`).join('')}concat=n=${n}:v=1:a=1[v][a]`);
const vitrine = path.join(OUT, 'vitrine-trilhas.mp4');
ff(['-i', base, ...faixas.flatMap(([, w]) => ['-i', w]), '-filter_complex', filtros.join(';'), '-map', '[v]', '-map', '[a]',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', vitrine]);
console.log(`${vitrine}: ${faixas.map(([e], k) => `${String(Math.floor((k * d) / 60)).padStart(1, '0')}:${String(Math.round((k * d) % 60)).padStart(2, '0')} ${e}`).join(' | ')}`);
