#!/usr/bin/env bash
# Cria um projeto de vídeo novo a partir da skill video-lancamento.
# Uso: bash <pasta-da-skill>/scripts/novo-video.sh <slug> [--vertical]
#   <slug>        nome da pasta do projeto (ex.: lancamento-agenda)
#   --vertical    9:16 (1080x1920) em vez de 16:9 (1920x1080)
# O projeto nasce em $VIDEOS_DIR/<slug> (padrão: a pasta atual). Nada é instalado fora dela, a não ser o
# Chromium do Playwright, que fica no cache do próprio Playwright.
set -euo pipefail

SKILL="$(cd "$(dirname "$0")/.." && pwd)"
SLUG="${1:?informe o slug, ex.: lancamento-agenda}"
# só letras, números, ponto, hífen e sublinhado: o slug vira nome de pasta e nome no package.json
[[ "$SLUG" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]] || { echo "Slug inválido: use só letras, números, ponto, hífen e sublinhado (ex.: lancamento-agenda)"; exit 1; }
VERTICAL="${2:-}"
DEST="${VIDEOS_DIR:-$PWD}/$SLUG"

if [ -e "$DEST" ]; then echo "Já existe: $DEST (escolha outro slug ou apague a pasta)"; exit 1; fi
command -v node >/dev/null || { echo "Precisa do Node 18 ou mais novo."; exit 1; }
# ffmpeg completo: o que vem com o Playwright só gera VP8, sem H.264 nem áudio
if ! ffmpeg -hide_banner -encoders 2>/dev/null | grep -q libx264; then
  echo "Precisa do ffmpeg com libx264. macOS: brew install ffmpeg  |  Debian/Ubuntu: sudo apt install ffmpeg"; exit 1
fi

mkdir -p "$DEST/out"
cp -R "$SKILL/motor" "$DEST/motor"
cp -R "$SKILL/assets" "$DEST/assets"
cp "$SKILL/modelo/"* "$DEST/"

cd "$DEST"
if [ "$VERTICAL" = "--vertical" ]; then
  # palco, canvas e render em 1080x1920; as cenas do modelo são 16:9 e precisam ser recompostas (ver referencias/narracao.md)
  sed -i.bak 's/    fps: 30,/    fps: 30, largura: 1080, altura: 1920,/' tempos.js && rm tempos.js.bak
  sed -i.bak 's|<canvas id="fx" width="1920" height="1080">|<canvas id="fx" width="1080" height="1920">|' index.html && rm index.html.bak
  sed -i.bak 's|<style>|<style>\n  #stage { width: 1080px; height: 1920px; }|' index.html && rm index.html.bak
fi
cat > package.json <<JSON
{ "name": "$SLUG", "private": true, "scripts": { "trilha": "node trilha.js", "folha": "node motor/render.js --folha", "render": "node trilha.js && node motor/render.js" } }
JSON
npm i --silent playwright@1.62.1
npx --yes playwright@1.62.1 install chromium >/dev/null
node -e "require('playwright')" && echo "Projeto pronto: $DEST"
echo "Próximos passos: preencher marca.css e marca.js, editar tempos.js e cena.js, depois: npm run folha  |  npm run render"
