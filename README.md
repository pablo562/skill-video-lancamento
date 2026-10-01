# video-lancamento

Skill do Claude Code para criar vídeos curtos de lançamento de produto ou recurso (30 a 50 s, 16:9 ou vertical 9:16, com ou sem narração) só com JavaScript, Playwright e ffmpeg. Cada quadro é função pura do tempo, a trilha é sintetizada em JavaScript (sem samples) e o resultado é um MP4 H.264 com áudio, igual a cada render.

*A Claude Code skill for short product-launch videos (16:9 or 9:16, optional narration) made with JavaScript, Playwright and ffmpeg, with a synthesized soundtrack. Docs are in Brazilian Portuguese.*

## Instalar

Como plugin (recebe atualizações):

```
/plugin marketplace add pablo562/skill-video-lancamento
/plugin install video-lancamento@video-lancamento
```

Ou copie a pasta `plugins/video-lancamento/skills/video-lancamento/` para `~/.claude/skills/` (vale em todos os seus projetos) ou para `.claude/skills/` de um repositório (vale só nele).

## Requisitos

- Node 18 ou mais novo
- ffmpeg com libx264: `brew install ffmpeg` (macOS) ou `sudo apt install ffmpeg` (Debian/Ubuntu)
- O script `novo-video.sh` instala o Playwright e o Chromium dele dentro do projeto do vídeo
- Narração (opcional): chave da ElevenLabs ou da OpenAI em variável de ambiente (`ELEVENLABS_API_KEY`, `OPENAI_API_KEY`). Os scripts não leem chave de arquivo. Confira se o seu plano de TTS permite uso comercial antes de publicar um vídeo com voz.

## Uso

Peça ao Claude Code algo como "faz um vídeo de lançamento da função X, 9:16, 45 s". A skill:

1. confere os fatos no código ou no material público do produto;
2. define o kit da marca (`marca.css`, `marca.js`) e o registro, divertido ou premium;
3. escreve o roteiro em batidas e cria o projeto com `scripts/novo-video.sh <slug> [--vertical]`;
4. monta as cenas, confere quadro a quadro na folha de contato e nas prévias;
5. sintetiza a trilha, renderiza e entrega o MP4 com a lista do que precisa ser confirmado antes de publicar.

Na mão:

```bash
bash ~/.claude/skills/video-lancamento/scripts/novo-video.sh meu-video   # ou --vertical
cd meu-video
npm run folha     # 24 quadros numa imagem, para conferir
npm run render    # trilha + vídeo em out/meu-video.mp4
```

## O que tem

- `motor/`: motor de cenas, legendas, cursor, confete e assinatura da marca; render com prévia e folha de contato; sintetizador com camas pop, lo-fi, house e trap, e um cardápio de 9 estilos de trilha (bossa, disco, afro, synthwave, funk, piano, violão, kalimba, bossa calma) em qualquer tom, com acordes por nome. `alternativas.js` monta a mesma imagem com outras trilhas sem novo render, e `cardapio.js` toca cada estilo sozinho para escolher de ouvido.
- `modelo/`: projeto inicial de 36 s que já renderiza.
- `narracao/`: voz por API, importação de voz gravada com alinhamento por palavra, mixagem com sidechain.
- `scripts/guias.sh`: guias do Reels (recorte 3:4 da grade do perfil e faixa segura do texto) sobre a folha de contato.
- `referencias/`: roteiro, acabamento premium (resumo do framework de @leomeethewoo, com link para o artigo), técnicas prontas, trilha (com o rodízio de estilos), registro das trilhas usadas e narração.

## Licença

Código sob MIT (ver `LICENSE`). Fontes Archivo e JetBrains Mono sob SIL Open Font License 1.1 (arquivos `OFL-*.txt` em `assets/fonts/`).
