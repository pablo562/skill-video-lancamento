// Cenas do vídeo, sobre o motor (motor/motor.js). Comece pelo kit (marca.css e marca.js) e pelo ROTEIRO; depois
// reescreva a cena 3, que é a demonstração do produto. Técnicas prontas para copiar em referencias/tecnicas.md.
(function () {
  const { $, $$, lerp, E, P, bump, show } = M;

  // ------------------------------------------------------------------ roteiro (troque tudo aqui)
  // [palavra] fica na cor de destaque do kit.
  const R = {
    gancho: ['Frase de abertura curta.', 'E uma virada com [destaque].'],
    apresentando: 'Apresentando',
    selo: 'Nova',
    tagline: 'O que a novidade faz, numa frase.',
    url: T.digitar.texto,
    pagina: { titulo: 'Sua novidade aqui', sub: 'Troque esta página pela demonstração real.', botao: 'Ativar', toast: 'Pronto, está no ar' },
    demoLegendas: [
      { text: 'Primeira ideia da [demonstração].', in: 8.25, out: 12.35 },
      { text: 'Um clique e [pronto].', in: 12.45, out: 99 },
    ],
    rajadaTag: 'E tem mais',
    rajada: [
      ['i-globe', 'Recurso um'], ['i-card', 'Recurso dois'], ['i-cupom', 'Recurso três'], ['i-grid', 'Recurso quatro'],
      ['i-layers', 'Recurso cinco'], ['i-star', 'Recurso seis'], ['i-chart', 'Recurso sete'], ['i-box', 'Recurso oito'],
    ],
    slogan: 'Frase final que fica na cabeça.',
    site: M.MARCA.site,
  };
  // cores da rajada alternando destaque, escuro e claro (tokens do kit em marca.css)
  const tok = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  let RAJ_COR = [];
  M.montar(() => {
    RAJ_COR = [
      { bg: tok('--destaque'), fg: '#FFFFFF', ic: tok('--escuro') },
      { bg: tok('--escuro'), fg: '#FFFFFF', ic: tok('--destaque') },
      { bg: tok('--claro'), fg: tok('--escuro'), ic: tok('--destaque') },
    ];
  });

  M.legendas([
    { text: R.gancho[0], in: T.gancho[0][0], out: T.gancho[0][1], y: 470, size: 88, align: 'center', parent: '#s1' },
    { text: R.gancho[1], in: T.gancho[1][0], out: T.gancho[1][1], y: 470, size: 88, align: 'center', parent: '#s1' },
    { text: R.tagline, in: T.tagline, out: 7.0, y: 730, size: 58, align: 'center', color: '#FFFFFF', parent: '#s2grupo' },
    ...R.demoLegendas.map((l) => Object.assign({ x: 220, y: 86, size: 62, parent: '#demo' }, l)),
    { text: R.slogan, in: T.slogan, out: 99, y: 560, size: 60, align: 'center', parent: '#s7' },
  ]);

  // ------------------------------------------------------------------ montagem
  let LT = null, LF = null, rajEls = [], dots = [];
  M.montar(() => {
    $('#apresentando').textContent = R.apresentando;
    $('#selo').textContent = R.selo;
    // assinatura: logo do kit + nome do produto; branca sobre o destaque, colorida no fundo claro
    LT = M.assinatura($('#lockTitulo'), { produto: T.produto, altura: 170, branca: true, corProduto: 'var(--escuro)' });
    LT.el.style.top = '380px';
    LF = M.assinatura($('#endLock'), { produto: T.produto, altura: 160, corProduto: 'var(--destaque)' });
    LF.el.style.top = '250px';
    $('#endUrl').textContent = R.site;
    $('#pgTitulo').textContent = R.pagina.titulo;
    $('#pgSub').textContent = R.pagina.sub;
    $('#pgBotao').textContent = R.pagina.botao;
    $('#toastTxt').textContent = R.pagina.toast;
    $('#blzTag').textContent = R.rajadaTag;
    R.rajada.forEach(([ic, txt]) => {
      const d = document.createElement('div'); d.className = 'blz';
      d.innerHTML = `<div class="in"><svg class="ic" viewBox="0 0 24 24"><use href="#${ic}"/></svg><div class="tx">${txt}</div></div>`;
      $('#blzHolder').appendChild(d); rajEls.push(d);
      const dot = document.createElement('i'); $('#blzDots').appendChild(dot); dots.push(dot);
    });
  });
  M.medir(() => {
    // selo no canto de cima da logo
    show($('#s2'), true);
    const cx = M.caixaAssinatura(LT);
    $('#selo').style.left = cx.logo.right - 70 + 'px';
    $('#selo').style.top = cx.logo.top - 34 + 'px';
    show($('#s2'), false);
  });

  // ------------------------------------------------------------------ cena 1: gancho
  M.cena({ el: '#s1', de: 0, ate: T.wipe[1], render() {} });

  // ------------------------------------------------------------------ cena 2: título
  M.cena({ el: '#s2', de: T.wipe[0], ate: T.cobre[1] + 0.05, render(t) {
    $('#redwipe').style.clipPath = `circle(${lerp(0, 2300, P(t, T.wipe[0], T.wipe[1], E.inCubic))}px at 960px 540px)`;
    const ka = P(t, T.drop + 0.02, T.drop + 0.4, E.outCubic);
    $('#apresentando').style.opacity = ka;
    $('#apresentando').style.transform = `translateY(${(1 - ka) * 24}px)`;
    M.animarAssinatura(LT, t, T.marca, { ondas: [6.0, 7.0] });
    const ks = P(t, T.selo, T.selo + 0.42, E.outBack);
    $('#selo').style.transform = `scale(${ks}) rotate(${-10 + (1 - ks) * -30}deg)`;
    $('#selo').style.opacity = P(t, T.selo, T.selo + 0.05);
    $('#s2grupo').style.transform = `scale(${lerp(1, 0.93, P(t, 6.9, 7.6, E.inCubic))})`;
    $('#s2grupo').style.opacity = 1 - P(t, 7.3, 7.7);
    $('#cobre').style.transform = `translateY(${(1 - P(t, T.cobre[0], T.cobre[1], E.inOutCubic)) * 1080}px)`;
  } });

  // ------------------------------------------------------------------ cena 3: demonstração (reescreva)
  M.cena({ el: '#demo', de: T.cobre[1], ate: T.rajada, render(t) {
    $('#demo').style.transform = `translateX(${-2050 * P(t, T.chicote, T.chicote + 0.35, E.inCubic)}px)`;
    const kw = P(t, T.janela, T.janela + 0.55, E.outCubic);
    $('#win').style.opacity = P(t, T.janela, T.janela + 0.18);
    $('#win').style.transform = `translateY(${(1 - kw) * 70}px) scale(${lerp(0.93, 1, kw)})`;
    // endereço digitado na barra e grande no meio da página
    const d = T.digitar;
    const n = t < d.inicio ? 0 : Math.min(d.texto.length, Math.floor((t - d.inicio) / d.passo) + 1);
    const tipado = d.texto.slice(0, n), digitando = n > 0 && n < d.texto.length;
    $('#urltxt').textContent = tipado;
    $('#caret').style.opacity = t < T.enter + 0.05 && (digitando || Math.floor(t * 2.6) % 2 === 0) ? 1 : 0;
    const ponto = tipado.indexOf('.');
    $('#bigtxt').innerHTML = ponto < 0 ? tipado : tipado.slice(0, ponto) + '<span class="dom">' + tipado.slice(ponto) + '</span>';
    $('#bigcaret').style.opacity = digitando || Math.floor(t * 2.6) % 2 === 0 ? 1 : 0;
    const kb = P(t, T.enter + 0.05, T.enter + 0.3, E.inCubic);
    $('#bigurl').style.opacity = 1 - kb;
    show($('#bigurl'), t < T.enter + 0.35);
    $('#urlbar').style.width = P(t, T.enter, T.enter + 0.32, E.outCubic) * 100 + '%';
    $('#urlbar').style.opacity = 1 - P(t, T.enter + 0.32, T.enter + 0.5);
    // a página entra
    const kp = P(t, T.conteudo, T.conteudo + 0.5, E.outCubic);
    $('#pagina').style.opacity = kp;
    $('#pagina').style.transform = `translateY(${(1 - kp) * 30}px)`;
    $('#pgBotao').style.transform = `scale(${1 - 0.08 * bump(t, T.cliqueBotao - 0.06, 0.2)})`;
    const kt = P(t, T.confete, T.confete + 0.45, E.outBack);
    $('#toast').style.opacity = P(t, T.confete, T.confete + 0.12);
    $('#toast').style.transform = `translateX(-50%) translateY(${(1 - kt) * -70}px)`;
  } });
  const centro = (el, dx = 0, dy = 0) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2 + dx, r.top + r.height / 2 + dy]; };
  M.cursor({
    pontos: [
      [11.6, () => [1760, 1130]],
      [12.8, () => centro($('#pgBotao'), -20, 8)],
      [13.2, () => centro($('#pgBotao'), -20, 8)],
      [14.4, () => centro($('#pgBotao'), 160, 150)],
    ],
    cliques: [T.cliqueBotao],
    ate: T.chicote,
  });
  const CONFETE = M.gerarConfete(170, 11);
  const CANHAO_E = M.gerarConfete(110, 12, { angulo: -1.05, abertura: 0.55, v0: 1500, dv: 1300, k0: 1.1, dk: 0.9, atraso: 0.12 });
  const CANHAO_D = M.gerarConfete(110, 13, { angulo: -2.09, abertura: 0.55, v0: 1500, dv: 1300, k0: 1.1, dk: 0.9, atraso: 0.12 });
  let origem = [960, 540];
  M.depois(() => { M.renderCenas(T.confete); origem = centro($('#pgBotao')); });
  M.efeito((ctx, t) => {
    const dt = t - T.confete;
    if (dt < 0 || dt > 1.4) return;
    const a = 1 - P(dt, 1.0, 1.4);
    M.confete(ctx, CONFETE, origem, dt, a);
    M.confete(ctx, CANHAO_E, [-10, 1090], dt, a, 1700);
    M.confete(ctx, CANHAO_D, [1930, 1090], dt, a, 1700);
  });

  // ------------------------------------------------------------------ cena 4: rajada (um recurso por batida)
  M.cena({ el: '#s6', de: T.rajada, ate: T.fim, render(t) {
    const i = Math.max(0, Math.min(R.rajada.length - 1, Math.floor((t - T.rajada) / 0.5)));
    const cor = RAJ_COR[i % 3];
    $('#s6').style.background = cor.bg;
    rajEls.forEach((el, j) => {
      show(el, j === i);
      if (j !== i) return;
      const a = T.rajada + j * 0.5, k = P(t, a, a + 0.3, E.outExpo);
      const inn = $('.in', el);
      inn.style.transform = `scale(${lerp(1.45, 1, k)}) rotate(${lerp(j % 2 ? 5 : -5, 0, k)}deg)`;
      inn.style.opacity = P(t, a, a + 0.05);
      const ic = $('svg', el);
      ic.style.color = cor.ic;
      ic.style.transform = `scale(${P(t, a + 0.03, a + 0.35, E.outBack)})`;
      $('.tx', el).style.color = cor.fg;
    });
    $('#blzTag').style.color = cor.fg;
    dots.forEach((d, j) => { d.style.background = j === i ? cor.fg : 'transparent'; d.style.boxShadow = `inset 0 0 0 2px ${cor.fg}`; d.style.opacity = j === i ? 1 : 0.5; });
  } });

  // ------------------------------------------------------------------ cena 5: fechamento
  M.cena({ el: '#s7', de: T.fim, ate: T.dur + 1, render(t) {
    const k = P(t, T.fim, T.fim + 0.5, E.outExpo);
    LF.el.style.transform = `scale(${lerp(1.4, 1, k)})`;
    LF.el.style.opacity = P(t, T.fim, T.fim + 0.06);
    const ku = P(t, T.logo + 0.18, T.logo + 0.65, E.outCubic);
    $('#endUrl').style.opacity = ku;
    $('#endUrl').style.transform = `translateY(${(1 - ku) * 18}px)`;
  } });
  M.apagar(T.apagar[0], T.apagar[1]);
})();
