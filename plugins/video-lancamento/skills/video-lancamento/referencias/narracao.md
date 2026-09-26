# Narração e vídeo vertical

## Vertical 9:16

- `novo-video.sh <slug> --vertical` já ajusta palco, canvas e render para 1080x1920. As cenas do `modelo/` são desenhadas para 16:9: recomponha cada tomada no quadro vertical (objeto no centro, texto em cima, legenda embaixo).
- No `tempos.js`: `largura: 1080, altura: 1920`. O `render.js` usa esses valores no viewport, no recorte e na folha (8x3 no vertical).
- No `index.html`: `#stage { width: 1080px; height: 1920px; }` e `<canvas id="fx" width="1080" height="1920">`.
- Zona segura do Reels e do TikTok: nada importante acima de 220 px nem abaixo de 1520 px; os ícones do app ocupam a direita entre 1100 e 1700. Legendas por volta de `top: 1470px`, centralizadas.

## Voz por API

Copie `narracao/narrar.js`, `narracao/falas.js` e `narracao/mixar.js` para a raiz do projeto e escreva as falas em `falas.js`. O `narrar.js` gera cada fala por TTS e guarda o tempo de cada palavra. ElevenLabs é o padrão; a OpenAI fica como alternativa (`--openai`).

```bash
export ELEVENLABS_API_KEY=...            # só na sessão do terminal; nunca grave a chave num arquivo do projeto
node narrar.js --vozes                   # vozes da conta e da biblioteca em português
node narrar.js --amostras id1,id2,id3    # a primeira fala com cada voz em narracao/amostras/
node narrar.js --usar <voice_id>         # escolhe a voz (adiciona à conta se vier da biblioteca)
node narrar.js --tudo                    # gera todas as falas
```

- A chave da ElevenLabs começa com `sk_`. O que aparece na lista de chaves do site é o ID da chave e dá erro `invalid_api_key`.
- Em setembro de 2026, o plano gratuito da ElevenLabs não usava vozes da biblioteca pela API (erro 402 `paid_plan_required`) e não dava licença comercial. As vozes nativas brasileiras estão na biblioteca. Confira o plano antes de publicar um vídeo com voz.
- Tempo por palavra vem da própria ElevenLabs (`/with-timestamps`, tempo por caractere); `previous_text` e `next_text` mantêm a entonação contínua entre as falas.
- **Pronúncia:** a legenda usa `texto` e a voz lê `fala`. Nomes de marca em outra língua costumam precisar de grafia fonética ("ponto com ponto bê érre" para `.com.br`). Confira transcrevendo as amostras.

## A voz manda na linha do tempo

- O `narracao.js` gerado serve à página e à trilha: no `index.html`, carregue `<script src="narracao.js"></script>` antes do `tempos.js`; no `tempos.js`, leia `const N = typeof module !== 'undefined' ? require('./narracao.js') : root.NARRACAO;`.
- `tempos.js` fixa onde cada fala entra e ancora eventos nas palavras. Exemplo: `f2: drop - N.f2.palavras[4].a` põe a quinta palavra da fala 2 exatamente no drop.
- Entre uma fala e a próxima, deixe pelo menos 0,3 s depois do fim da última palavra.
- Legendas palavra a palavra: 2 a 4 palavras por tela, palavra atual destacada, palavras ainda não ditas em 40%. Esconda a legenda quando o mesmo nome já está grande na tela. Confira nas transições que ela não fica branca sobre fundo claro.
- Para alinhar a música à voz, `S.groove`, `S.grooveHouse` e as outras camas aceitam `inicio`: o segundo em que cai o compasso 0.

## Mixagem

Exporte a música do `trilha.js` em `out/musica.wav` (`S.exportar(path.join(__dirname, 'out', 'musica.wav'))`), declare `T.falas = { f1: 0.4, f2: 3.1, ... }` no `tempos.js`, copie `narracao/mixar.js` para a raiz e rode `node mixar.js`. Ele monta `out/voz.wav` (adelay por fala, highpass, compressor leve) e grava `out/trilha.wav` com a música abaixando sob a voz:

- **Sidechain:** `sidechaincompress=threshold=0.035:ratio=4` com a música a 0,6 e `loudnorm=I=-14` no fim. A música abaixada deve ficar de 7 a 10 dB abaixo da voz; com ratio 7 ela sumia.
- **Envelope pelos tempos das falas:** quando o sidechain abaixa a música de forma diferente em cada frase (timbres diferentes entre as frases), monte um envelope com os tempos: -9 dB durante cada fala, rampa de 0,15 s na entrada e de 0,35 s na saída, aplicado com `amultiply`. Fica de 7 a 9 dB de diferença em todas as cenas.
- **Volume por fala:** frases de uma mesma gravação variam até 5 dB. Leve cada uma a -16 LUFS antes de montar, depois compressor leve, ganho e `alimiter` (sem ele o ganho estoura 0 dBFS).
- **Trilha para voz:** gere uma versão da música sem os efeitos que brigam com a fala (pop por palavra, teclado, tiques) e com o fechamento mais baixo.

## Voz gravada no site da ElevenLabs

O site gera com vozes da biblioteca que a API do plano gratuito recusa, e uma tomada inteira soa mais natural que falas separadas.

```bash
export ELEVENLABS_API_KEY=...
node importar.js narracao/gravada/tomada.mp3 [--velocidade 1.1]   # corta nos silêncios, alinha cada palavra, grava narracao/f1..fN.wav e narracao.js
node trilha.js && node mixar.js --musica 0.72 && node motor/render.js
```

- Texto para colar no site: escrito como se fala. A legenda usa a grafia certa, em `falas.js` (campo `fala` = como a voz leu).
- Tempo por palavra: `POST /v1/forced-alignment` da ElevenLabs, com o texto que a voz leu (funcionava no plano gratuito em setembro de 2026). A transcrição do whisper adiantava até 0,3 s o começo das frases.
- Corte entre frases: no silêncio (silencedetect -38 dB, 0,12 s) que começa depois do início da última palavra da frase.
- **O modelo v3 do site pode pular frases ou parágrafos inteiros.** Antes de alinhar, transcreva com `POST /v1/speech-to-text` (`model_id=scribe_v1`, `language_code=por`) e compare com o texto. Se faltar frase, gere a tomada inteira de novo no site: a voz fica com a mesma energia do começo ao fim.
- Ritmo: `--velocidade 1.06` a `1.12` (atempo, o tom não muda) resolve narração lenta. No site, o controle de velocidade em 1,1 dá o mesmo ritmo com som mais natural.
- Narração sobre um vídeo já pronto: a imagem não muda. Cada fala entra na sua cena, ancorada por uma palavra num instante do `tempos.js`, e o áudio novo vai para o MP4 com `-c:v copy`, sem novo render. Um parágrafo por cena, medido pela janela da cena (cerca de 3 palavras por segundo).
- macOS: o terminal pode não ter permissão de ler `~/Downloads` ("Operation not permitted"). Arraste o MP3 para a pasta do projeto.
