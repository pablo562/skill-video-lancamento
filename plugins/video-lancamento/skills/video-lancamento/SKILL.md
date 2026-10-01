---
name: video-lancamento
description: Cria vídeos curtos de lançamento de produto ou recurso (30 a 50 s, 16:9 ou vertical 9:16 para Reels e TikTok, com ou sem narração) só com JavaScript, Playwright e ffmpeg. Cada quadro é função do tempo, a trilha é sintetizada em JavaScript, sem samples. Use quando pedirem "um vídeo de lançamento", "vídeo da novidade X", "vídeo pra anunciar a feature Y", "teaser", "vídeo institucional", "vídeo 9:16", "Reels", "com narração/locução", ou qualquer vídeo curto animado sobre um produto, mesmo sem citar a skill.
---

# Vídeo de lançamento

Pipeline pronto: uma página HTML onde cada quadro é função pura do tempo (`window.renderAt(t)`), o Playwright captura os quadros e manda por pipe para o ffmpeg, e a trilha é sintetizada em JavaScript. O resultado é um MP4 H.264 com áudio, sempre igual quadro a quadro.

## O que tem aqui

| Pasta | Para quê |
|---|---|
| `motor/` | Igual em todo vídeo: `motor.js` (cenas, legendas, cursor, confete, assinatura da marca), `base.css`, `icones.js`, `render.js` (render, prévia e folha de contato), `sintetizador.js` (camas pop, lo-fi, house e trap, efeitos), `estilos.js` (cardápio de 9 estilos de trilha em qualquer tom), `alternativas.js` (a mesma imagem com outras trilhas, sem novo render) e `cardapio.js` (cada estilo tocando sozinho, para escolher de ouvido) |
| `modelo/` | Ponto de partida que já renderiza (16:9, 36 s): gancho, título com a assinatura, demonstração num navegador com cursor, rajada de 8 recursos, fechamento. `marca.css` e `marca.js` são o kit da marca |
| `narracao/` | `falas.js` (texto), `narrar.js` (voz por API, ElevenLabs ou OpenAI), `importar.js` (voz gravada no site), `mixar.js` (voz + música com sidechain) |
| `referencias/` | `roteiro.md`, `premium.md` (framework Apple), `tecnicas.md` (trechos prontos), `trilha.md` (sintetizador e estilos), `trilhas-usadas.md` (registro do rodízio), `narracao.md` (vertical e voz) |
| `assets/` | Fontes Archivo e JetBrains Mono offline (licença OFL) e a textura de granulado |
| `scripts/novo-video.sh` | Cria o projeto numa pasta nova, instala o Playwright e confere o ffmpeg |
| `scripts/guias.sh` | Folha de contato com as guias do Reels (recorte 3:4 da grade, faixa segura do texto, ícones) |

## Requisitos

Node 18 ou mais novo, ffmpeg com libx264 (`brew install ffmpeg` no macOS, `apt install ffmpeg` no Debian/Ubuntu). O script instala o Playwright e o Chromium dele. Narração: uma chave da ElevenLabs ou da OpenAI em variável de ambiente (`ELEVENLABS_API_KEY`, `OPENAI_API_KEY`), nunca num arquivo do projeto.

## Fluxo

1. **Entender a novidade e checar os fatos.** Leia o código ou o material público do produto para saber o que existe de verdade: nomes de telas, botões, planos. Cada frase do vídeo precisa ter uma fonte. Armadilhas de copy em `referencias/roteiro.md`.
2. **Definir o kit e o registro.** Preencha `marca.css` (3 cores, par de fontes) e `marca.js` (nome, site, logo). Escolha o registro: divertido ou premium (`referencias/premium.md`). Escolha o estilo e o BPM da trilha.
3. **Escrever o roteiro** em tabela de batidas (cena, tempo, o que aparece, legenda, som). Estrutura padrão em `referencias/roteiro.md`. Uma tomada = uma ideia.
4. **Criar o projeto:** `bash <pasta-da-skill>/scripts/novo-video.sh <slug>` (acrescente `--vertical` para 9:16). O projeto nasce em `$VIDEOS_DIR/<slug>` ou na pasta atual.
5. **Editar** `tempos.js` (todos os instantes, compartilhados com a trilha), o `R` no topo de `cena.js` (textos) e reescrever a cena 3 (demonstração). Copie trechos de `referencias/tecnicas.md` em vez de inventar do zero.
6. **Conferir o visual antes de renderizar:** `node motor/render.js --folha` gera 24 quadros numa imagem só. Para momentos críticos (clique, troca de cena, legenda entrando), `node motor/render.js --previa 13.1 17.6`, e junte as prévias num mosaico com `xstack` do ffmpeg. Passe as quatro perguntas de `premium.md` em cada quadro. É aqui que o vídeo fica bom.
7. **Trilha:** escolha o estilo pelo rodízio (`referencias/trilhas-usadas.md`: diferente dos três últimos vídeos) e pela energia do vídeo (`referencias/trilha.md`), ponha em `PADRAO` no `trilha.js` e rode `node trilha.js`. Para ouvir opções antes, `node motor/cardapio.js disco afro bossa`. Confira sem ouvir: `ffmpeg -i out/trilha.wav -filter_complex "showwavespic=s=1920x360,drawgrid=w=1920/<compassos>:h=360:color=black@0.25" -frames:v 1 out/onda.png` (picos devem cair nos eventos) e `ebur128` (alvo perto de -13 a -14 LUFS; introdução por volta de -16 a -18).
8. **Render final:** `node motor/render.js` (de 2 a 40 min, conforme o peso da página e a duração). Saída `out/<slug>.mp4`, H.264 CRF 15 + AAC 256k. Extraia quadros das transições do próprio MP4 (`select='eq(n\,111)+...',tile=4x3`) para confirmar.
9. **Entregar:** caminho do MP4, duas alternativas de trilha na mesma imagem (`ESTILO=afro node trilha.js` e depois `node motor/alternativas.js afro bossa`, uma com a mesma energia e uma com a outra), o roteiro em poucas linhas e a lista de afirmações que alguém deve confirmar antes de publicar (recurso de plano pago, recurso ainda em desenvolvimento, número de exemplo). Se você não consegue ouvir áudio, diga isso ao falar da trilha e liste os efeitos por trecho.

## Régua de qualidade

- Tomadas diferentes entre si (close, 3D, tipografia gigante, interface em perspectiva), não uma sequência de slides.
- Transições com ideia, ligando as cenas por um objeto (ver `tecnicas.md`).
- Ritmo que dá para ler: cada frase ou adesivo com pelo menos 1 s sozinho na tela, número grande com pelo menos 2 s, cena com muitos passos de 6 a 8 s. Vídeo sem narração pode ir a 45 a 50 s.
- Trilha com arranjo: introdução abafada, drop na palavra-chave, quebra e volta. Institucional e premium entre 115 e 123 BPM; trap a 140 soa apressado num institucional.
- **Música que varia:** cada vídeo com estilo, tom e acordes diferentes dos três últimos; a energia segue o vídeo (agitado para lançamento e anúncio, calmo para institucional, premium e narração). Lançamento com trilha calma tende a ser recusado.
- Na dúvida entre duas trilhas, entregue as duas sobre a mesma imagem (mesmo BPM, ffmpeg com `-c:v copy`, sem novo render): `motor/alternativas.js` faz isso.
- **Um público só:** toda frase fala com a mesma pessoa (quem vende OU quem compra, quem usa OU quem decide). O que muda para o outro lado entra como ganho de quem você está falando. Roteiro que alterna públicos soa confuso.

## Estilo

- Todo corte, clique, pop e troca cai numa batida. A trilha e as cenas leem o mesmo `tempos.js`. Para outro BPM, derive tudo de `B` (batida) e `C` (compasso) com `c(n)` (início do compasso n), sem segundos soltos.
- **Reels e TikTok (9:16):** o que importa fica entre y 260 e 1480 no quadro de 1080x1920. Assim cabe no recorte 3:4 da grade do perfil (y 240 a 1680) e fica longe da interface do aplicativo (ícones à direita, legenda embaixo). Confira com `bash <pasta-da-skill>/scripts/guias.sh` depois da folha.
- Legenda curta (3 a 6 palavras), uma palavra na cor de destaque com `[palavra]`. Entre o fim de uma legenda e a próxima, pelo menos 0,45 s.
- Nada parado por mais de 1,5 s: rotação lenta, contador, leve aproximação da câmera.
- Assinatura da marca no título e no fechamento com `M.assinatura` e `M.animarAssinatura`: com a logo do kit ou, sem imagem, um selo com a inicial e o nome em texto. Não amplie a logo acima do tamanho da imagem.
- Produto de verdade na tela: telas no desenho real do produto, nomes reais de recursos. Marca, cliente e pedido de exemplo são fictícios.

## Armadilhas já vividas

- **Determinismo:** nada de animação CSS, `Date`, `requestAnimationFrame` ou `Math.random`. Use `M.P`, `M.bump`, `M.rng(seed)`.
- **Cenas sobrepostas:** dê `isolation: isolate` a cada cena, senão filhos com `z-index` vazam por cima da cena seguinte.
- **Cursor:** as posições são calculadas no `prep`, no instante de cada ponto. O alvo precisa estar visível e parado naquele instante.
- **Medir cena escondida:** `getBoundingClientRect` dá zero com `display: none`. No `M.medir`, renderize o instante certo com `M.renderCenas(t)`, meça e volte a `M.renderCenas(0)`.
- **Medir texto com a fonte do kit:** o `M.medir` só espera as fontes listadas em `M.fontes`. Com uma fonte própria do kit, faça `M.fontes.push("400 104px 'Minha Fonte'")` no topo do `cena.js`; senão a medida sai com a fonte reserva e uma seleção ou sublinhado começa no meio da palavra.
- **ffmpeg:** o do Playwright só tem VP8. Use o ffmpeg completo do sistema.
- **Disco:** os quadros vão por pipe. Nunca grave milhares de PNGs.

## Referências

- `referencias/roteiro.md`: estrutura padrão, regras de copy, checagem de fatos.
- `referencias/premium.md`: framework Apple para vídeo com cara de caro (kit, design primeiro, easing e transições, tabela de BPM, som com motivo).
- `referencias/tecnicas.md`: trechos prontos de texto, trocas de cena, transições por objeto, 3D, faíscas, câmera, vinheta, granulado.
- `referencias/trilha.md`: API do sintetizador, as quatro camas, o cardápio de estilos, rodízio, alternativas e mapa evento para som.
- `referencias/trilhas-usadas.md`: registro de cada vídeo para o rodízio.
- `referencias/narracao.md`: formato vertical, voz por API ou gravada, tempo por palavra, legendas sincronizadas e mixagem.
- `motor/motor.js`: a API está documentada no topo do arquivo.
