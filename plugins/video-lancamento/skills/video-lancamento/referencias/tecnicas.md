# Técnicas prontas

Trechos para copiar para o `cena.js`. Todos são funções puras do tempo `t`, sobre os utilitários do motor
(`const { $, $$, lerp, E, P, bump } = M;`). Tempos sempre vindos do `tempos.js`.

## Texto

```js
// entra subindo com borrão que some e sai subindo; b = null fica na tela; x = prefixo de transform (ex.: 'translateX(-50%) ')
const linha = (el, t, a, b = null, d = 60, di = 0.5, x = '') => {
  const ki = P(t, a, a + di, E.outCubic), ko = b == null ? 0 : P(t, b, b + 0.35, E.inCubic);
  el.style.opacity = Math.min(1, ki * 1.5) * (1 - ko);
  el.style.transform = `${x}translateY(${(1 - ki) * d - ko * d}px)`;
  const bl = (1 - ki) * 12 + ko * 12;
  el.style.filter = bl > 0.4 ? `blur(${bl}px)` : 'none';
};
// palavras em sequência, com as chaves sobrepostas (cada uma começa antes de a anterior terminar)
// HTML: <div class="h"><span>Você</span> <span>cria</span> <span class="acc">arte.</span></div>, com .h span { display: inline-block }
const palavras = (sel, t, a, b = null, passo = 0.08, d = 60) =>
  $$(sel).forEach((s, i) => linha(s, t, a + i * passo, b == null ? null : b + i * 0.03, d));
// rótulo de passo ("01" em mono + título) rolando dentro de uma faixa com overflow: hidden
const rotulo = (el, t, a, b) => $$(':scope > div', el).forEach((d, i) => linha(d, t, a + i * 0.08, b == null ? null : b + i * 0.05, 230, 0.55));
// pílulas de legenda que se substituem no mesmo lugar (uma por passo da demonstração)
const legendas = (els, t, tempos, fim) => els.forEach((el, i) => {
  const a = tempos[i], b = i + 1 < tempos.length ? tempos[i + 1] - 0.12 : fim;
  const vis = t > a - 0.05 && t < (b ?? 1e9) + 0.5;
  el.style.display = vis ? 'flex' : 'none';
  if (vis) linha(el, t, a, b, 120, 0.5, 'translateX(-50%) ');
});
```

Número que conta até o valor (2 s na tela, pelo menos):

```js
const k = P(t, T.numero - 0.05, T.numero + 0.75, E.outCubic);
$('#grande').textContent = Math.round(48 * k) + 'h';
$('#grande').style.transform = `scale(${lerp(1.12, 1, k)})`;
```

## Trocas de cena

Cada cena é um `.t { position: absolute; inset: 0; overflow: hidden; isolation: isolate; }`. O `isolation` é obrigatório:
sem ele, um filho com `z-index` de uma cena anterior aparece por cima do fundo da cena seguinte.

```js
// empurrão vertical com borrão (entra de baixo, sai para cima)
function empurra(el, t, de, ate, entra, sai) {
  const ki = entra ? P(t, de - 0.15, de + 0.15, E.inOutCubic) : 1, ko = sai ? P(t, ate - 0.15, ate + 0.15, E.inOutCubic) : 0;
  const y = (1 - ki) * 1920 - ko * 1920, bl = (1 - ki) * 24 + ko * 24;
  el.style.transform = y ? `translateY(${y}px)` : 'none';
  el.style.filter = bl > 0.5 ? `blur(${bl}px)` : 'none';
}
// chicote lateral com borrão (impacto, troca rápida)
function chicote(el, t, de, ate, entra = true, sai = true) {
  const ki = entra ? P(t, de - 0.1, de + 0.08, E.outCubic) : 1, ko = sai ? P(t, ate - 0.08, ate + 0.1, E.inCubic) : 0;
  const x = (1 - ki) * 1150 - ko * 1150, bl = (1 - ki) * 30 + ko * 30;
  el.style.transform = `translateX(${x}px)`;
  el.style.filter = bl > 0.5 ? `blur(${bl}px)` : 'none';
}
// a próxima cena abre num círculo a partir de um ponto: o botão tocado, o pino do mapa, o centro do objeto
const circulo = (el, t, a, b, [x, y], r1 = 2300) => {
  el.style.clipPath = t < b ? `circle(${lerp(0, r1, P(t, a, b, E.inCubic))}px at ${x}px ${y}px)` : 'none';
};
```

### Transições por um objeto

- **O objeto vira a logo:** a peça encolhe até o ponto onde a assinatura vai nascer e some no instante em que o símbolo gira e entra (`M.animarAssinatura` começando uns 0,05 s antes do fim da saída). Use `transform-origin` no ponto de encontro.
- **O card vira a tela do celular:** o card encolhe e sobe até ocupar exatamente a área da prévia na tela do celular da cena seguinte (meça as duas caixas no `M.medir`), e a cena do celular aparece por cima em 0,2 s. A imagem é a mesma nos dois, então só a moldura do celular "nasce" em volta.
- **A tela vira o produto:** o inverso: a moldura do celular some e o card do produto começa no lugar e no tamanho da prévia, depois se acomoda.
- **A notificação vira o pedido:** a notificação vai ao centro e gira `perspective(1400px) rotateX(90deg)`; no instante em que fica de lado, a cena seguinte abre em círculo a partir dela e o cartão do pedido termina o giro de `-90deg` a `0`.
- **O ponto final vira portal:** troque o ponto da frase por um círculo (`<b id="ponto">` com `width: .2em; height: .2em; border-radius: 50%; background: var(--destaque)`), meça o centro dele com a frase já parada e escale a cena inteira a partir dali até a cor tomar a tela; a cena seguinte começa nessa cor e escurece.

```js
// no M.medir, com a frase já no lugar (renderize um instante depois da entrada dela)
M.renderCenas(T.fim - 0.9); const r = $('#ponto').getBoundingClientRect(); alvo.ponto = [r.left + r.width / 2, r.top + r.height / 2];
// na cena
const kp = P(t, T.fim - 0.8, T.fim, E.inCubic);
$('#tQ').style.transformOrigin = `${alvo.ponto[0]}px ${alvo.ponto[1]}px`;
$('#tQ').style.transform = kp > 0 ? `scale(${lerp(1, 90, kp)})` : 'none';
```

## 3D

```css
#roda { position: absolute; inset: 0; perspective: 1900px; perspective-origin: 540px 820px; }
#rodaIn { position: absolute; left: 540px; top: 990px; width: 0; height: 0; transform-style: preserve-3d; }
.card { position: absolute; left: -190px; top: -240px; width: 380px; height: 480px; backface-visibility: hidden; }
```

```js
// roda de cards que chega do fundo, gira 1,1 volta e para com o card 0 de frente
const rot = lerp(-405, 0, P(t, T.passo1 - 0.1, T.para, E.outCubic));
$('#rodaIn').style.transform = `translateZ(${lerp(-1800, 0, P(t, T.passo1 - 0.15, T.passo1 + 0.7, E.outCubic))}px)`;
cards.forEach((d, i) => { d.style.transform = `rotateY(${i * 45 + rot}deg) translateZ(520px)`; });
```

Celular em perspectiva: `#cel3d { perspective: 2200px }` e no filho `rotateY` indo de -9 a 7 graus ao longo da cena com `E.inOutSine`. Movimento lento e contínuo dá vida sem chamar atenção.

## Efeitos no canvas (`M.efeito`)

```js
// faíscas em estrela de 4 pontas (registro premium, no lugar do confete)
const FAG = (s, cores) => M.gerarConfete(40, s, { cores, v0: 560, dv: 820, abertura: Math.PI * 2, k0: 2.2, dk: 1.6 });
function estrela4(ctx, r) {
  ctx.beginPath(); ctx.moveTo(0, -r);
  ctx.quadraticCurveTo(r * 0.14, -r * 0.14, r, 0); ctx.quadraticCurveTo(r * 0.14, r * 0.14, 0, r);
  ctx.quadraticCurveTo(-r * 0.14, r * 0.14, -r, 0); ctx.quadraticCurveTo(-r * 0.14, -r * 0.14, 0, -r); ctx.fill();
}
function faisca(ctx, t, t0, [ox, oy], lista, cor, vida = 1.7) {
  const dt = t - t0; if (dt < 0 || dt > vida) return;
  const k = P(dt, 0, 0.7, E.outCubic);
  if (k < 1) { ctx.beginPath(); ctx.arc(ox, oy, lerp(50, 520, k), 0, Math.PI * 2); ctx.strokeStyle = `rgba(${cor},${(1 - k) * 0.6})`; ctx.lineWidth = 10 * (1 - k); ctx.stroke(); }
  const alfa = 1 - P(dt, vida * 0.6, vida);
  lista.forEach((p) => {
    const [x, y] = M.fisica([ox, oy, p.a, p.v], dt, 380, p.k);
    ctx.save(); ctx.globalAlpha = alfa; ctx.translate(x, y); ctx.rotate(p.rot + p.vr * dt * 0.2);
    ctx.fillStyle = p.c; estrela4(ctx, 5 + p.w * 0.7); ctx.restore();
  });
}
// toque de dedo na tela do celular: a sombra do dedo chega e o anel se abre
function toque(ctx, t, t0, [x, y], cor = '22,22,26') {
  const d = t - t0; if (d < -0.3 || d > 0.6) return;
  if (d < 0) { const k = P(d, -0.3, 0, E.outCubic); ctx.beginPath(); ctx.arc(x + (1 - k) * 80, y + (1 - k) * 120, 42, 0, Math.PI * 2); ctx.fillStyle = `rgba(${cor},${0.26 * k})`; ctx.fill(); return; }
  const k = P(d, 0, 0.5, E.outCubic);
  ctx.beginPath(); ctx.arc(x, y, lerp(38, 150, k), 0, Math.PI * 2); ctx.strokeStyle = `rgba(${cor},${0.55 * (1 - k)})`; ctx.lineWidth = 7; ctx.stroke();
}
// anel simples: pouso de um objeto, chegada num ponto do mapa
function anel(ctx, t, t0, [x, y], cor) {
  const d = t - t0; if (d < 0 || d > 0.8) return;
  const k = P(d, 0, 0.8, E.outCubic);
  ctx.beginPath(); ctx.arc(x, y, lerp(44, 200, k), 0, Math.PI * 2); ctx.strokeStyle = `rgba(${cor},${0.7 * (1 - k)})`; ctx.lineWidth = 6; ctx.stroke();
}
```

Pontos de toque em elementos que se movem (celular girando em 3D): meça no próprio instante, no `M.medir`:
`M.renderCenas(T.publicar); alvo.publicar = centro($('#btnPub')); M.renderCenas(0);`

## Câmera, vinheta e granulado

```html
<div id="vinheta"></div><div id="grao"></div>   <!-- depois do #mundo, antes do canvas -->
```
```css
#vinheta { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 46%, transparent 58%, rgba(0,0,0,.4) 100%); pointer-events: none; z-index: 20; }
#grao { position: absolute; inset: -40px; background-image: url('assets/img/grao.png'); mix-blend-mode: overlay; opacity: .07; pointer-events: none; z-index: 21; }
```
```js
// tranco: poucos e pequenos no registro premium (4 a 10 px), fortes no divertido (12 a 22 px)
const TRANCOS = [[T.drop, 8], [T.fim, 10]];
const VIN = { abertura: 0.7, demo: 0.25, fim: 0.8 };   // T.tomadas = { abertura: [0, 4], demo: [4, 20], ... }
M.efeito((ctx, t) => {
  let dx = 0, dy = 0;
  TRANCOS.forEach(([a, amp]) => { const d = t - a; if (d > 0 && d < 0.5) { const e = amp * Math.exp(-d * 11); dx += e * Math.sin(d * 58); dy += e * 0.6 * Math.cos(d * 47); } });
  $('#mundo').style.transform = dx || dy ? `translate(${dx}px, ${dy}px)` : 'none';
  const k = Object.keys(T.tomadas).find((n) => t >= T.tomadas[n][0] && t < T.tomadas[n][1]);
  $('#vinheta').style.opacity = k ? VIN[k] : 0.8;
  const r = M.rng(Math.floor(t * T.fps) * 7919 + 13);   // granulado muda a cada quadro, sempre igual no mesmo quadro
  $('#grao').style.backgroundPosition = `${Math.floor(r() * 400)}px ${Math.floor(r() * 400)}px`;
});
```

## Armadilhas

- **Determinismo:** nada de animação CSS, `Date`, `requestAnimationFrame` ou `Math.random`. Use `M.P`, `M.bump`, `M.rng(seed)`.
- **Medir cena escondida:** `getBoundingClientRect` dá zero com `display: none`. No `M.medir`, chame `M.renderCenas(t)` num instante em que a cena está visível e parada, meça e volte com `M.renderCenas(0)`.
- **Alvo indefinido no `M.medir`:** o `renderCenas` roda as cenas antes de você terminar de medir; proteja com `(alvo.x || [540, 960])`.
- **Elemento coberto:** a ordem no DOM decide quem fica por cima entre cenas; confira na folha.
- **Faíscas e confete são globais:** o canvas `#fx` fica por cima de todas as cenas. Encurte a vida das partículas quando a cena troca logo depois.
- **Filtro `blur` pesa no render.** Use só durante a entrada e a saída (volte para `filter: none` quando parado).
- **Refatorar o motor:** antes, salve quadros de referência; depois compare com `ffmpeg -i a.png -i b.png -lavfi psnr -f null -` (PSNR infinito = idêntico). Para a trilha, compare o `md5` do WAV.
