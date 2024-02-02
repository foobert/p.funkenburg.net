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
    magick "$input" -thumbnail x300 "$output"
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
  images=("$album"/*.{JPG,jpg,JPEG,jpeg,GIF,gif})
  images_len=$((${#images[@]}-1))
  for i in "${!images[@]}"; do 
    image=${images[$i]}
    image_basename=$(basename "$image")
    thumbnail "$image" "$name"
    copy "$image" "$name/$image_basename"
    if [ "$i" -gt 0 ]; then
      prev=$(basename "${images[$((i-1))]}")
    else
      prev=""
    fi
    if [ "$i" -lt $images_len ]; then
      next=$(basename "${images[$((i+1))]}")
    else
      next=""
    fi
    ALBUM=$album IMAGE=$image_basename POS=$i LEN=$images_len PREV=$prev NEXT=$next UP=$name html image "$name/${image_basename%.*}.html"
  done
}

export ALBUMS=albums

tpl overview
tpl gallery
tpl image

html overview index.html
copy gallery.css gallery.css
copy image.css image.css
copy favicon.ico favicon.ico

echo -n "."

for album in "$ALBUMS"/*; do
  if [ ! -d "$album" ]; then continue; fi
  generate_album "$album"
  echo -n "."
done

echo
