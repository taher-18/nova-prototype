#!/usr/bin/env bash
# Generates the Nova app icon, Android adaptive icon layers and splash image
# with ImageMagick. A placeholder mark until a designer makes the real logo.
# Usage: bash scripts/make-icons.sh
set -euo pipefail
cd "$(dirname "$0")/../assets"
BG='#0E0F13'; ORANGE='#FF6B35'; SPARK='#FFD166'

# The "N" and spark on a 1024 canvas, scaled/offset per output.
mark() { # $1 = scale, $2 = offset x, $3 = offset y, $4 = N colour, $5 = spark colour
  local s=$1 ox=$2 oy=$3 n=$4 k=$5
  p() { echo "$(( ox + $1 * s / 100 )),$(( oy + $2 * s / 100 ))"; }
  echo "fill $n polygon $(p 300 300) $(p 405 300) $(p 405 724) $(p 300 724)"
  echo "fill $n polygon $(p 619 300) $(p 724 300) $(p 724 724) $(p 619 724)"
  echo "fill $n polygon $(p 300 300) $(p 405 300) $(p 724 724) $(p 619 724)"
  echo "fill $k polygon $(p 790 170) $(p 812 238) $(p 880 260) $(p 812 282) $(p 790 350) $(p 768 282) $(p 700 260) $(p 768 238)"
}

convert -size 1024x1024 xc:"$BG" -draw "$(mark 100 0 0 "$ORANGE" "$SPARK")" icon.png
convert -size 1024x1024 xc:none -draw "$(mark 70 154 154 "$ORANGE" "$SPARK")" splash-icon.png
convert -size 512x512 xc:"$BG" android-icon-background.png
# Adaptive icons crop to the centre ~66%, so keep the mark small.
convert -size 512x512 xc:none -draw "$(mark 30 102 102 "$ORANGE" "$SPARK")" android-icon-foreground.png
convert -size 432x432 xc:none -draw "$(mark 26 82 82 white white)" android-icon-monochrome.png
convert icon.png -resize 48x48 favicon.png
echo "Icons written to $(pwd)"
