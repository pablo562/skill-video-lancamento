// Motor de vídeo determinístico. Carregar depois de tempos.js e marca.js, e antes de cena.js.
// O vídeo é uma função pura do tempo: window.renderAt(t) desenha o quadro do instante t.
// Nada de relógio real, requestAnimationFrame ou animação CSS.
//
// API (global M):
//   M.cena({ el, de, ate, render(t) })   mostra o elemento só em [de, ate) e chama render(t)
//   M.montar(fn) / M.medir(fn) / M.depois(fn)   ganchos do prep: criar DOM, medir layout, ajustes finais
//   M.legendas([{ text, in, out, y, size, x?, align?, color?, parent }])   palavras sobem de uma máscara; [palavra] fica vermelha
//   M.cursor({ pontos: [[t, () => [x, y]]], cliques: [t], arrastos: [[a, b]], ate })
//   M.cursorPos(t), M.cursorPronto()
//   M.efeito((ctx, t) => {})   desenho livre no canvas #fx, limpo a cada quadro
//   M.apagar(a, b)   escurece para preto no fim
//   M.assinatura(el, { produto, altura, branca, corProduto })   logo da marca + nome do produto; M.animarAssinatura(a, t, t0)
//   utilitários: $, $$, clamp, lerp, E (easings), P, bump, show, rng, mixc, brl, fisica, confete
(function () {
  const M = {};
  M.$ = (s, r = document) => r.querySelector(s);
  M.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  M.clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  M.lerp = (a, b, k) => a + (b - a) * k;
  M.E = {
    lin: (x) => x,
    outCubic: (x) => 1 - Math.pow(1 - x, 3),
    inCubic: (x) => x * x * x,
    inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    outBack: (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
    outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
    inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
  };
  // progresso de t entre a e b (0..1) com easing
  M.P = (t, a, b, e = M.E.lin) => e(M.clamp((t - a) / (b - a)));
  // meia senoide de duração d começando em a (0 fora): bom para "apertar" botão, pulsos, ondas
  M.bump = (t, a, d) => { const x = (t - a) / d; return x < 0 || x > 1 ? 0 : Math.sin(Math.PI * x); };
  M.show = (el, on) => { el.style.display = on ? 'block' : 'none'; };
  M.rng = function (seed) { return function () { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const hx = (h) => { h = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
  M.mixc = (a, b, k) => { const A = hx(a), B = hx(b); return '#' + A.map((v, i) => Math.round(M.lerp(v, B[i], k)).toString(16).padStart(2, '0')).join(''); };
  M.brl = (v) => 'R$ ' + v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  M.fontes = ['500 64px Archivo', '600 64px Archivo', '700 64px Archivo', '800 64px Archivo', '900 64px Archivo', "500 20px 'JetBrains Mono'"];

  const cenas = [], montadores = [], medidores = [], finais = [], efeitos = [], LEG = [];
  let CUR = null, apagarEm = null;
  M.cena = (c) => cenas.push(c);
  M.montar = (fn) => montadores.push(fn);
  M.medir = (fn) => medidores.push(fn);
  M.depois = (fn) => finais.push(fn);
  M.efeito = (fn) => efeitos.push(fn);
  M.legendas = (lista) => LEG.push(...lista);
  M.apagar = (a, b) => { apagarEm = [a, b]; };

  // ------------------------------------------------------------ legendas
  function montarLegenda(c) {
    const el = document.createElement('div');
    el.className = 'cap';
    el.style.fontSize = c.size + 'px';
    el.style.color = c.color || 'var(--escuro)';
    el.style.top = c.y + 'px';
    if (c.align === 'center') { el.style.left = '0'; el.style.right = '0'; el.style.textAlign = 'center'; } else el.style.left = c.x + 'px';
    const words = c.text.split(' ');
    c.spans = [];
    words.forEach((w, i) => {
      const wrap = document.createElement('span'); wrap.className = 'w';
      const inner = document.createElement('span'); inner.textContent = w.replace(/[\[\]]/g, '');
      if (w.includes('[')) inner.className = 'acc';
      wrap.appendChild(inner); el.appendChild(wrap);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      c.spans.push(inner);
    });
    M.$(c.parent || '#stage').appendChild(el);
    c.el = el;
  }
  function renderLegendas(t) {
    LEG.forEach((c) => {
      if (t < c.in - 0.05 || t > c.out + 0.8) { c.el.style.display = 'none'; return; }
      c.el.style.display = 'block';
      c.spans.forEach((s, i) => {
        const kin = M.P(t, c.in + i * 0.05, c.in + i * 0.05 + 0.5, M.E.outCubic);
        const kout = M.P(t, c.out + i * 0.03, c.out + i * 0.03 + 0.32, M.E.inCubic);
        s.style.transform = `translateY(${(1 - kin) * 112 - kout * 112}%)`;
      });
    });
  }

  // ------------------------------------------------------------ cursor
  M.cursor = ({ pontos, cliques = [], arrastos = [], ate }) => {
    CUR = { K: pontos.map(([t, f]) => ({ t, f, pos: null })), cliques, arrastos, ate, pronto: false };
  };
  M.cursorPronto = () => !!(CUR && CUR.pronto);
  M.cursorPos = function (t) {
    const K = CUR.K;
    if (t <= K[0].t) return K[0].pos;
    for (let i = 0; i < K.length - 1; i++) {
      const a = K[i], b = K[i + 1];
      if (t < b.t) {
        const k = M.E.inOutCubic((t - a.t) / (b.t - a.t));
        const dx = b.pos[0] - a.pos[0], dy = b.pos[1] - a.pos[1], d = Math.hypot(dx, dy) || 1;
        const arco = Math.sin(Math.PI * k) * d * 0.08; // trajetória levemente curva, como mão de gente
        return [M.lerp(a.pos[0], b.pos[0], k) - (dy / d) * arco, M.lerp(a.pos[1], b.pos[1], k) + (dx / d) * arco];
      }
    }
    return K[K.length - 1].pos;
  };
  function renderCursor(t) {
    const cur = M.$('#cursor');
    const rings = M.$$('#rings .ring');
    rings.forEach((r) => { r.style.opacity = 0; });
    const on = CUR && CUR.pronto && t >= CUR.K[0].t && t < CUR.ate;
    cur.style.display = on ? 'block' : 'none';
    if (!on) return;
    const [x, y] = M.cursorPos(t);
    const press = Math.max(0, ...CUR.cliques.map((c) => M.bump(t, c - 0.06, 0.18)));
    const arrasto = CUR.arrastos.some(([a, b]) => t >= a && t < b) ? 0.08 : 0;
    cur.style.transform = `translate(${x - 3}px, ${y - 3}px) scale(${1 - 0.14 * press - arrasto})`;
    CUR.cliques.forEach((c, i) => {
      if (t < c || t > c + 0.45) return;
      const k = M.P(t, c, c + 0.45, M.E.outCubic);
      const [rx, ry] = M.cursorPos(c);
      const r = rings[i];
      r.style.left = rx + 'px'; r.style.top = ry + 'px';
      r.style.opacity = 0.9 * (1 - k);
      r.style.transform = `scale(${M.lerp(0.3, 1.5, k)})`;
    });
  }

  // ------------------------------------------------------------ partículas
  // posição com arrasto k e gravidade g: o = [x0, y0, ângulo, velocidade]
  M.fisica = (o, dt, g, k) => { const e = 1 - Math.exp(-k * dt); return [o[0] + ((Math.cos(o[2]) * o[3]) / k) * e, o[1] + ((Math.sin(o[2]) * o[3] - g / k) * e) / k + (g * dt) / k]; };
  M.CORES_CONFETE = ['#2F5BFF', '#16161A', '#FFB627', '#FF5A5F', '#3DBE8B', '#FF7AA8']; // troque pelas cores do kit
  // gera papéis de confete: angulo central (rad), abertura, velocidade mínima e variação
  M.gerarConfete = (n, seed, { angulo = -Math.PI / 2, abertura = 2.6, v0 = 700, dv = 1100, k0 = 1.4, dk = 1.4, cores = M.CORES_CONFETE, atraso = 0 } = {}) => {
    const R = M.rng(seed);
    return Array.from({ length: n }, () => ({ a: angulo + (R() - 0.5) * abertura, v: v0 + R() * dv, rot: R() * 6, vr: (R() - 0.5) * 16, w: 9 + R() * 11, h: 5 + R() * 7, c: cores[Math.floor(R() * cores.length)], k: k0 + R() * dk, atraso: R() * atraso }));
  };
  M.confete = (ctx, lista, [ox, oy], dt, alpha = 1, g = 1900) => {
    lista.forEach((p) => {
      const d = dt - p.atraso; if (d < 0) return;
      const [x, y] = M.fisica([ox, oy, p.a, p.v], d, g, p.k);
      ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(p.rot + p.vr * d);
      ctx.scale(1, Math.cos((p.rot + d * 9) * 1.3)); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
    });
  };

  // ------------------------------------------------------------ assinatura da marca
  // O kit da marca vem de window.MARCA (marca.js do projeto, carregado antes do motor):
  //   { nome: 'Acme', site: 'acme.com.br', logo: null }
  // Com logo: { src: 'assets/img/logo.png', w: 1000, h: 200, corteMarca: 0.25 }. corteMarca é a fração da largura
  // ocupada pelo símbolo à esquerda (0 se a logo for só o nome): o símbolo gira e entra, o nome se revela da esquerda.
  // Não amplie a imagem acima da altura original. Sem logo, a assinatura é um selo com a inicial + o nome em texto.
  // branca: vira toda branca (fundo escuro ou de destaque).
  M.MARCA = Object.assign({ nome: 'Sua Marca', site: 'suamarca.com.br', logo: null }, window.MARCA || {});
  M.assinatura = (el, { produto = '', altura = 150, branca = false, corProduto = 'var(--destaque)', escalaProduto = 0.46 } = {}) => {
    el.classList.add('assinatura'); if (branca) el.classList.add('branca');
    const L = M.MARCA.logo;
    const prod = `<div class="as-prod" style="font-size:${altura * escalaProduto}px;color:${corProduto}">${[...produto].map((c) => `<span>${c}</span>`).join('')}</div>`;
    if (L && L.src) {
      const w = (altura * L.w) / L.h;
      el.innerHTML = `<div class="as-caixa" style="width:${w}px;height:${altura}px"><img class="as-marca" style="clip-path:inset(0 ${(1 - L.corteMarca) * 100}% 0 0);transform-origin:${(L.corteMarca * 100) / 2}% 50%" src="${L.src}"><img class="as-nome" src="${L.src}">${prod}</div>`;
    } else {
      const nome = M.MARCA.nome;
      el.innerHTML = `<div class="as-caixa as-texto" style="height:${altura}px;font-size:${altura * 0.62}px"><span class="as-marca">${nome[0]}</span><span class="as-nome">${nome}</span>${prod}</div>`;
    }
    return { el, corte: L && L.src ? L.corteMarca : 0, marca: M.$('.as-marca', el), nome: M.$('.as-nome', el), letras: M.$$('.as-prod span', el) };
  };
  // Entrada da assinatura a partir de t0: o símbolo gira e entra, o nome se revela da esquerda, as letras do produto
  // caem uma a cada 0,065 s a partir de t0 + 0,42. ondas: instantes em que as letras pulam (na batida).
  M.animarAssinatura = (a, t, t0, { ondas = [] } = {}) => {
    const km = M.P(t, t0, t0 + 0.45, M.E.outBack);
    a.marca.style.opacity = M.P(t, t0, t0 + 0.08);
    a.marca.style.transform = `rotate(${(1 - km) * -150}deg) scale(${Math.max(0, km)})`;
    const kn = M.P(t, t0 + 0.12, t0 + 0.5, M.E.inOutCubic);
    a.nome.style.clipPath = `inset(-20% ${(1 - kn) * (1 - a.corte) * 100}% -20% ${a.corte * 100}%)`;
    a.letras.forEach((sp, j) => {
      const s = t0 + 0.42 + j * 0.065, k = M.P(t, s, s + 0.45, M.E.outBack);
      const onda = ondas.reduce((acc, b) => acc + M.bump(t, b + j * 0.045, 0.3), 0);
      sp.style.opacity = M.P(t, s, s + 0.08);
      sp.style.transform = `translateY(${(1 - k) * -120 - onda * 18}px) rotate(${(1 - k) * -14}deg)`;
    });
    return t0 + 0.42 + a.letras.length * 0.065; // fim da entrada
  };
  // retângulo que cobre logo e nome do produto (para posicionar selo, adesivo, chaves)
  M.caixaAssinatura = (a) => {
    const r = M.$('.as-caixa', a.el).getBoundingClientRect(), p = M.$('.as-prod', a.el).getBoundingClientRect();
    return { left: Math.min(r.left, p.left), right: Math.max(r.right, p.right), top: r.top, bottom: Math.max(r.bottom, p.bottom), logo: r, prod: p };
  };

  // ------------------------------------------------------------ quadro
  function renderCenas(t) {
    cenas.forEach((c) => {
      const on = t >= c.de && t < c.ate;
      M.show(M.$(c.el), on);
      if (on) c.render(t);
    });
    renderLegendas(t);
  }
  M.renderCenas = renderCenas;

  window.renderAt = function (t) {
    renderCenas(t);
    renderCursor(t);
    const ctx = M.$('#fx').getContext('2d');
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    efeitos.forEach((f) => f(ctx, t));
    if (apagarEm) M.$('#fade').style.opacity = M.P(t, apagarEm[0], apagarEm[1], M.E.inOutSine);
  };

  window.prep = async function () {
    LEG.forEach(montarLegenda);
    montadores.forEach((f) => f());
    if (CUR) CUR.cliques.forEach(() => { const r = document.createElement('div'); r.className = 'ring'; M.$('#rings').appendChild(r); });
    await Promise.all(M.fontes.map((f) => document.fonts.load(f)));
    await document.fonts.ready;
    await Promise.all(M.$$('img').map((i) => i.decode().catch(() => null)));
    medidores.forEach((f) => f());
    // posições do cursor calculadas no próprio instante de cada ponto (o alvo pode se mover antes ou depois)
    if (CUR) { CUR.K.forEach((k) => { renderCenas(k.t); k.pos = k.f(); }); CUR.pronto = true; }
    finais.forEach((f) => f());
    return { dur: T.dur, fps: T.fps };
  };

  window.M = M;
})();
