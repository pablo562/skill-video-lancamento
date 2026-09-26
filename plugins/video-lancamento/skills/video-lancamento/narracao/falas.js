// Texto da narração, compartilhado por narrar.js (voz por API) e importar.js (voz gravada fora).
// texto: como aparece na legenda. fala (opcional): como a voz deve ler, com o mesmo número de palavras
// quando possível ("Acme" -> "Ácme", "acme.com.br" -> "acme ponto com ponto bê érre").
// PRONUNCIA troca palavras em todas as falas. Copie este arquivo para a raiz do projeto e edite.
const FALAS = [
  { id: 'f1', texto: 'Frase de abertura curta.' },
  { id: 'f2', texto: 'O que a novidade faz, numa frase.' },
  { id: 'f3', texto: 'Acesse suamarca.com.br.', fala: 'Acesse sua marca ponto com ponto bê érre.' },
];
const PRONUNCIA = [
  // [/\bAcme\b/g, 'Ácme'],
];
FALAS.forEach((f) => { if (!f.fala) f.fala = PRONUNCIA.reduce((s, [re, por]) => s.replace(re, por), f.texto); });
module.exports = FALAS;
