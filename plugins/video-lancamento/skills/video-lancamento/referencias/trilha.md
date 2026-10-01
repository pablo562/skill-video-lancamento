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

## Estilos e rodízio (`motor/estilos.js`)

Se todo vídeo usar a mesma cama, todos soam iguais. O `motor/estilos.js` estende o sintetizador sem mexer nele (as camas antigas continuam idênticas byte a byte) e traz um cardápio de estilos, cada um com tom, acordes, instrumentos e desenho rítmico próprios. O acorde é escrito por nome (`F#m9`, `Bbmaj7`, `E7#9`, `A13`, `C7sus4`, `C/E`) e as vozes andam o mínimo de um acorde para o outro.

```js
const S = require('./motor/estilos.js')(T);
const ESTILO = process.env.ESTILO || 'bossa';
const cama = S.cama(ESTILO, { compassos, entrada: T.drop, quebra, pausa, filtro, fim: T.marcaFim, final: T.marcaFim });
S.pluck(t, cama.nota(72)); // efeito com altura sempre por cama.nota(): leva o Dó do efeito para o tom do estilo
S.exportar(arq, { fadeOut: 1.2, lufs: -14 }); // mede com ebur128, ajusta o volume integrado e limita o pico
```

| Estilo | BPM | Registro | Clima | Tom e acordes padrão |
|---|---|---|---|---|
| `bossa` | 110 a 124 | premium | violão na batida de bossa, aro na clave, ganzá, surdo, baixo de dedo; `eletronico: true` põe bumbo 4/4 discreto | Ré: Em9 A13 Dmaj9 B7b9 |
| `disco` | 116 a 124 | divertido | guitarra abafada em semicolcheias, baixo em oitavas, cordas, metais antecipando | Mi dórico: Em9 A9 Em9 A9 Cmaj9 Bm7 Am9 B7#9 |
| `afro` | 112 a 122 | os dois | ganzá com suingue, congas, piano elétrico no contratempo, log drum, marimba | Fá menor: Fm9 Dbmaj9 Bbm9 C7sus4 |
| `synthwave` | 100 a 118 | os dois | bumbo no 1 e 3, caixa com gate, baixo galopando, cordas largas, arpejo com eco | Fá# menor: F#m D A E |
| `funk` | 125 a 130 | divertido | tamborzão com 808 e tambor, palma no 2 e 4, gancho de voz sintética | Sol menor: Gm Gm Eb F |
| `piano` | 60 a 90 | calmo | piano de feltro, oitava no grave, cordas lentas; sem bateria | Mi bemol: Ebmaj9 Bb/D Cm9 Abmaj9 |
| `violao` | 76 a 104 | calmo | violão dedilhado, ganzá, vassourinha, bumbo macio, baixo de dedo | Sol: G D/F# Em7 Cmaj7 |
| `kalimba` | 80 a 104 | calmo | ostinato de kalimba com respiros, pad morno, aro no 3, bumbo macio | Mi: Emaj7 C#m7 Amaj7 B6 |
| `bossa-calma` | 90 a 118 | calmo | a bossa sem bumbo eletrônico: violão, aro, ganzá e surdo | Fá: Gm9 C13 Fmaj9 D7b9 |
| `house`, `pop`, `lofi` | como as camas antigas | lo-fi é calmo | as camas antigas, pelo mesmo `S.cama` | Dó |

Estilos calmos usam um bumbo macio que não entra no sidechain. Numa grade rápida (vídeo cortado a 120 BPM), o piano e a kalimba soam em meio tempo; eles funcionam melhor em vídeos cortados a 70 a 100 BPM.

**Como escolher:**

| Vídeo | Energia | Estilos | Andamento |
|---|---|---|---|
| Lançamento de recurso ou produto, anúncio, Reels, rajada de recursos | agitado | bossa, disco, afro, synthwave, funk, house, pop | 115 a 130 BPM |
| Institucional, premium, manifesto, tutorial, vídeo com narração | calmo | piano, violão, kalimba, bossa calma, lo-fi | 70 a 100 BPM |

- **Rodízio:** cada vídeo novo usa estilo, tom e acordes diferentes dos três últimos. Anote cada vídeo em `referencias/trilhas-usadas.md`, com a reação de quem pediu.
- **Andamento antes do roteiro:** a energia define o BPM, e o BPM define o corte do vídeo inteiro (`tempos.js`).
- **Lançamento pede música animada.** Uma trilha calma num anúncio de lançamento tende a ser recusada.
- **Opções comuns de `S.cama`:**
  - `acorde(b)` devolve o NOME do acorde do compasso;
  - `tom` transpõe tudo em semitons;
  - `entrada` marca onde entram bateria e grave;
  - `quebra(t)` tira bumbo e grave;
  - `pausa(t)` silencia a batida;
  - `filtro(t)` (0 a 1) controla o brilho da harmonia;
  - `fim` resolve na tônica a partir desse instante;
  - `final` toca o acorde longo do fechamento.
- **Não deixe a introdução de um lançamento muito tempo sem bumbo.** Com a `entrada` no drop dos 10 s, a introdução fica uns 10 dB abaixo do corpo. Ponha a `entrada` nos primeiros segundos, ou some bumbo, chimbal e palma à mão até ela, e marque o drop com um tempo de `pausa`, crash e metais.
- **Quebra pelo índice do compasso** (`Math.floor(t / C + 1e-3) === n`), não por comparação de segundos. Um arredondamento de 2 ms joga a quebra um compasso para o lado.
- **Instrumentos soltos:**
  - `S.corda` e `S.rasgado` (violão e guitarra por Karplus-Strong);
  - `S.baixoDedo`, `S.metais`, `S.cordas`, `S.marimba`, `S.logDrum`;
  - `S.conga`, `S.tamborim`, `S.agogo`, `S.surdo`, `S.aro`;
  - `S.caixa80`, `S.lead`, `S.voz(t, midi, dur, 'a'|'o'|'e'|'u')`;
  - `S.piano`, `S.kalimba`, `S.vassoura`, `S.bumboMacio`.

**Alternativas sem novo render:** o `trilha.js` do modelo aceita `ESTILO=<estilo>` e grava `out/trilha-<estilo>.wav` no mesmo volume. `node motor/alternativas.js afro bossa [--trecho 4 14]` monta `out/<saida>-<estilo>.mp4` com a mesma imagem (`-c:v copy`) e `out/vitrine-trilhas.mp4`, com 10 s de cada trilha em sequência. Na entrega, mande duas alternativas: uma com a mesma energia e uma com a outra.

**Cardápio audível:** `node motor/cardapio.js piano violao kalimba bossa-calma lofi [--segundos 16]` toca cada estilo sozinho no andamento natural dele, com uma cartela de nome, clima e BPM, em `out/cardapio.mp4`. Serve para escolher de ouvido antes de começar.

**Curva de energia sem ouvir:** meça cada trecho. Num lançamento, a introdução fica até uns 3 dB abaixo do corpo, e a quebra de 6 a 7 dB abaixo.

```bash
for par in 0:4 4:10 10:32 32:36 36:40; do a=${par%%:*}; b=${par##*:}; printf "%s a %s s:" $a $b; ffmpeg -hide_banner -nostats -ss $a -to $b -i out/trilha.wav -af ebur128 -f null - 2>&1 | grep -E "^\s+I:"; done
```

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
