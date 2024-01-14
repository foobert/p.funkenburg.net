#!/bin/bash
set -euo pipefail
shopt -s nullglob

function tpl {
  local input=$1.tpl
  local output=tmp/$1.sh
  if [ ! "$output" -nt "$input" ]; then
    echo "$output"
    mkdir -p tmp
    ./bash-tpl "$input" > "$output"
  fi
}

function html {
  local input=tmp/$1.sh
  local output=output/$2
  if [ ! "$output" -nt "$input" ] || [ "$ALBUMS/meta.sh" -nt "$output" ]; then
    echo "$output"
    mkdir -p "$(dirname "$output")"
    bash "$input" > "$output"
  fi
}

function copy {
  local input=$1
  local output=output/$2
  if [ ! "$output" -nt "$input" ]; then
    echo "$output"
    cp "$input" "$output"
  fi
}

function thumbnail {
  input="$1"
  output="output/$2/t_$(basename "$1")"
  if [ ! "$output" -nt "$input" ]; then
    echo "$output"
    magick "$input" -thumbnail 600 "$output"
  fi
}

function err {
  >&2 echo "$@"
}

function generate_album {
  local album=$1
  if [ ! -f "$album/meta.sh" ]; then
    err "Please create $album/meta.sh"
    return
  fi

  name=$(basename "$album")
  ALBUM=$album html gallery "$name/index.html"
  for image in "$album"/*.{JPG,jpg,JPEG,jpeg,GIF,gif}; do
    thumbnail "$image" "$name"
    copy "$image" "$name/$(basename "$image")"
  done
}

export ALBUMS=albums

tpl overview
tpl gallery

html overview index.html
copy gallery.css gallery.css
copy favicon.ico favicon.ico

echo -n "."

for album in "$ALBUMS"/*; do
  if [ ! -d "$album" ]; then continue; fi
  generate_album "$album"
  echo -n "."
done

echo
