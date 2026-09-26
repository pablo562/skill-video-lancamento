# Trilha

Tudo é gerado por `motor/sintetizador.js`: osciladores, ruído, envelopes, reverb de Schroeder, sidechain do bumbo e limitador suave. Nenhum sample, nada para baixar. O `trilha.js` de cada projeto só faz o arranjo e posiciona os efeitos nos tempos do `tempos.js`.

```js
const T = require('./tempos.js');
const S = require('./motor/sintetizador.js')(T); // opções: { SR: 48000, semente: 424242 }
S.groove({ ... });            // cama musical
S.pop(T.cards[0], 480, 1000); // efeitos no tempo exato
S.exportar(path.join(__dirname, 'out', 'trilha.wav'));
```

A mesma semente e a mesma ordem de chamadas geram o mesmo WAV, byte a byte.

## Cama musical: `S.groove(opções)`

| Opção | O que faz |
|---|---|
| `acorde(b)` | Chave de `S.ACORDES` (`C`, `Am`, `F`, `G`) para o compasso `b` |
| `compassos` | Quantos compassos de 4 batidas (padrão: cabe em `T.dur`) |
| `introCompassos` | Compassos iniciais com pad mais baixo e ataque lento |
| `entrada` | Quando bumbo, palmas e baixo começam (o "drop", no título) |
| `hatsDe` | Quando entra o chimbal |
| `rajadaDe` | Daqui em diante, palmas em toda batida e baixo longo (energia da rajada) |
| `pausa(t)` | Batidas sem bateria: o respiro antes do momento principal |
| `arpejo(t)` | Quando toca o arpejo em semicolcheias |

Progressão que funcionou: intro F G, loop C Am F G, os dois compassos da rajada em F G (tensão) e o fechamento resolve em C, com `S.pad` longo e `S.bass` no `T.fim`.

## Cama lo-fi: `S.grooveLofi(opções)` (90 BPM)

Piano elétrico com tremolo, sub redondo, boom-bap com suingue nas colcheias e chiado de vinil. Boa para vitrine de produtos, um item por compasso.

| Opção | O que faz |
|---|---|
| `acorde(b)` | Chave de `S.ACORDES_LOFI` (`Dm9`, `G13`, `Cmaj9`, `Am9`, `Fmaj9`, `E7s9`) para o compasso `b` |
| `compassos` | Quantos compassos de 4 batidas |
| `entrada` | Quando a bateria entra; antes disso só piano |
| `swing` | Onde cai a colcheia de trás (0,5 reto, 0,6 padrão) |
| `pausa(t)` | Batidas sem bateria (use no fim para deixar o piano soar) |
| `so_piano(b)` | Compassos inteiros sem bateria |

Peças soltas: `S.epiano(t, notas, dur, g, pan)`, `S.snare(t, g)`, `S.sub(t, midi, dur, g)`, `S.vinil(t0, t1, g)` (chame uma vez para o vídeo todo).

Arranjo que funcionou: laço Dm9 G13 Cmaj9 Am9, os dois compassos sem bateria com piano reforçado (`epiano` com `g` 1,3 + `pad` baixo) e chimbal no segundo, drop em Cmaj9, fechamento G13 para Cmaj9. Em vez de pop em cada troca de cor, `S.pluck` com as notas do acorde uma oitava acima: a troca vira melodia. Peças caindo em fila tocam uma pentatônica subindo (60 62 64 67 69 72 74 + 12).

## Cama house: `S.grooveHouse(opções)` (120 a 128 BPM)

Acordes em stab sincopados (vozes de `ACORDES_LOFI`), shaker em semicolcheias, bumbo 4/4, palmas no 2 e 4, chimbal aberto e baixo plucado no contratempo. É a cama mais segura para institucional e premium (118 a 122 BPM).

| Opção | O que faz |
|---|---|
| `acorde(b)`, `compassos`, `inicio` | Como no `groove`; `inicio` alinha a grade a uma narração gravada |
| `entrada` | Quando entram bumbo, chimbal e baixo (antes disso só acordes e shaker) |
| `filtro(t)` | 0..1: abertura do filtro dos acordes (introdução abafada que abre até o drop) |
| `quebra(t)` | Sem bumbo, chimbal e baixo; palmas continuam (a "quebra" antes de voltar cheio) |
| `pausa(t)` | Silêncio total naquela batida |

Peças soltas: `S.stab(t, notas, dur, g, corte, pan)`, `S.baixoHouse(t, midi, dur, g)`, `S.chimbalAberto(t, g, pan)`, `S.shaker(t, g, pan)`. Laço que funcionou: Am9 Fmaj9 Dm9 E7s9, penúltimo compasso G13 e final Cmaj9.

## Cama trap-pop: `S.grooveTrap(opções)` (130 a 150 BPM, meio tempo)

808 saturado com queda de altura e glide para o próximo acorde, caixa (palma + caixa) no tempo 3, chimbal em colcheias com rajada de fusas no último tempo dos compassos ímpares, sino FM em arpejo. Cuidado: num institucional a 140 BPM soou apressado e foi trocado por house; guarde para peças de hype.

| Opção | O que faz |
|---|---|
| `acorde(b)`, `compassos`, `inicio` | Chaves de `ACORDES_LOFI`; laço que funcionou: Am9 Fmaj9 Cmaj9 G13, fechando Fmaj9 G13 Cmaj9 |
| `entrada` | Quando entram bateria e 808 (antes só o sino) |
| `quebra(t)` | Só caixa e sino (a frase-chave respira) |
| `pausa(t)`, `sinos(t0)` | Silêncio na batida; liga ou desliga o arpejo do compasso |

Peças soltas: `S.oitoZeroOito(t, midi, dur, g, deslizePara)`, `S.caixaTrap(t, g)`, `S.sino(t, midi, g, pan)`. O 808 conta como bumbo no sidechain. A abertura só com sino ficou baixa demais (-22 LUFS): dobre o sino duas oitavas acima e ponha chimbal e palmas no compasso antes do drop.

## Instrumentos (tempo em segundos, midi em número MIDI)

| Função | Som | Uso típico |
|---|---|---|
| `kick(t, g)` | Bumbo | Já vem no groove |
| `clap(t, g)` / `hat(t, g, pan)` | Palmas / chimbal | Já vêm no groove |
| `crash(t, g, dur)` | Prato estéreo | Drop, entrada de cena grande, fim |
| `batida(t, g)` | Bumbo + grave + ruído | Cada palavra da rajada, fim, entrada depois do respiro |
| `queda(t)` | Grave caindo | Junto com o drop |
| `riser(t0, t1, g)` | Subida de ruído | Os 0,5 a 1 s antes de uma virada |
| `whoosh(t, dur, g, panDe, panAte)` | Passagem de ar | Troca de cena, painel entrando, chicote (`g` 1,4) |
| `pop(t, f0, f1, g, pan)` | Bolha | Letra, card aparecendo (subir o tom a cada item), etapa |
| `click(t, g, pan, tom)` | Clique | Cursor, tecla digitada (tom aleatório 1900 a 2800), toque no celular (tom 1200) |
| `chime(t, midi, g, pan)` | Sino | Selo, cor trocada, pagamento aprovado (84 e depois 91), notificação (86 e 90) |
| `brilho(t, n, janela, g)` | Vários sininhos agudos | Confete, sucesso |
| `thunk(t, g)` | Batida seca grave | Carimbo, soltar algo arrastado |
| `rabisco(t0, t1)` | Lápis no papel | Traço sendo desenhado |
| `pad`, `bass`, `pluck` | Notas soltas | Acorde final, detalhes |

## Conferir sem ouvir

Não dá para ouvir. Confira assim:

```bash
ffmpeg -hide_banner -loglevel error -y -i out/trilha.wav -filter_complex "showwavespic=s=1920x360:colors=#E4262C,drawgrid=w=1920/36:h=360:color=#12121240" -frames:v 1 out/onda.png
ffmpeg -hide_banner -i out/trilha.wav -af ebur128=framelog=quiet -f null - 2>&1 | grep -E "I:|LRA:"
```

Com `drawgrid=w=1920/36` cada coluna é 1 s num vídeo de 36 s. Num vídeo por compassos, use `w=1920/<compassos>` para cada coluna ser um compasso. Os picos devem cair nos eventos do roteiro (carimbo, drop, respiro, rajada mais forte, fim). Volume integrado entre -13 e -14 LUFS.
