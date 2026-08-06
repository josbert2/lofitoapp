#!/bin/bash
# Descarga todos los assets desde el mirror vivo a ./assets-download/
BASE="https://lofi.vexcited.com/large"
OUT="/home/jos/dev/lofitoapp/assets-download"
CURL="/usr/bin/curl"
MKDIR="/usr/bin/mkdir"
DIRNAME="/usr/bin/dirname"

dl () { # $1 = subpath bajo BASE, guarda en OUT/$1
  local rel="$1"
  local dest="$OUT/$rel"
  "$MKDIR" -p "$("$DIRNAME" "$dest")"
  local code
  code=$("$CURL" -s -o "$dest" -w "%{http_code}" --max-time 300 "$BASE/$rel" 2>/dev/null)
  if [ "$code" != "200" ] && [ "$code" != "206" ]; then
    "/usr/bin/rm" -f "$dest"
    echo "FAIL[$code] $rel"
  fi
}

echo "=== VIDEOS ==="
n=0; while IFS= read -r p; do dl "scenes/$p"; n=$((n+1)); [ $((n%20)) -eq 0 ] && echo "  videos $n..."; done < /tmp/vids.txt
echo "=== EFECTOS ==="
while IFS= read -r e; do dl "effects/$e.mp3"; done < /tmp/effects.txt
echo "=== TRACKS ==="
n=0; while IFS= read -r t; do dl "$t"; n=$((n+1)); [ $((n%20)) -eq 0 ] && echo "  tracks $n..."; done < /tmp/tracks.txt
echo "=== WALLPAPERS ==="
while IFS= read -r w; do dl "wallpapers/$w"; done < /tmp/wallpapers.txt
echo "=== DONE ==="
