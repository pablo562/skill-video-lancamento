// Cardápio de estilos de trilha além do house e do pop, para os vídeos não soarem todos iguais. Estende o sintetizador
// sem mexer nele: as camas antigas
// (groove, grooveHouse, grooveLofi, grooveTrap) continuam idênticas byte a byte. Uso no trilha.js:
//   const S = require('./motor/estilos.js')(T);
//   const cama = S.cama(process.env.ESTILO || 'bossa', { compassos, entrada: T.drop, quebra, pausa, filtro, fim: T.marcaFim, final: T.marcaFim });
//   S.pluck(t, cama.nota(72));   // efeito com altura: sempre por cama.nota(), que leva o Dó do efeito para o tom do estilo
//   S.exportar(arquivo, { fadeOut: 1.2, lufs: -14 });
// Cada estilo tem tom, acordes, instrumentos e desenho rítmico próprios. O acorde é escrito por nome ("F#m9",
// "Bbmaj7", "E7#9", "A13", "C/E") e as vozes andam o mínimo de um acorde para o outro.
module.exports = function criarEstilos(T, opcoes) {
  const S = require('./sintetizador.js')(T, opcoes);
  const { SR, write, writeStereo, noise, rnd, mtof } = S;
  const sem = () => false, um = () => 1, rodar = (l) => (b) => l[((b % l.length) + l.length) % l.length];

  // ------------------------------------------------------------------ acordes em qualquer tom
  const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const QUAL = {
    '': [0, 4, 7], m: [0, 3, 7], 5: [0, 7], 6: [0, 4, 7, 9], m6: [0, 3, 7, 9], 7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10],
    mmaj7: [0, 3, 7, 11], 9: [0, 4, 7, 10, 14], maj9: [0, 4, 7, 11, 14], m9: [0, 3, 7, 10, 14], add9: [0, 4, 7, 14], madd9: [0, 3, 7, 14],
    69: [0, 4, 7, 9, 14], 11: [0, 7, 10, 14, 17], m11: [0, 3, 7, 10, 14, 17], 13: [0, 4, 7, 10, 14, 21], maj13: [0, 4, 7, 11, 14, 21],
    m13: [0, 3, 7, 10, 14, 21], sus2: [0, 2, 7], sus4: [0, 5, 7], '7sus4': [0, 5, 7, 10], '9sus4': [0, 5, 7, 10, 14], dim: [0, 3, 6],
    dim7: [0, 3, 6, 9], m7b5: [0, 3, 6, 10], aug: [0, 4, 8], '7b9': [0, 4, 7, 10, 13], '7#9': [0, 4, 7, 10, 15], '7b13': [0, 4, 7, 10, 20],
    '7#11': [0, 4, 7, 10, 18],
  };
  const classe = (n, a) => (PC[n] + (a === '#' ? 1 : a === 'b' ? -1 : 0) + 12) % 12;
  function lerAcorde(nome) {
    const m = /^([A-G])([#b]?)([^/]*)(?:\/([A-G])([#b]?))?$/.exec(nome);
    if (!m || !(m[3] in QUAL)) throw new Error(`acorde desconhecido: ${nome} (qualidades: ${Object.keys(QUAL).join(' ')})`);
    const raiz = classe(m[1], m[2]);
    return { raiz, baixo: m[4] ? classe(m[4], m[5]) : raiz, iv: QUAL[m[3]] };
  }
  // vozes fechadas entre lo e hi, escolhidas perto das vozes do acorde anterior
  function vozear(pcs, ant, lo, hi) {
    let melhor = null, custo = Infinity;
    for (let r = 0; r < pcs.length; r++) {
      const ordem = pcs.slice(r).concat(pcs.slice(0, r));
      for (let base = lo; base < lo + 12; base++) {
        if (base % 12 !== ordem[0]) continue;
        const v = [base];
        for (let i = 1; i < ordem.length; i++) { let x = v[i - 1] + 1; while (x % 12 !== ordem[i]) x++; v.push(x); }
        if (v[v.length - 1] > hi) continue;
        const c = ant ? v.reduce((s, x, i) => s + Math.abs(x - (ant[i] ?? ant[ant.length - 1])), 0)
          : Math.abs(v.reduce((s, x) => s + x, 0) / v.length - (lo + hi) / 2);
        if (c < custo) { custo = c; melhor = v; }
      }
    }
    return melhor || pcs.map((p) => lo + ((p - lo) % 12 + 12) % 12).sort((a, b) => a - b);
  }
  function montarAcorde(nome, tom, ant, [lo, hi] = [52, 72], n = 4) {
    const a = lerAcorde(nome);
    const raiz = (a.raiz + tom + 1200) % 12, baixo = (a.baixo + tom + 1200) % 12;
    let sel = a.iv.length > n ? a.iv.filter((i) => i !== 0) : a.iv.slice(); // acorde cheio: sem a fundamental em cima
    if (sel.length > n) sel = sel.filter((i) => i !== 7);                    // ainda sobra: sem a quinta
    sel = sel.slice(0, n);
    if (sel.length < n && a.iv.length <= 3) sel.push(12);                      // tríade: dobra a fundamental
    const vozes = vozear(sel.map((i) => (raiz + i) % 12), ant, lo, hi);
    return { nome, raiz, grave: 28 + ((baixo - 4 + 12) % 12), vozes, tons: a.iv.map((i) => (raiz + i) % 12) };
  }
  const tonsEntre = (c, lo, hi) => { const r = []; for (let m = lo; m <= hi; m++) if (c.tons.includes(m % 12)) r.push(m); return r; };
  function progressao(acorde, tom, faixa) {
    const cache = [];
    return (b) => {
      for (let i = cache.length; i <= b; i++) cache.push(montarAcorde(acorde(i), tom, i ? cache[i - 1].vozes : null, faixa));
      return cache[b];
    };
  }

  // ------------------------------------------------------------------ instrumentos
  // corda dedilhada (Karplus-Strong): violão, guitarra, baixo; sustentacao = segundos até cair 60 dB
  function corda(t0, midi, dur = 1.4, g = 1, pan = 0, { brilho = 0.5, sustentacao = 1.6, dest = 'duck', send = 0.18, ganho = 0.3 } = {}) {
    const f = mtof(midi), P = Math.max(4, Math.round(SR / f - 0.5));
    const buf = new Float32Array(P);
    let lp = 0, soma = 0;
    const a = 0.1 + 0.85 * brilho;
    for (let i = 0; i < P; i++) { lp += a * (noise() - lp); buf[i] = lp; soma += lp; }
    for (let i = 0; i < P; i++) buf[i] -= soma / P;
    const fator = Math.pow(0.001, 1 / (sustentacao * f)), cauda = 0.05;
    let idx = 0;
    write(t0, dur + cauda, (t) => {
      const y = buf[idx], j = idx + 1 === P ? 0 : idx + 1;
      buf[idx] = fator * 0.5 * (y + buf[j]); idx = j;
      return y * (t < dur ? 1 : Math.max(0, 1 - (t - dur) / cauda)) * g;
    }, { gain: ganho, pan, dest, send });
  }
  // batida nas cordas: para 'baixo' do grave ao agudo, 'cima' ao contrário; abafado = só o "tchk"
  function rasgado(t0, notas, { para = 'baixo', g = 1, pan = 0, dur = 1.2, espaco = 0.011, brilho = 0.45, sustentacao = 1.4, abafado = false, dest = 'duck' } = {}) {
    const ordem = para === 'baixo' ? notas : [...notas].reverse();
    ordem.forEach((m, i) => corda(t0 + i * espaco, m, abafado ? 0.05 : dur, g * (1 - i * 0.06), pan + (i - ordem.length / 2) * 0.05,
      { brilho: abafado ? 0.3 : brilho, sustentacao: abafado ? 0.09 : sustentacao, dest }));
  }
  // baixo de dedo: fundamental redonda com estalo curto
  function baixoDedo(t0, midi, dur, g = 1) {
    const f = mtof(midi); let ph = 0, lp = 0;
    write(t0, dur + 0.05, (t) => {
      ph += (2 * Math.PI * f) / SR;
      const x = Math.sin(ph) + 0.35 * Math.sin(2 * ph) * Math.exp(-t * 6) + 0.12 * Math.sin(3 * ph) * Math.exp(-t * 10) + noise() * Math.exp(-t * 400) * 0.25;
      lp += 0.25 * (x - lp);
      return Math.tanh(lp * 1.4) * Math.min(1, t * 180) * Math.exp(-t * 1.8) * (t < dur ? 1 : Math.max(0, 1 - (t - dur) / 0.05)) * g;
    }, { gain: 0.42, dest: 'duck' });
  }
  // metais: duas serras com o filtro abrindo no ataque e a nota subindo um pouco
  function metais(t0, notas, dur = 0.25, g = 1, pan = 0) {
    notas.forEach((m, i) => {
      const f = mtof(m); let p1 = rnd(), p2 = rnd(), lp = 0, lp2 = 0;
      write(t0, dur + 0.12, (t) => {
        const bend = 1 - 0.018 * Math.exp(-t * 40);
        p1 = (p1 + (f * bend * 1.003) / SR) % 1; p2 = (p2 + (f * bend * 0.997) / SR) % 1;
        const c = 0.04 + 0.3 * Math.min(1, t * 30) * (0.6 + 0.4 * Math.exp(-t * 6));
        lp += c * (2 * p1 - 1 + 2 * p2 - 1 - lp); lp2 += c * (lp - lp2);
        return Math.tanh(lp2 * 1.3) * Math.min(1, t * 90) * (t < dur ? 1 - 0.3 * Math.min(1, t / dur) : Math.max(0, 1 - (t - dur) / 0.12)) * g;
      }, { gain: 0.06, pan: pan + (i % 2 ? 0.2 : -0.2), dest: 'duck', send: 0.25 });
    });
  }
  // cordas: três serras desafinadas por nota, vibrato que entra devagar
  function cordas(t0, notas, dur, g = 1, { ataque = 0.35, soltura = 0.6, brilho = 0.5 } = {}) {
    notas.forEach((m, i) => {
      [-1, 0, 1].forEach((d) => {
        const f = mtof(m) * Math.pow(2, (d * 0.1) / 12); let ph = rnd(), lp = 0, lp2 = 0; const fase = rnd() * 6;
        const c = 0.02 + 0.09 * brilho;
        write(t0, dur + soltura, (t) => {
          ph = (ph + (f * (1 + 0.004 * Math.sin(2 * Math.PI * 5.2 * t + fase) * Math.min(1, t * 2))) / SR) % 1;
          lp += c * (2 * ph - 1 - lp); lp2 += c * (lp - lp2);
          return lp2 * Math.min(1, t / ataque) * (t < dur ? 1 : Math.max(0, 1 - (t - dur) / soltura)) * g;
        }, { gain: 0.05, pan: d * 0.5 + (i % 2 ? 0.15 : -0.15), dest: 'duck', send: 0.35 });
      });
    });
  }
  function marimba(t0, midi, g = 1, pan = 0) {
    const f = mtof(midi);
    write(t0, 1, (t) => {
      const w = 2 * Math.PI * f * t;
      return (Math.sin(w) * Math.exp(-t * 5.5) + 0.35 * Math.sin(3.93 * w) * Math.exp(-t * 24) + 0.12 * Math.sin(9.2 * w) * Math.exp(-t * 60)) * Math.min(1, t * 900) * g;
    }, { gain: 0.14, pan, send: 0.25 });
  }
  // log drum do amapiano: grave com queda de altura e saturação
  function logDrum(t0, midi, dur = 0.5, g = 1) {
    const f = mtof(midi); let ph = 0;
    write(t0, dur + 0.08, (t) => {
      ph += (2 * Math.PI * f * (1 + 0.6 * Math.exp(-t * 38))) / SR;
      const x = Math.sin(ph) + 0.3 * Math.sin(2 * ph) * Math.exp(-t * 8);
      return Math.tanh(x * 2.2) * Math.min(1, t * 600) * Math.exp(-t * 3.2) * (t < dur ? 1 : Math.max(0, 1 - (t - dur) / 0.08)) * g;
    }, { gain: 0.3 });
  }
  // conga: 'aberta', 'grave' ou 'tapa'
  function conga(t0, tipo = 'aberta', g = 1, pan = 0) {
    const f = tipo === 'grave' ? 196 : tipo === 'tapa' ? 380 : 300; let ph = 0, lp = 0;
    write(t0, 0.35, (t) => {
      ph += (2 * Math.PI * f * (1 + 0.35 * Math.exp(-t * 60))) / SR;
      const n = noise(); lp += 0.4 * (n - lp);
      return (Math.sin(ph) * Math.exp(-t * (tipo === 'tapa' ? 30 : 13)) + (n - lp) * Math.exp(-t * (tipo === 'tapa' ? 45 : 90)) * (tipo === 'tapa' ? 0.9 : 0.35)) * g;
    }, { gain: 0.2, pan, send: 0.15 });
  }
  function tamborim(t0, g = 1, pan = 0) {
    let ph = 0;
    write(t0, 0.12, (t) => { ph += (2 * Math.PI * 820 * (1 + 0.4 * Math.exp(-t * 80))) / SR; return (Math.sin(ph) * Math.exp(-t * 42) + noise() * Math.exp(-t * 160) * 0.5) * g; }, { gain: 0.13, pan, send: 0.1 });
  }
  function agogo(t0, alto = true, g = 1, pan = 0) {
    const f = alto ? 880 : 660;
    write(t0, 0.5, (t) => { const w = 2 * Math.PI * f * t; return (Math.sin(w) * 0.7 + Math.sin(w * 1.52) * 0.45 + Math.sin(w * 2.43) * 0.2) * Math.exp(-t * 9) * Math.min(1, t * 1500) * g; }, { gain: 0.07, pan, send: 0.2 });
  }
  function surdo(t0, g = 1) {
    let ph = 0;
    write(t0, 0.6, (t) => { ph += (2 * Math.PI * 62 * (1 + 0.5 * Math.exp(-t * 25))) / SR; return (Math.sin(ph) * Math.exp(-t * 6) + noise() * Math.exp(-t * 120) * 0.15) * Math.min(1, t * 700) * g; }, { gain: 0.55, send: 0.08 });
  }
  // aro da caixa (a batida de madeira da bossa)
  function aro(t0, g = 1, pan = 0) {
    let ph = 0, lp = 0;
    write(t0, 0.05, (t) => { ph += (2 * Math.PI * 1750) / SR; const n = noise(); lp += 0.5 * (n - lp); return (Math.sin(ph) * 0.6 + (n - lp)) * Math.exp(-t * 110) * g; }, { gain: 0.2, pan, send: 0.12 });
  }
  // caixa dos anos 80: golpe + cauda de reverb cortada seco pelo "gate"
  function caixa80(t0, g = 1) {
    let lp = 0;
    writeStereo(t0, 0.3, (t) => {
      const n1 = noise(), n2 = noise(); lp += 0.3 * (n1 - lp);
      const golpe = Math.sin(2 * Math.PI * 185 * t) * Math.exp(-t * 30) * 0.6 + (n1 - lp * 0.5) * Math.exp(-t * 25);
      const portao = t < 0.24 ? 0.5 * Math.exp(-t * 2) : Math.max(0, 0.5 * Math.exp(-0.48) * (1 - (t - 0.24) / 0.03));
      return [(golpe + n1 * portao) * g * 0.3, (golpe + n2 * portao) * g * 0.3];
    }, { send: 0.1 });
  }
  // lead quadrado com vibrato (arpejo do synthwave)
  function lead(t0, midi, dur, g = 1, pan = 0) {
    const f = mtof(midi); let ph = 0, lp = 0;
    write(t0, dur + 0.1, (t) => {
      ph = (ph + (f * (1 + 0.006 * Math.sin(2 * Math.PI * 5.5 * t) * Math.min(1, t * 3))) / SR) % 1;
      lp += 0.18 * ((ph < 0.5 ? 0.7 : -0.7) + 0.3 * (2 * ph - 1) - lp);
      return lp * Math.min(1, t * 200) * (0.8 + 0.2 * Math.exp(-t * 8)) * (t < dur ? 1 : Math.max(0, 1 - (t - dur) / 0.1)) * g;
    }, { gain: 0.07, pan, dest: 'duck', send: 0.3 });
  }
  // voz sintética ("ah", "oh"...): serra passando por três formantes
  const FORMANTES = { a: [[800, 1], [1150, 0.5], [2900, 0.25]], o: [[450, 1], [800, 0.45], [2830, 0.2]], e: [[400, 1], [1600, 0.4], [2700, 0.25]], u: [[325, 1], [700, 0.3], [2530, 0.15]] };
  function voz(t0, midi, dur, vogal = 'a', g = 1, pan = 0) {
    const f = mtof(midi);
    const fs = FORMANTES[vogal].map(([fc, amp]) => { const w = (2 * Math.PI * fc) / SR, al = Math.sin(w) / 16, a0 = 1 + al; return { b0: al / a0, b2: -al / a0, a1: (-2 * Math.cos(w)) / a0, a2: (1 - al) / a0, amp, x1: 0, x2: 0, y1: 0, y2: 0 }; });
    let ph = 0;
    write(t0, dur + 0.08, (t) => {
      ph = (ph + (f * (1 + 0.012 * Math.sin(2 * Math.PI * 5.8 * t) * Math.min(1, t * 4))) / SR) % 1;
      const x = 2 * ph - 1 + noise() * 0.03; let y = 0;
      for (const q of fs) { const o = q.b0 * x + q.b2 * q.x2 - q.a1 * q.y1 - q.a2 * q.y2; q.x2 = q.x1; q.x1 = x; q.y2 = q.y1; q.y1 = o; y += o * q.amp; }
      return y * Math.min(1, t * 60) * (t < dur ? 1 : Math.max(0, 1 - (t - dur) / 0.08)) * g;
    }, { gain: 0.5, pan, dest: 'duck', send: 0.3 });
  }

  // ------------------------------------------------------------------ instrumentos dos estilos calmos
  // piano de feltro: parciais levemente inarmônicas, duas cordas por nota, martelo macio, abafador ao soltar
  function piano(t0, midi, dur = 2, g = 1, pan = 0, { brilho = 0.35 } = {}) {
    const f0 = mtof(midi), grave = Math.max(0, Math.min(1, (72 - midi) / 36)), P = [];
    for (let k = 1; k <= 8; k++) {
      const fk = k * f0 * Math.sqrt(1 + 0.00035 * k * k);
      if (fk > 9000) break;
      P.push({ w: (2 * Math.PI * fk) / SR, w2: (2 * Math.PI * fk * 1.0006) / SR, amp: Math.pow(k, -1.25) * Math.exp(-(k - 1) * (0.6 - 0.45 * brilho)),
        dec: (1.2 - 0.55 * grave) * (1 + 0.55 * (k - 1)), ph: rnd() * 6.28, ph2: rnd() * 6.28 });
    }
    let lp = 0;
    write(t0, dur + 0.5, (t) => {
      let x = 0;
      for (const p of P) { p.ph += p.w; p.ph2 += p.w2; x += (Math.sin(p.ph) + Math.sin(p.ph2)) * p.amp * (0.7 * Math.exp(-t * p.dec * 2.2) + 0.3 * Math.exp(-t * p.dec * 0.45)); }
      lp += 0.08 * (noise() - lp);
      return (x * 0.5 + lp * Math.exp(-t * 90) * 0.35) * Math.min(1, t * 300) * (t < dur ? 1 : Math.exp(-(t - dur) * 9)) * g;
    }, { gain: 0.11, pan, send: 0.35 });
  }
  // kalimba: lâmina com parcial metálico curto e o toque do polegar
  function kalimba(t0, midi, g = 1, pan = 0) {
    const f = mtof(midi);
    write(t0, 1.6, (t) => {
      const w = 2 * Math.PI * f * t;
      return (Math.sin(w + 0.3 * Math.sin(2 * w) * Math.exp(-t * 20)) * Math.exp(-t * 2.6) + 0.25 * Math.sin(5.93 * w) * Math.exp(-t * 18) + 0.1 * noise() * Math.exp(-t * 300)) * Math.min(1, t * 1500) * g;
    }, { gain: 0.12, pan, send: 0.3 });
  }
  // vassourinha na caixa: ruído que cresce e some
  function vassoura(t0, dur, g = 1, pan = 0) {
    let lp = 0, lp2 = 0;
    write(t0, dur, (t) => { const n = noise(); lp += 0.35 * (n - lp); lp2 += 0.05 * (lp - lp2); return (lp - lp2) * Math.sin(Math.PI * Math.min(1, t / dur)) * g; }, { gain: 0.09, pan, send: 0.1 });
  }
  // grave suave dos estilos calmos: senoide com entrada e saída lentas (o S.sub ataca rápido e vira um "tum" pesado)
  function graveSuave(t0, midi, dur, g = 1) {
    const f = mtof(midi); let ph = 0;
    write(t0, dur + 0.6, (t) => { ph += (2 * Math.PI * f) / SR; return Math.sin(ph) * Math.min(1, t / 0.35) * (t < dur ? 1 : Math.max(0, 1 - (t - dur) / 0.6)) * g; }, { gain: 0.16 });
  }
  // bumbo macio que NÃO entra no sidechain: nos estilos calmos o resto não pode "respirar" a cada batida
  function bumboMacio(t0, g = 1) {
    let ph = 0;
    write(t0, 0.45, (t) => { ph += (2 * Math.PI * (48 + 90 * Math.exp(-t * 26))) / SR; return Math.sin(ph) * Math.exp(-t * 8) * Math.min(1, t * 400) * g; }, { gain: 0.8 });
  }

  // ------------------------------------------------------------------ camas novas
  // Todas: acorde(b) devolve o NOME do acorde do compasso b; entrada (bateria e baixo começam), quebra(t) (sem bumbo e
  // grave), pausa(t) (silêncio naquela batida), filtro(t) (0..1, brilho da harmonia), inicio, compassos, tom (+/- semitons).
  function compassosDe(o, fn) {
    const bat = 60 / T.bpm, comp = bat * 4, inicio = o.inicio || 0;
    const total = o.compassos ?? Math.ceil((T.dur - inicio) / comp);
    for (let b = 0; b < total; b++) fn(b, inicio + b * comp, bat);
  }

  // Bossa / samba eletrônico (110 a 124): violão na batida de bossa (clave em colcheias), polegar no 1 e no 3, aro na
  // clave invertida, ganzá, surdo no 2, baixo de dedo com aproximação cromática; eletronico = bumbo 4/4 discreto.
  function grooveBossa(o) {
    const { acorde, tom = 0, entrada = 0, pausa = sem, quebra = sem, filtro = um, eletronico = true } = o;
    const ch = progressao(acorde, tom, [50, 67]);
    const CLAVE = [[0, 3, 5], [1, 4, 6]];
    compassosDe(o, (b, t0, bat) => {
      const c = ch(b), col = bat / 2, cheio = (t) => t >= entrada && !quebra(t) && !pausa(t);
      [0, 4].forEach((e, i) => { const ts = t0 + e * col; if (!pausa(ts)) corda(ts, c.grave + 12 + (i ? 7 : 0), bat * 1.6, 0.85, -0.12, { brilho: 0.3, sustentacao: 1.1, dest: 'main' }); });
      CLAVE[b % 2].forEach((e, i) => { const ts = t0 + e * col; if (!pausa(ts)) rasgado(ts, c.vozes, { g: i ? 0.5 : 0.62, dur: col * 1.7, brilho: 0.22 + 0.3 * filtro(ts), sustentacao: 0.9, espaco: 0.009, pan: 0.14, dest: 'main' }); });
      cordas(t0, c.vozes, bat * 4, quebra(t0) ? 0.6 : 0.32, { ataque: 0.5, soltura: 0.8, brilho: 0.3 });
      for (let k = 0; k < 4; k++) {
        const tb = t0 + k * bat;
        if (pausa(tb)) continue;
        for (let s = 0; s < 4; s++) S.shaker(tb + (s * bat) / 4 + (s % 2 ? 0.012 : 0), s % 2 ? 0.45 : 0.8, s % 2 ? 0.35 : -0.35);
        if (!cheio(tb)) continue;
        if (k === 1) surdo(tb, 0.85); else if (k === 3) surdo(tb, 0.45);
        if (eletronico) { S.kick(tb, 0.6); if (k % 2) S.clap(tb, 0.35); S.chimbalAberto(tb + bat / 2, 0.55, 0.2); }
      }
      CLAVE[(b + 1) % 2].forEach((e) => { const ts = t0 + e * col; if (cheio(ts)) aro(ts, 0.65, 0.3); });
      const prox = ch(b + 1);
      [[0, c.grave, 1.4, 1], [2, c.grave + 7, 0.9, 0.8], [3.5, prox.grave - 1, 0.4, 0.55]].forEach(([k, m, d, g]) => { const ts = t0 + k * bat; if (cheio(ts)) baixoDedo(ts, m, bat * d, g); });
    });
  }

  // Disco / nu-disco (116 a 124): bumbo 4/4, palma e caixa no 2 e 4, chimbal aberto no contratempo, guitarra abafada em
  // semicolcheias com acento no contratempo, baixo em oitavas, cordas e metais antecipando o compasso seguinte.
  function grooveDisco(o) {
    const { acorde, tom = 0, entrada = 0, pausa = sem, quebra = sem, filtro = um } = o;
    const ch = progressao(acorde, tom, [55, 74]);
    compassosDe(o, (b, t0, bat) => {
      const c = ch(b), s16 = bat / 4, q = quebra(t0);
      cordas(t0, c.vozes, bat * 4, q ? 0.9 : 0.5, { ataque: 0.25, soltura: 0.5, brilho: 0.3 + 0.5 * filtro(t0) });
      for (let k = 0; k < 4; k++) {
        const tb = t0 + k * bat;
        if (pausa(tb)) continue;
        for (let s = 0; s < 4; s++) {
          const ts = tb + s * s16, acento = s === 2;
          if (tb < entrada && !acento) continue;
          rasgado(ts, c.vozes, { para: s % 2 ? 'cima' : 'baixo', g: acento ? 0.7 : 0.3, abafado: !acento, dur: s16 * 1.4, brilho: 0.6, espaco: 0.006, pan: 0.35 });
        }
        if (tb < entrada || quebra(tb)) continue;
        S.kick(tb, 1);
        if (k % 2) { S.clap(tb, 0.85); S.snare(tb, 0.35); }
        S.chimbalAberto(tb + bat / 2, 1.1, 0.2);
        for (let s = 0; s < 4; s++) S.hat(tb + s * s16, s ? 0.3 : 0.5, -0.3);
        S.bass(tb, c.grave, bat * 0.42, 1); S.bass(tb + bat / 2, c.grave + 12, bat * 0.38, 0.85);
      }
      const ta = t0 + 3.5 * bat;
      if (b % 2 === 1 && ta >= entrada && !pausa(ta) && !q) metais(ta, ch(b + 1).vozes, bat * 0.45, 0.9, 0);
    });
  }

  // Afro house com log drum do amapiano (112 a 122): bumbo 4/4 macio, ganzá em semicolcheias com suingue, congas,
  // aro no 2 e 4, piano elétrico no contratempo, log drum entre os bumbos, marimba em arpejo sincopado.
  function grooveAfro(o) {
    const { acorde, tom = 0, entrada = 0, pausa = sem, quebra = sem, filtro = um, swing = 0.56 } = o;
    const ch = progressao(acorde, tom, [53, 72]);
    const CONGA = [[2, 'aberta'], [3, 'aberta'], [6, 'tapa'], [10, 'grave'], [11, 'aberta'], [14, 'tapa']];
    compassosDe(o, (b, t0, bat) => {
      const c = ch(b), s16 = bat / 4, sw = (s) => s * s16 + (s % 2 ? (swing - 0.5) * 2 * s16 : 0);
      if (!pausa(t0 + 0.5 * bat)) S.epiano(t0 + 0.5 * bat, c.vozes, bat * 1.2, 0.55 + 0.35 * filtro(t0));
      if (!pausa(t0 + 2.5 * bat)) S.epiano(t0 + 2.5 * bat, c.vozes.slice(1), bat, 0.42);
      if (quebra(t0)) cordas(t0, c.vozes, bat * 4, 0.55, { ataque: 0.6 });
      for (let s = 0; s < 16; s++) { const ts = t0 + sw(s); if (!pausa(ts)) S.shaker(ts, s % 4 === 2 ? 0.9 : s % 2 ? 0.45 : 0.65, s % 2 ? 0.4 : -0.4); }
      const toca = (ts) => ts >= entrada && !quebra(ts) && !pausa(ts);
      for (let k = 0; k < 4; k++) { const tb = t0 + k * bat; if (!toca(tb)) continue; S.kick(tb, 0.85); S.chimbalAberto(tb + bat / 2, 0.65, 0.25); if (k % 2) aro(tb, 0.5, -0.2); }
      CONGA.forEach(([s, tipo], i) => { const ts = t0 + sw(s); if (ts >= entrada && !pausa(ts)) conga(ts, tipo, 0.8, i % 2 ? 0.35 : -0.25); });
      [3, 6, 10, 14].forEach((s, i) => { const ts = t0 + sw(s); if (toca(ts)) logDrum(ts, c.grave + 12 + (i === 2 ? 7 : 0), s16 * 1.6, i ? 0.8 : 1); });
      if (b % 2 === 0) { const ns = tonsEntre(c, 70, 90); [0, 3, 7, 10, 13].forEach((s, i) => { const ts = t0 + sw(s); if (!pausa(ts)) marimba(ts, ns[[0, 2, 1, 3, 2][i] % ns.length], 0.75, i % 2 ? 0.3 : -0.3); }); }
    });
  }

  // Synthwave anos 80 (100 a 118): bumbo no 1 e 3, caixa com gate no 2 e 4, baixo galopando em colcheias, cordas
  // largas, arpejo quadrado em semicolcheias com eco de 3/16.
  function grooveSynthwave(o) {
    const { acorde, tom = 0, entrada = 0, pausa = sem, quebra = sem, filtro = um } = o;
    const ch = progressao(acorde, tom, [54, 73]);
    const ORDEM = [0, 1, 2, 3, 2, 1, 2, 3];
    compassosDe(o, (b, t0, bat) => {
      const c = ch(b), s16 = bat / 4, q = quebra(t0);
      cordas(t0, c.vozes, bat * 4, q ? 1 : 0.7, { ataque: 0.15, soltura: 0.5, brilho: 0.25 + 0.6 * filtro(t0) });
      const ns = tonsEntre(c, 64, 84);
      for (let s = 0; s < 16; s++) {
        const ts = t0 + s * s16;
        if (pausa(ts) || (ts < entrada && s % 2)) continue;
        const m = ns[ORDEM[s % 8] % ns.length];
        lead(ts, m, s16 * 0.8, 0.5, 0.25); lead(ts + 3 * s16, m, s16 * 0.8, 0.2, -0.25);
      }
      for (let k = 0; k < 4; k++) {
        const tb = t0 + k * bat;
        if (pausa(tb) || tb < entrada || q) continue;
        if (k % 2 === 0) S.kick(tb, 1); else caixa80(tb, 1);
        S.hat(tb + bat / 2, 0.55, 0.3); S.hat(tb + bat / 4, 0.25, -0.3); S.hat(tb + (3 * bat) / 4, 0.25, -0.3);
        S.bass(tb, c.grave, bat * 0.4, 1); S.bass(tb + bat / 2, c.grave + 12, bat * 0.4, 0.8);
      }
    });
  }

  // Funk brasileiro (125 a 130; 150 no funk 150): tamborzão (808 em 0, 3, 6 e 10 da semicolcheia, tambor em 2, 7, 9, 11
  // e 14), palma e caixa no 2 e 4, e o gancho de "voz" sintética no contratempo a cada dois compassos.
  function grooveFunk(o) {
    const { acorde, tom = 0, entrada = 0, pausa = sem, quebra = sem, filtro = um } = o;
    const ch = progressao(acorde, tom, [55, 72]);
    const BUMBO = [0, 3, 6, 10], TAMBOR = [2, 7, 9, 11, 14];
    compassosDe(o, (b, t0, bat) => {
      const c = ch(b), s16 = bat / 4, q = quebra(t0);
      if (t0 < entrada || q) cordas(t0, c.vozes, bat * 4, 0.6, { brilho: 0.2 + 0.5 * filtro(t0) });
      if (b % 2 === 1 && !q) [[7, 'a', 0], [15, 'o', 2]].forEach(([s, v, d]) => { const ts = t0 + s * s16; if (ts >= entrada && !pausa(ts)) voz(ts, c.vozes[c.vozes.length - 1] - 12 + d, s16 * 1.4, v, 0.8, 0); });
      for (let s = 0; s < 16; s++) {
        const ts = t0 + s * s16;
        if (pausa(ts) || ts < entrada) continue;
        if (!q && BUMBO.includes(s)) S.oitoZeroOito(ts, c.grave + 12, s ? s16 * 1.8 : s16 * 2.5, s ? 0.85 : 1);
        if (s === 4 || s === 12) { S.clap(ts, 1); S.snare(ts, 0.6); }
        if (TAMBOR.includes(s)) conga(ts, s === 7 || s === 14 ? 'tapa' : 'grave', 0.9, s % 2 ? 0.3 : -0.3);
        if (!q && s % 2 === 0) S.hat(ts, 0.3, 0.25);
      }
    });
  }

  // Piano de feltro (60 a 90; numa grade mais rápida vira meio tempo): mão esquerda na fundamental com oitava, direita em
  // semínimas subindo e descendo nas notas do acorde, cordas lentas e grave suave depois da entrada. Sem bateria.
  function groovePiano(o) {
    const { acorde, tom = 0, entrada = 0, pausa = sem, quebra = sem, filtro = um } = o;
    const ch = progressao(acorde, tom, [55, 74]);
    const ORDEM = [0, 1, 2, 3, 4, 3, 2, 1];
    compassosDe(o, (b, t0, bat) => {
      const c = ch(b), q = quebra(t0), ns = tonsEntre(c, 62, 84);
      if (!pausa(t0)) { piano(t0, c.grave + 12, bat * 3.8, 0.85, -0.25); piano(t0 + 0.02, c.grave + 24, bat * 3.6, 0.4, -0.15); }
      for (let k = 0; k < 4; k++) {
        const tb = t0 + k * bat;
        if (!pausa(tb)) piano(tb, ns[ORDEM[(b % 2) * 4 + k] % ns.length], bat * 1.8, k ? 0.5 : 0.65, 0.2, { brilho: 0.25 + 0.3 * filtro(tb) });
      }
      if (t0 >= entrada && !q) { cordas(t0, c.vozes, bat * 4, 0.45, { ataque: 0.9, soltura: 1.2, brilho: 0.3 }); if (!pausa(t0)) graveSuave(t0, c.grave + 12, bat * 3.2, 0.5); }
    });
  }
  // Violão dedilhado (76 a 104): polegar alternando fundamental e quinta nas semínimas, dedos no contratempo e pinça no
  // 1; depois da entrada, ganzá, vassourinha no 2 e 4, bumbo macio e baixo de dedo.
  function grooveViolao(o) {
    const { acorde, tom = 0, entrada = 0, pausa = sem, quebra = sem, filtro = um } = o;
    const ch = progressao(acorde, tom, [52, 71]);
    const DEDOS = [2, 3, 1, 3];
    compassosDe(o, (b, t0, bat) => {
      const c = ch(b);
      for (let k = 0; k < 4; k++) {
        const tb = t0 + k * bat;
        if (pausa(tb)) continue;
        corda(tb, c.grave + 12 + (k % 2 ? 7 : 0), bat * 1.8, k ? 0.75 : 0.95, -0.15, { brilho: 0.35, sustentacao: 2.2, dest: 'main' });
        corda(tb + bat / 2, c.vozes[DEDOS[k] % c.vozes.length], bat * 1.6, 0.6, 0.2, { brilho: 0.45 + 0.25 * filtro(tb), sustentacao: 2, dest: 'main' });
        if (k === 0) corda(tb + 0.004, c.vozes[c.vozes.length - 1], bat * 1.8, 0.55, 0.25, { brilho: 0.45, sustentacao: 2, dest: 'main' });
        if (tb < entrada || quebra(tb)) continue;
        S.shaker(tb, 0.5, -0.3); S.shaker(tb + bat / 2, 0.35, 0.3);
        if (k % 2) vassoura(tb - 0.05, bat * 0.6, 0.8, 0.1);
        if (k === 0) { bumboMacio(tb, 0.5); baixoDedo(tb, c.grave, bat * 1.8, 0.7); }
        if (k === 2) { bumboMacio(tb, 0.32); baixoDedo(tb, c.grave + 7, bat * 1.2, 0.5); }
      }
    });
  }
  // Kalimba (80 a 104): ostinato em colcheias nas notas do acorde, com respiros; pad morno; depois da entrada, ganzá
  // leve, aro no 3 (meio tempo), bumbo macio no 1 e grave redondo.
  function grooveKalimba(o) {
    const { acorde, tom = 0, entrada = 0, pausa = sem, quebra = sem, filtro = um } = o;
    const ch = progressao(acorde, tom, [55, 72]);
    const OSTINATO = [0, 2, 1, 3, null, 2, 1, null];
    compassosDe(o, (b, t0, bat) => {
      const c = ch(b), ns = tonsEntre(c, 67, 88);
      OSTINATO.forEach((i, e) => { const ts = t0 + (e * bat) / 2; if (i != null && !pausa(ts)) kalimba(ts, ns[(i + (b % 2)) % ns.length], e ? 0.65 : 0.9, e % 2 ? 0.3 : -0.3); });
      if (!pausa(t0)) kalimba(t0, ns[0] - 12, 0.6, -0.1);
      S.pad(t0, c.vozes, bat * 4, 0.5 + 0.3 * filtro(t0), 0.8, 0.8);
      for (let k = 0; k < 4; k++) {
        const tb = t0 + k * bat;
        if (pausa(tb) || tb < entrada || quebra(tb)) continue;
        S.shaker(tb, 0.35, -0.3); S.shaker(tb + bat / 2, 0.25, 0.3);
        if (k === 0) { bumboMacio(tb, 0.45); graveSuave(tb, c.grave + 12, bat * 1.8, 0.9); }
        if (k === 2) aro(tb, 0.45, 0.15);
      }
    });
  }

  // ------------------------------------------------------------------ cardápio e rodízio
  // tom = deslocamento em semitons do Dó dos efeitos com altura (pluck, chime) para o tom do estilo.
  const CAMAS = {
    bossa: { fn: grooveBossa, tom: 2, tonica: 'Dmaj9', acordes: ['Em9', 'A13', 'Dmaj9', 'B7b9'], bpm: [110, 124], registro: 'premium', clima: 'violão de bossa, sofisticado e brasileiro' },
    disco: { fn: grooveDisco, tom: -5, tonica: 'Em9', acordes: ['Em9', 'A9', 'Em9', 'A9', 'Cmaj9', 'Bm7', 'Am9', 'B7#9'], bpm: [116, 124], registro: 'divertido', clima: 'guitarra funkeada, cordas e metais, festa' },
    afro: { fn: grooveAfro, tom: -4, tonica: 'Fm9', acordes: ['Fm9', 'Dbmaj9', 'Bbm9', 'C7sus4'], bpm: [112, 122], registro: 'ambos', clima: 'percussão orgânica, marimba e log drum' },
    synthwave: { fn: grooveSynthwave, tom: -3, tonica: 'F#m', acordes: ['F#m', 'D', 'A', 'E'], bpm: [100, 118], registro: 'ambos', clima: 'anos 80, caixa com gate, arpejo, cinema' },
    funk: { fn: grooveFunk, tom: -2, tonica: 'Gm', acordes: ['Gm', 'Gm', 'Eb', 'F'], bpm: [125, 130], registro: 'divertido', clima: 'tamborzão, 808 e voz sintética' },
    piano: { fn: groovePiano, tom: 3, tonica: 'Ebmaj9', acordes: ['Ebmaj9', 'Bb/D', 'Cm9', 'Abmaj9'], bpm: [60, 90], registro: 'calmo', clima: 'piano de feltro e cordas lentas, cinema, sem bateria' },
    violao: { fn: grooveViolao, tom: -5, tonica: 'G', acordes: ['G', 'D/F#', 'Em7', 'Cmaj7'], bpm: [76, 104], registro: 'calmo', clima: 'violão dedilhado, folk tranquilo' },
    kalimba: { fn: grooveKalimba, tom: 4, tonica: 'Emaj7', acordes: ['Emaj7', 'C#m7', 'Amaj7', 'B6'], bpm: [80, 104], registro: 'calmo', clima: 'kalimba e pad morno, leve e simpático' },
    'bossa-calma': { fn: (o) => grooveBossa({ ...o, eletronico: false }), tom: 5, tonica: 'Fmaj9', acordes: ['Gm9', 'C13', 'Fmaj9', 'D7b9'], bpm: [90, 118], registro: 'calmo', clima: 'bossa sem bumbo: violão, aro, ganzá e surdo' },
    house: { legado: 'house', tom: 0, bpm: [118, 128], registro: 'ambos', clima: 'stabs de acorde e shaker' },
    pop: { legado: 'pop', tom: 0, bpm: [110, 124], registro: 'divertido', clima: 'pop com palmas e arpejo' },
    lofi: { legado: 'lofi', tom: 0, bpm: [80, 95], registro: 'calmo', clima: 'piano elétrico com suingue e vinil' },
  };
  function cama(nome, o = {}) {
    const c = CAMAS[nome];
    if (!c) throw new Error(`estilo desconhecido: ${nome} (${Object.keys(CAMAS).join(', ')})`);
    const bat = 60 / T.bpm, comp = bat * 4, inicio = o.inicio || 0, extra = o.tom || 0;
    const bFim = o.fim != null ? Math.floor((o.fim - inicio) / comp + 1e-6) : Infinity;
    if (c.legado) {
      const HOUSE = ['Cmaj9', 'Am9', 'Fmaj9', 'G13'], LOFI = ['Dm9', 'G13', 'Cmaj9', 'Am9'], POP = ['C', 'Am', 'F', 'G'];
      const fim = c.legado === 'pop' ? 'C' : 'Cmaj9';
      const base = o.acorde || rodar(c.legado === 'pop' ? POP : c.legado === 'lofi' ? LOFI : HOUSE);
      const acorde = (b) => (b >= bFim ? fim : base(b));
      if (c.legado === 'house') S.grooveHouse({ ...o, acorde });
      else if (c.legado === 'lofi') S.grooveLofi({ ...o, acorde });
      else S.groove({ ...o, acorde });
      if (o.final != null) { S.pad(o.final, S.ACORDES_LOFI.Cmaj9.ep.map((m) => m + 12), o.finalDur ?? 3.4, 0.9, 0.05, 1.4); S.sub(o.final, 36, 1.6, 1); }
      return { nome, tom: 0, nota: (m) => m, info: c };
    }
    const base = o.acorde || rodar(c.acordes);
    const acorde = (b) => (b >= bFim ? c.tonica : base(b));
    c.fn({ ...o, acorde, tom: extra });
    const ch = progressao(acorde, extra, [52, 72]);
    if (o.final != null) {
      const f = ch(Math.floor((o.final - inicio) / comp + 1e-6));
      cordas(o.final, f.vozes.map((m) => m + 12), o.finalDur ?? 3.4, 0.9, { ataque: 0.04, soltura: 1.4, brilho: 0.6 });
      if (c.registro === 'calmo') graveSuave(o.final, f.grave + 12, o.finalDur ?? 3.4, 0.9); else S.sub(o.final, f.grave + 12, 1.6, 1);
    }
    return { nome, tom: c.tom + extra, nota: (m) => m + c.tom + extra, acorde: ch, info: c };
  }

  // exportar com volume integrado alvo (LUFS): mede com ebur128 e aplica ganho linear + limitador
  const exportarBase = S.exportar;
  function exportar(arquivo, op = {}) {
    const r = exportarBase(arquivo, op);
    if (op.lufs == null) return r;
    const { execFileSync, spawnSync } = require('child_process');
    const med = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', arquivo, '-af', 'ebur128=framelog=quiet', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
    const I = parseFloat((/I:\s+(-?[\d.]+) LUFS/.exec(med.split('Summary:').pop()) || [])[1]);
    if (!Number.isFinite(I)) return r;
    const tmp = arquivo.replace(/\.wav$/, '.tmp.wav');
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', arquivo, '-af', `volume=${(op.lufs - I).toFixed(2)}dB,alimiter=limit=0.89:level=0`, '-c:a', 'pcm_s16le', tmp]);
    require('fs').renameSync(tmp, arquivo);
    return { ...r, lufsAntes: I, lufs: op.lufs };
  }

  return Object.assign(S, {
    lerAcorde, montarAcorde, progressao, tonsEntre, corda, rasgado, baixoDedo, metais, cordas, marimba, logDrum, conga, tamborim, agogo, surdo, aro,
    caixa80, lead, voz, piano, kalimba, vassoura, bumboMacio, graveSuave, grooveBossa, grooveDisco, grooveAfro, grooveSynthwave, grooveFunk,
    groovePiano, grooveViolao, grooveKalimba, CAMAS, cama, exportar,
  });
};
