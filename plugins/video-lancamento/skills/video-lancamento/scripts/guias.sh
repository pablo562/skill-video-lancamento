#!/usr/bin/env bash
# Folha de contato com as guias do Reels (vídeo 1080x1920): recorte 3:4 da grade do perfil (ciano, y 240 a 1680),
# faixa segura para texto (amarelo, y 260 a 1480) e coluna de ícones da direita (magenta).
# Uso, na pasta do projeto, depois de node motor/render.js --folha:  bash <pasta-da-skill>/scripts/guias.sh
set -e
F="drawbox=x=0:y=240:w=iw:h=5:color=cyan@0.9:t=fill,drawbox=x=0:y=1675:w=iw:h=5:color=cyan@0.9:t=fill,drawbox=x=0:y=260:w=iw:h=3:color=yellow@0.9:t=fill,drawbox=x=0:y=1480:w=iw:h=3:color=yellow@0.9:t=fill,drawbox=x=960:y=1100:w=4:h=600:color=magenta@0.9:t=fill"
ffmpeg -hide_banner -loglevel error -y -framerate 1 -i out/folha/%02d.jpg -vf "$F,scale=240:-1,tile=8x3:padding=6:color=white" -frames:v 1 out/folha-guias.png
echo out/folha-guias.png
