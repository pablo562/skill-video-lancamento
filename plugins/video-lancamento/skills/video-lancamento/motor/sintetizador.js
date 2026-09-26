// Sintetizador da trilha: tudo gerado em JavaScript, sem samples. Uso em trilha.js:
//   const S = require('./motor/sintetizador.js')(T);
//   S.groove({ acorde: (b) => 'C', ... });   // cama musical: pad, bumbo, palmas, chimbal, baixo, arpejo
//   S.kick(t) S.clap(t) S.pop(t, f0, f1) S.chime(t, midi) S.whoosh(t, dur) S.riser(t0, t1) ...   // efeitos no tempo exato
//   S.exportar('out/trilha.wav')
// Os instrumentos escrevem em três barramentos: main (seco), duck (abaixa a cada bumbo) e send (reverb).
const fs = require('fs');
const path = require('path');

module.exports = function criarTrilha(T, { SR = 48000, semente = 424242 } = {}) {
  const N = Math.ceil(SR * T.dur);
  const bus = () => ({ L: new Float32Array(N), R: new Float32Array(N) });
  const B = { main: bus(), duck: bus(), send: bus() };
  let seed = semente;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const noise = () => rnd() * 2 - 1;
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function write(t0, dur, fn, { gain = 1, pan = 0, dest = 'main', send = 0 } = {}) {
    const i0 = Math.round(t0 * SR), n = Math.round(dur * SR);
    const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4), gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
    const D = B[dest];
    for (let k = 0; k < n; k++) {
      const i = i0 + k;
      if (i < 0 || i >= N) continue;
      const v = fn(k / SR);
      D.L[i] += v * gl; D.R[i] += v * gr;
      if (send) { B.send.L[i] += v * gl * send; B.send.R[i] += v * gr * send; }
    }
  }
  function writeStereo(t0, dur, fn, { dest = 'main', send = 0 } = {}) {
    const i0 = Math.round(t0 * SR), n = Math.round(dur * SR);
    for (let k = 0; k < n; k++) {
      const i = i0 + k; if (i < 0 || i >= N) continue;
      const [l, r] = fn(k / SR, k / n);
      B[dest].L[i] += l; B[dest].R[i] += r;
      if (send) { B.send.L[i] += l * send; B.send.R[i] += r * send; }
    }
  }

  const kicks = [];
  function kick(t0, g = 1) {
    kicks.push(t0);
    let ph = 0;
    write(t0, 0.5, (t) => {
      const f = 46 + 135 * Math.exp(-t * 30);
      ph += (2 * Math.PI * f) / SR;
      return (Math.sin(ph) * Math.exp(-t * 7) * Math.min(1, t * 500) + noise() * Math.exp(-t * 260) * 0.22) * g;
    }, { gain: 0.95 });
  }
  function clap(t0, g = 1) {
    let lp = 0;
    write(t0, 0.4, (t) => {
      const n = noise(); lp += 0.32 * (n - lp); const hp = n - lp;
      let env = 0;
      for (const o of [0, 0.011, 0.023]) if (t >= o) env += Math.exp(-(t - o) * 170) * 0.8;
      if (t > 0.023) env += Math.exp(-(t - 0.023) * 15) * 0.45;
      return hp * env * g;
    }, { gain: 0.42, send: 0.35 });
  }
  function hat(t0, g = 1, pan = 0) {
    let lp = 0;
    write(t0, 0.09, (t) => { const n = noise(); lp += 0.62 * (n - lp); return (n - lp) * Math.exp(-t * 68) * g; }, { gain: 0.2, pan });
  }
  function crash(t0, g = 1, dur = 2.6) {
    [-0.55, 0.55].forEach((pan) => {
      let lp = 0;
      write(t0, dur, (t) => { const n = noise(); lp += 0.5 * (n - lp); return (n - lp) * Math.exp(-t * 2.1) * Math.min(1, t * 400) * g; }, { gain: 0.16, pan, send: 0.35 });
    });
  }
  function bass(t0, midi, dur, g = 1) {
    const f = mtof(midi);
    let ph = 0, lp = 0, lp2 = 0;
    write(t0, dur + 0.04, (t) => {
      ph = (ph + f / SR) % 1;
      const x = 0.62 * (2 * ph - 1) + 0.38 * Math.sin(2 * Math.PI * ph);
      const c = 0.05 + 0.22 * Math.exp(-t * 16);
      lp += c * (x - lp); lp2 += c * (lp - lp2);
      const env = Math.min(1, t * 350) * (t < dur ? 1 : Math.max(0, 1 - (t - dur) / 0.04)) * (0.78 + 0.22 * Math.exp(-t * 7));
      return Math.tanh(lp2 * 2.4) * env * g;
    }, { gain: 0.46, dest: 'duck' });
  }
  function pad(t0, notes, dur, g = 1, att = 0.3, rel = 0.7) {
    notes.forEach((m) => {
      [-1, 1].forEach((lado) => {
        const f = mtof(m) * Math.pow(2, (lado * 0.08) / 12);
        let ph = rnd(), lp = 0, lp2 = 0;
        write(t0, dur + rel, (t) => {
          ph = (ph + f / SR) % 1;
          const x = 2 * ph - 1;
          lp += 0.05 * (x - lp); lp2 += 0.05 * (lp - lp2);
          const env = Math.min(1, t / att) * (t < dur ? 1 : Math.max(0, 1 - (t - dur) / rel));
          return lp2 * env * g;
        }, { gain: 0.085, pan: lado * 0.6, dest: 'duck', send: 0.22 });
      });
    });
  }
  function pluck(t0, midi, g = 1, pan = 0) {
    const f = mtof(midi); let ph = 0;
    write(t0, 0.32, (t) => { ph = (ph + f / SR) % 1; return (1 - 4 * Math.abs(ph - 0.5)) * Math.exp(-t * 12) * Math.min(1, t * 900) * g; }, { gain: 0.09, pan, dest: 'duck', send: 0.3 });
  }
  function chime(t0, midi, g = 1, pan = 0) {
    const f = mtof(midi);
    write(t0, 1.6, (t) => {
      const w = 2 * Math.PI * f * t;
      return (Math.sin(w) + 0.35 * Math.sin(2 * w) * Math.exp(-t * 6) + 0.12 * Math.sin(3.01 * w) * Math.exp(-t * 10)) * Math.exp(-t * 3.4) * Math.min(1, t * 600) * g;
    }, { gain: 0.16, pan, send: 0.45 });
  }
  function pop(t0, f0 = 500, f1 = 1100, g = 1, pan = 0) {
    let ph = 0;
    write(t0, 0.13, (t) => { const f = f0 + (f1 - f0) * Math.min(1, t / 0.05); ph += (2 * Math.PI * f) / SR; return Math.sin(ph) * Math.exp(-t * 36) * Math.min(1, t * 1500) * g; }, { gain: 0.26, pan, send: 0.14 });
  }
  function click(t0, g = 1, pan = 0, tom = 2600) {
    let ph = 0;
    write(t0, 0.035, (t) => { ph += (2 * Math.PI * tom) / SR; return (noise() * Math.exp(-t * 900) * 0.6 + Math.sin(ph) * Math.exp(-t * 420) * 0.55) * g; }, { gain: 0.3, pan });
  }
  function whoosh(t0, dur = 0.45, g = 1, de = -0.7, para = 0.7) {
    let lp = 0, lp2 = 0;
    writeStereo(t0, dur, (t, x) => {
      const n = noise();
      const c = 0.02 + 0.28 * Math.sin(Math.PI * x);
      lp += c * (n - lp); lp2 += (c * 0.35) * (lp - lp2);
      const v = (lp - lp2) * Math.pow(Math.sin(Math.PI * x), 2) * g * 0.55;
      const pan = de + (para - de) * x;
      return [v * Math.cos(((pan + 1) * Math.PI) / 4), v * Math.sin(((pan + 1) * Math.PI) / 4)];
    }, { send: 0.2 });
  }
  function riser(t0, t1, g = 1) {
    let lp = 0, ph = 0;
    writeStereo(t0, t1 - t0, (t, x) => {
      const n = noise();
      lp += (0.01 + 0.45 * x * x) * (n - lp);
      const f = 220 * Math.pow(4, x); ph += (2 * Math.PI * f) / SR;
      const v = (lp * x * x * 0.7 + Math.sin(ph) * Math.pow(x, 3) * 0.12) * g;
      return [v, v];
    }, { send: 0.3 });
  }
  function thunk(t0, g = 1) {
    let ph = 0, lp = 0;
    write(t0, 0.5, (t) => {
      const f = 42 + 90 * Math.exp(-t * 22); ph += (2 * Math.PI * f) / SR;
      const n = noise(); lp += 0.08 * (n - lp);
      return (Math.sin(ph) * Math.exp(-t * 8) + lp * 2.5 * Math.exp(-t * 35)) * g;
    }, { gain: 0.8, send: 0.15 });
  }
  function rabisco(t0, t1) {
    let lp = 0, lp2 = 0;
    write(t0, t1 - t0, (t) => {
      const n = noise(); lp += 0.55 * (n - lp); lp2 += 0.09 * (lp - lp2);
      const traco = Math.pow(0.5 + 0.5 * Math.sin(2 * Math.PI * 7.3 * t + 2.2 * Math.sin(2 * Math.PI * 1.7 * t)), 2);
      return (lp - lp2) * traco;
    }, { gain: 0.34, pan: -0.15 });
  }
  function brilho(t0, n = 14, janela = 0.7, g = 1) {
    for (let i = 0; i < n; i++) chime(t0 + rnd() * janela, 88 + Math.floor(rnd() * 12), 0.35 * g, rnd() * 1.6 - 0.8);
  }
  function batida(t0, g = 1) {
    kick(t0, 1.1 * g);
    let ph = 0;
    write(t0, 0.9, (t) => { ph += (2 * Math.PI * 52) / SR; return Math.sin(ph) * Math.exp(-t * 5) * g; }, { gain: 0.5, dest: 'main' });
    let lp = 0;
    write(t0, 0.25, (t) => { const n = noise(); lp += 0.25 * (n - lp); return lp * Math.exp(-t * 22) * g; }, { gain: 0.6, send: 0.3 });
  }
  function queda(t0) {
    let ph = 0;
    write(t0, 1.2, (t) => { const f = 90 * Math.exp(-t * 1.6) + 30; ph += (2 * Math.PI * f) / SR; return Math.sin(ph) * Math.exp(-t * 2.4); }, { gain: 0.55 });
  }

  // acordes prontos (raiz do baixo, vozes do pad, notas do arpejo), em MIDI
  const ACORDES = {
    C: { raiz: 36, pad: [60, 64, 67, 71], arp: [72, 76, 79, 83] },
    Am: { raiz: 33, pad: [57, 60, 64, 67], arp: [69, 72, 76, 79] },
    F: { raiz: 41, pad: [53, 57, 60, 64], arp: [65, 69, 72, 76] },
    G: { raiz: 43, pad: [55, 59, 62, 65], arp: [67, 71, 74, 77] },
  };

  // Cama musical em compassos de 4 batidas. acorde(b) devolve a chave de ACORDES para o compasso b.
  // entrada: quando bumbo e baixo começam; hatsDe: quando entra o chimbal; rajadaDe: a partir daqui
  // palmas em toda batida e baixo longo; pausa(t): batidas sem bateria; arpejo(t): quando toca o arpejo.
  // inicio: segundo em que cai o compasso 0 (para alinhar a grade da música a uma narração gravada).
  function groove({ acorde, compassos, entrada = 0, hatsDe = 0, rajadaDe = Infinity, pausa = () => false, arpejo = () => false, introCompassos = 0, inicio = 0 }) {
    const batida = 60 / T.bpm, comp = batida * 4;
    const total = compassos ?? Math.floor(T.dur / comp);
    for (let b = 0; b < total; b++) {
      const t0 = inicio + b * comp, ch = ACORDES[acorde(b)];
      pad(t0, ch.pad, comp, b < introCompassos ? 0.75 : 1, b < introCompassos ? 0.9 : 0.25, 0.5);
      for (let beat = 0; beat < 4; beat++) {
        const tb = t0 + beat * batida;
        if (tb < entrada) continue;
        const rajada = tb >= rajadaDe;
        if (!pausa(tb)) {
          kick(tb);
          if (beat % 2 === 1 || rajada) clap(tb, rajada ? 0.8 : 1);
          if (tb >= hatsDe || rajada) {
            hat(tb + batida / 2, 1, 0.3);
            hat(tb + batida / 4, 0.35, -0.3); hat(tb + (3 * batida) / 4, 0.35, -0.3);
          }
          if (rajada) bass(tb, ch.raiz, batida * 0.88);
          else { bass(tb, ch.raiz, batida * 0.4); bass(tb + batida / 2, ch.raiz + 12, batida * 0.36, 0.8); }
        }
        if (arpejo(tb)) {
          const ordem = [0, 2, 1, 3];
          for (let s = 0; s < 4; s++) pluck(tb + (s * batida) / 4, ch.arp[ordem[(beat + s) % 4]], s === 0 ? 1 : 0.7, s % 2 ? 0.35 : -0.35);
        }
      }
    }
  }

  // ---------------------------------------------------------- estilo lo-fi (90 BPM, suingue, piano elétrico)
  // Acordes de jazz em MIDI: raiz do grave (sub) e vozes do piano elétrico.
  const ACORDES_LOFI = {
    Dm9: { raiz: 38, ep: [53, 57, 60, 64] },
    G13: { raiz: 31, ep: [53, 59, 64, 69] },
    Cmaj9: { raiz: 36, ep: [52, 59, 62, 67] },
    Am9: { raiz: 33, ep: [55, 60, 64, 71] },
    Fmaj9: { raiz: 29, ep: [52, 57, 60, 67] },
    E7s9: { raiz: 28, ep: [56, 62, 67, 71] },
  };
  // piano elétrico (FM leve, tremolo, sino no ataque), vozes arpejadas em 12 ms
  function epiano(t0, notes, dur, g = 1, pan = 0) {
    notes.forEach((m, i) => {
      const f = mtof(m);
      write(t0 + i * 0.012, dur + 0.7, (t) => {
        const w = 2 * Math.PI * f * t;
        const trem = 1 + 0.16 * Math.sin(2 * Math.PI * 4.2 * t);
        const env = Math.min(1, t * 250) * Math.exp(-t * 1.3) * (t < dur ? 1 : Math.exp(-(t - dur) * 7));
        const sino = Math.sin(3 * w) * Math.exp(-t * 9) * 0.22;
        return (Math.sin(w + 0.55 * Math.sin(w) * Math.exp(-t * 2.5)) + sino) * env * trem * g;
      }, { gain: 0.075, pan: pan + (i % 2 ? 0.28 : -0.28), dest: 'duck', send: 0.32 });
    });
  }
  // caixa de boom-bap: corpo em 190 Hz + ruído
  function snare(t0, g = 1) {
    let lp = 0;
    write(t0, 0.32, (t) => {
      const n = noise(); lp += 0.35 * (n - lp);
      return (Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t * 28) * 0.55 + (n - lp * 0.4) * Math.exp(-t * 20)) * g;
    }, { gain: 0.34, send: 0.22 });
  }
  // grave redondo (senoide saturada)
  function sub(t0, midi, dur, g = 1) {
    const f = mtof(midi); let ph = 0;
    write(t0, dur + 0.06, (t) => {
      ph += (2 * Math.PI * f) / SR;
      const env = Math.min(1, t * 140) * (t < dur ? 1 : Math.max(0, 1 - (t - dur) / 0.06));
      return Math.tanh(Math.sin(ph) * 1.7) * env * g;
    }, { gain: 0.4, dest: 'duck' });
  }
  // chiado e estalos de vinil
  function vinil(t0, t1, g = 1) {
    let lp = 0;
    writeStereo(t0, t1 - t0, (t, x) => {
      const n = noise(); lp += 0.04 * (n - lp);
      let v = lp * 0.22;
      if (rnd() < 0.0008) v += (rnd() * 2 - 1) * 0.7;
      const fade = Math.min(1, x * 30, (1 - x) * 30);
      return [v * g * fade, v * g * fade];
    });
  }
  // Cama lo-fi em compassos de 4 batidas com suingue nas colcheias. acorde(b) devolve a chave de ACORDES_LOFI.
  // entrada: quando a bateria entra; pausa(t): batidas sem bateria; so_piano(b): compassos só com piano e vinil.
  function grooveLofi({ acorde, compassos, entrada = 0, swing = 0.6, pausa = () => false, so_piano = () => false }) {
    const bat = 60 / T.bpm, comp = bat * 4;
    const total = compassos ?? Math.floor(T.dur / comp);
    for (let b = 0; b < total; b++) {
      const t0 = b * comp, ch = ACORDES_LOFI[acorde(b)];
      epiano(t0, ch.ep, bat * 2.4, 1);
      epiano(t0 + bat * 2 + bat * swing, ch.ep.slice(1), bat * 1.2, 0.55);
      if (so_piano(b)) continue;
      for (let k = 0; k < 4; k++) {
        const tb = t0 + k * bat;
        if (tb < entrada || pausa(tb)) continue;
        if (k === 0) { kick(tb, 1); sub(tb, ch.raiz, bat * 1.6); }
        if (k === 2) { kick(tb + bat * swing, 0.85); sub(tb + bat * swing, ch.raiz, bat * 0.9, 0.9); }
        if (k === 1 && b % 2 === 1) kick(tb + bat * 0.75, 0.5);
        if (k === 1 || k === 3) snare(tb, 1);
        if (k === 3 && b % 2 === 0) snare(tb + bat * 0.75, 0.22);
        hat(tb, 0.75, 0.25); hat(tb + bat * swing, 0.45, -0.25);
      }
    }
  }

  // ---------------------------------------------------------- estilo house (120 a 128 BPM)
  // acorde em stab (duas serras desafinadas por nota, passa-baixa de 2 polos); corte 0..1 abre o filtro
  function stab(t0, notes, dur = 0.2, g = 1, corte = 1, pan = 0) {
    const a = 0.015 + 0.45 * corte * corte;
    notes.forEach((m, i) => {
      const f = mtof(m);
      let p1 = rnd(), p2 = rnd(), lp = 0, lp2 = 0;
      write(t0, dur + 0.25, (t) => {
        p1 = (p1 + (f * 1.004) / SR) % 1; p2 = (p2 + (f * 0.996) / SR) % 1;
        lp += a * (2 * p1 - 1 + (2 * p2 - 1) - lp); lp2 += a * (lp - lp2);
        const env = Math.min(1, t * 400) * Math.exp(-t * 6) * (t < dur ? 1 : Math.max(0, 1 - (t - dur) / 0.25));
        return lp2 * env * g;
      }, { gain: 0.05, pan: pan + (i % 2 ? 0.2 : -0.2), dest: 'duck', send: 0.35 });
    });
  }
  // baixo plucado: serra com filtro que fecha rápido + senoide por baixo
  function baixoHouse(t0, midi, dur = 0.2, g = 1) {
    const f = mtof(midi); let ph = 0, ps = 0, lp = 0;
    write(t0, dur + 0.05, (t) => {
      ph = (ph + f / SR) % 1; ps += (2 * Math.PI * f) / SR;
      lp += (0.03 + 0.22 * Math.exp(-t * 18)) * (2 * ph - 1 - lp);
      const env = Math.min(1, t * 300) * (t < dur ? 1 : Math.max(0, 1 - (t - dur) / 0.05));
      return (lp * 0.9 + Math.sin(ps) * 0.6) * env * g;
    }, { gain: 0.3, dest: 'duck' });
  }
  function chimbalAberto(t0, g = 1, pan = 0) {
    let hp = 0, prev = 0;
    write(t0, 0.22, (t) => { const n = noise(); hp = 0.9 * (hp + n - prev); prev = n; return hp * Math.exp(-t * 16) * g; }, { gain: 0.07, pan, send: 0.1 });
  }
  function shaker(t0, g = 1, pan = 0) {
    let hp = 0, prev = 0;
    write(t0, 0.06, (t) => { const n = noise(); hp = 0.8 * (hp + n - prev); prev = n; return hp * Math.min(1, t * 200) * Math.exp(-t * 60) * g; }, { gain: 0.045, pan });
  }
  // Cama house a partir de `inicio`: stabs sincopados (acorde de ACORDES_LOFI), shaker em semicolcheias sempre; bumbo,
  // chimbal aberto no contratempo e baixo no contratempo só depois de `entrada` e fora de quebra(t); palmas no 2 e no 4
  // também na quebra. filtro(t) 0..1 abre os acordes (introdução abafada); pausa(t) silencia tudo naquela batida.
  function grooveHouse({ acorde, compassos, inicio = 0, entrada = 0, pausa = () => false, quebra = () => false, filtro = () => 1 }) {
    const bat = 60 / T.bpm, comp = bat * 4;
    const stabs = [0.5, 1.5, 2.75, 3.5];
    for (let b = 0; b < compassos; b++) {
      const t0 = inicio + b * comp, ch = ACORDES_LOFI[acorde(b)];
      stabs.forEach((s, i) => { const ts = t0 + s * bat; if (!pausa(ts)) stab(ts, ch.ep, i === 2 ? 0.12 : 0.2, 1, filtro(ts), i % 2 ? 0.25 : -0.25); });
      for (let k = 0; k < 4; k++) {
        const tb = t0 + k * bat;
        if (pausa(tb)) continue;
        const q = quebra(tb), cheio = tb >= entrada && !q;
        for (let s = 0; s < 4; s++) shaker(tb + (s * bat) / 4, s % 2 ? 0.5 : 0.9, s % 2 ? 0.35 : -0.35);
        if ((k === 1 || k === 3) && (cheio || q)) clap(tb, cheio ? 0.9 : 0.7);
        if (!cheio) continue;
        kick(tb, 1);
        chimbalAberto(tb + bat / 2, 1, 0.2);
        baixoHouse(tb + bat / 2, ch.raiz + (k === 3 ? 24 : 12), bat * 0.38, 1);
      }
    }
  }

  // ---------------------------------------------------------- estilo trap-pop (130 a 150 BPM, meio tempo)
  // 808: senoide saturada com queda de altura no ataque; deslizePara (midi) faz o glide no fim da nota
  function oitoZeroOito(t0, midi, dur = 0.8, g = 1, deslizePara = null) {
    kicks.push(t0);
    const f0 = mtof(midi), f1 = deslizePara != null ? mtof(deslizePara) : f0;
    let ph = 0;
    write(t0, dur + 0.08, (t) => {
      const gl = deslizePara != null ? Math.min(1, Math.max(0, (t - dur * 0.55) / (dur * 0.3))) : 0;
      const f = (f0 + (f1 - f0) * gl) * (1 + 1.6 * Math.exp(-t * 45));
      ph += (2 * Math.PI * f) / SR;
      const env = Math.min(1, t * 600) * (t < dur ? Math.exp(-t * 1.2) : Math.exp(-dur * 1.2) * Math.max(0, 1 - (t - dur) / 0.08));
      return Math.tanh(Math.sin(ph) * 2.2) * env * g;
    }, { gain: 0.55 });
  }
  function caixaTrap(t0, g = 1) { clap(t0, 0.9 * g); snare(t0, 0.7 * g); }
  // sino melódico (FM curto e brilhante)
  function sino(t0, midi, g = 1, pan = 0) {
    const f = mtof(midi);
    write(t0, 0.9, (t) => { const w = 2 * Math.PI * f * t; return Math.sin(w + 1.8 * Math.sin(3.5 * w) * Math.exp(-t * 7)) * Math.exp(-t * 4.5) * Math.min(1, t * 800) * g; }, { gain: 0.07, pan, send: 0.4 });
  }
  // Cama trap em meio tempo a partir de `inicio`: caixa no 3, 808 na raiz do acorde (0, 1,5 e 2,75 batidas, com glide
  // para o próximo acorde), chimbal em colcheias com rajada de fusas no último tempo dos compassos ímpares, sino em
  // arpejo. entrada: quando entram bateria e 808 (antes só o sino); quebra(t): só caixa e sino; sinos(t0): liga o arpejo.
  function grooveTrap({ acorde, compassos, inicio = 0, entrada = 0, pausa = () => false, quebra = () => false, sinos = () => true }) {
    const bat = 60 / T.bpm, comp = bat * 4;
    for (let b = 0; b < compassos; b++) {
      const t0 = inicio + b * comp, ch = ACORDES_LOFI[acorde(b)];
      if (sinos(t0)) [0, 0.75, 1.5, 2, 2.75, 3.5].forEach((s, i) => { const ts = t0 + s * bat; if (!pausa(ts)) sino(ts, ch.ep[[0, 2, 1, 3, 2, 1][i]] + 12, i === 0 ? 1 : 0.7, i % 2 ? 0.3 : -0.3); });
      for (let k = 0; k < 4; k++) {
        const tb = t0 + k * bat;
        if (tb < entrada || pausa(tb)) continue;
        const q = quebra(tb);
        if (k === 2) caixaTrap(tb, q ? 0.6 : 1);
        if (q) continue;
        if (k === 3 && b % 2 === 1) for (let s = 0; s < 8; s++) hat(tb + (s * bat) / 8, 0.35 + 0.05 * s, s % 2 ? 0.25 : -0.25);
        else { hat(tb, 0.8, 0.25); hat(tb + bat / 2, 0.5, -0.25); }
      }
      [0, 1.5, 2.75].forEach((s, i) => {
        const ts = t0 + s * bat;
        if (ts < entrada || pausa(ts) || quebra(ts)) return;
        const prox = ACORDES_LOFI[acorde(b + 1)] || ch;
        oitoZeroOito(ts, ch.raiz, i === 2 ? bat * 1.1 : bat * 1.3, 1, i === 2 && prox.raiz !== ch.raiz ? prox.raiz : null);
        if (i === 0) kick(ts, 0.6);
      });
    }
  }

  // reverb de Schroeder no barramento send
  function reverb(inp, desloc) {
    const out = new Float32Array(N);
    const combs = [1557, 1617, 1491, 1422, 1277, 1356].map((d) => Math.round((d + desloc) * (SR / 44100)));
    combs.forEach((d) => {
      const buf = new Float32Array(d); let idx = 0, filt = 0;
      for (let i = 0; i < N; i++) {
        const y = buf[idx];
        filt = y * 0.7 + filt * 0.3;
        buf[idx] = inp[i] + filt * 0.8;
        out[i] += y / combs.length;
        idx = (idx + 1) % d;
      }
    });
    [556, 441, 341].map((d) => Math.round((d + desloc) * (SR / 44100))).forEach((d) => {
      const buf = new Float32Array(d); let idx = 0;
      for (let i = 0; i < N; i++) {
        const b = buf[idx], x = out[i];
        const y = -x + b; buf[idx] = x + b * 0.5; out[i] = y; idx = (idx + 1) % d;
      }
    });
    return out;
  }

  // mixa, aplica sidechain e limitador suave, normaliza e grava o WAV (16 bits, estéreo)
  function exportar(arquivo, { fadeOut = 1.4 } = {}) {
    const wetL = reverb(B.send.L, 0), wetR = reverb(B.send.R, 23);
    const duck = new Float32Array(N).fill(1);
    kicks.forEach((k0) => {
      const i0 = Math.round(k0 * SR), n = Math.round(0.45 * SR);
      for (let k = 0; k < n && i0 + k < N; k++) duck[i0 + k] = Math.min(duck[i0 + k], 1 - 0.55 * Math.exp(-(k / SR) * 9));
    });
    const outL = new Float32Array(N), outR = new Float32Array(N);
    let pico = 0;
    const iniFade = T.dur - fadeOut;
    for (let i = 0; i < N; i++) {
      const t = i / SR;
      const fadeIn = Math.min(1, t / 0.03), fo = 1 - Math.max(0, Math.min(1, (t - iniFade) / fadeOut));
      let l = B.main.L[i] + B.duck.L[i] * duck[i] + wetL[i] * 0.9;
      let r = B.main.R[i] + B.duck.R[i] * duck[i] + wetR[i] * 0.9;
      l = Math.tanh(l * 1.15) * fadeIn * fo; r = Math.tanh(r * 1.15) * fadeIn * fo;
      outL[i] = l; outR[i] = r; pico = Math.max(pico, Math.abs(l), Math.abs(r));
    }
    const ganho = 0.89 / pico;
    const dados = Buffer.alloc(N * 4);
    for (let i = 0; i < N; i++) {
      dados.writeInt16LE(Math.round(Math.max(-1, Math.min(1, outL[i] * ganho)) * 32767), i * 4);
      dados.writeInt16LE(Math.round(Math.max(-1, Math.min(1, outR[i] * ganho)) * 32767), i * 4 + 2);
    }
    const cab = Buffer.alloc(44);
    cab.write('RIFF', 0); cab.writeUInt32LE(36 + dados.length, 4); cab.write('WAVE', 8);
    cab.write('fmt ', 12); cab.writeUInt32LE(16, 16); cab.writeUInt16LE(1, 20); cab.writeUInt16LE(2, 22);
    cab.writeUInt32LE(SR, 24); cab.writeUInt32LE(SR * 4, 28); cab.writeUInt16LE(4, 32); cab.writeUInt16LE(16, 34);
    cab.write('data', 36); cab.writeUInt32LE(dados.length, 40);
    fs.mkdirSync(path.dirname(arquivo), { recursive: true });
    fs.writeFileSync(arquivo, Buffer.concat([cab, dados]));
    return { pico, ganho, bumbos: kicks.length };
  }

  return { SR, rnd, noise, mtof, write, writeStereo, kick, clap, hat, crash, bass, pad, pluck, chime, pop, click, whoosh, riser, thunk, rabisco, brilho, batida, queda, ACORDES, groove, ACORDES_LOFI, epiano, snare, sub, vinil, grooveLofi, stab, baixoHouse, chimbalAberto, shaker, grooveHouse, oitoZeroOito, caixaTrap, sino, grooveTrap, exportar };
};
