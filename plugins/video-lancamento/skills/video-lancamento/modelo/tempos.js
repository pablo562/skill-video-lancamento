// Linha do tempo única, lida pela página (window.T) e pela trilha (require).
// 120 BPM: uma batida = 0,5 s, um compasso = 2 s. Faça os cortes e os eventos caírem nas batidas.
(function (root) {
  const T = {
    fps: 30,
    dur: 36,
    bpm: 120,
    saida: null, // nome do mp4; null usa o nome da pasta

    // Cena 1: gancho (frases curtas sobre o fundo claro)
    gancho: [[0.35, 1.85], [2.05, 3.35]],
    wipe: [3.45, 3.95],

    // Cena 2: título. A assinatura (logo do kit + nome do produto pequeno embaixo à direita) entra em `marca`.
    produto: 'novidade', // minúsculo e curto (o nome do recurso ou produto). A trilha dá um estalo por letra.
    drop: 4.0,
    marca: 4.2, // o símbolo gira, o nome se revela
    letras: 4.62, // letras do produto, uma a cada 0,065 s
    selo: 5.15,
    tagline: 5.35,
    cobre: [7.2, 7.8],

    // Cena 3: demonstração (a parte que muda em todo vídeo)
    janela: 7.95,
    digitar: { inicio: 8.5, passo: 0.075, texto: 'suamarca.com.br' },
    enter: 9.8,
    conteudo: 10.1,
    cliqueBotao: 13.0,
    confete: 13.1,
    chicote: 27.7, // a demonstração sai de cena (termina junto com o corte da rajada)

    // Cena 4: rajada de recursos (8 batidas)
    rajada: 28.0,

    // Cena 5: fechamento
    fim: 32.0,
    slogan: 32.7,
    logo: 33.6,
    apagar: [35.3, 36.0],
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = T;
  else root.T = T;
})(this);
