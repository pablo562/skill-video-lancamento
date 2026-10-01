// Trilha do vídeo: cama do cardápio (motor/estilos.js) + efeitos no tempo exato de cada evento de tempos.js.
// Escolha o estilo pelo rodízio de referencias/trilhas-usadas.md (diferente dos três últimos vídeos) e ponha em PADRAO.
//   node trilha.js                -> out/trilha.wav no estilo PADRAO
//   ESTILO=disco node trilha.js   -> out/trilha-disco.wav, alternativa na mesma grade (motor/alternativas.js monta os MP4)
const path = require('path');
const T = require('./tempos.js');
const S = require('./motor/estilos.js')(T);
const PADRAO = 'pop'; // bossa | disco | afro | synthwave | funk | house | pop | lofi
const ESTILO = process.env.ESTILO || PADRAO;
const respiro = (t) => t >= T.cliqueBotao - 0.1 && t < T.cliqueBotao + 1.0; // respiro no momento principal
let N = (m) => m; // altura dos efeitos (chime, pluck): sempre por N(), que leva o Dó para o tom do estilo

// Progressão por compasso (2 s a 120 BPM). Intro F G, loop C Am F G, tensão F G antes do fim, resolve em C.
const nComp = Math.round(T.fim / 2);
if (ESTILO === 'pop') { // cama original do modelo
function acorde(b) {
  if (b < 2) return ['F', 'G'][b];
  if (b >= nComp) return 'C';
  if (b >= nComp - 2) return ['F', 'G'][b - (nComp - 2)];
  return ['C', 'Am', 'F', 'G'][(b - 2) % 4];
}
S.groove({
  acorde,
  compassos: nComp,
  introCompassos: 2,
  entrada: T.drop,
  hatsDe: T.janela + 0.05,
  rajadaDe: T.rajada,
  pausa: respiro,
  arpejo: (t) => t >= 8 && t < T.rajada && !(t >= T.cliqueBotao - 0.1 && t < T.cliqueBotao + 1.0),
});
S.pad(T.fim, S.ACORDES.C.pad.concat([72]), 2.6, 1.1, 0.02, 1.3);
S.bass(T.fim, 36, 2.4, 1);
} else {
  N = S.cama(ESTILO, { compassos: Math.ceil(T.dur / 2), entrada: T.drop, pausa: (t) => respiro(t) || t >= T.dur - 0.9, fim: T.fim, final: T.fim }).nota;
}

// ------------------------------------------------------------ efeitos sincronizados
T.gancho.forEach(([a]) => S.whoosh(a - 0.05, 0.4, 0.5, -0.5, 0.5));
S.riser(2.9, T.drop, 1);
S.batida(T.drop, 1.1); S.crash(T.drop, 1); S.queda(T.drop);
S.pop(T.marca, 200, 700, 0.9); S.whoosh(T.marca + 0.1, 0.4, 0.6, -0.6, 0.6);
const nLetras = T.produto.length;
Array.from({ length: nLetras }, (_, i) => T.letras + i * 0.065).forEach((a, i) => S.pop(a, 380 + i * 60, 820 + i * 80, 0.6, -0.6 + i * 0.13));
S.pop(T.selo, 700, 1500, 0.9); S.chime(T.selo + 0.02, N(84), 0.8);
S.whoosh(T.cobre[0] - 0.05, 0.6, 1, 0.8, -0.8);
S.pop(T.janela, 260, 620, 0.7);
for (let i = 0; i < T.digitar.texto.length; i++) S.click(T.digitar.inicio + i * T.digitar.passo, 0.55 + S.rnd() * 0.25, 0.2, 1900 + S.rnd() * 900);
S.click(T.enter, 1.1, 0.2, 1500);
S.whoosh(T.conteudo, 0.45, 0.55, -0.8, 0.8);
S.click(T.cliqueBotao, 1.1, 0.4);
[72, 76, 79, 84].forEach((m, i) => S.chime(T.confete + i * 0.06, N(m), 1, -0.3 + i * 0.2));
S.brilho(T.confete + 0.05, 18, 0.8, 1);
S.pop(T.confete, 1200, 300, 0.7);
S.whoosh(T.chicote, 0.55, 1.4, 0.9, -0.9);
for (let i = 0; i < 8; i++) S.batida(T.rajada + i * 0.5, 0.75);
S.batida(T.fim, 1.3); S.crash(T.fim, 1.2, 3.5);
S.whoosh(T.logo - 0.1, 0.5, 0.4, -0.4, 0.4);

const arq = path.join(__dirname, 'out', ESTILO === PADRAO ? 'trilha.wav' : `trilha-${ESTILO}.wav`);
const r = S.exportar(arq, { lufs: -13.7 });
console.log(`${path.basename(arq)}: ${T.dur}s, estilo ${ESTILO}, pico ${r.pico.toFixed(2)}, ${r.bumbos} bumbos`);
