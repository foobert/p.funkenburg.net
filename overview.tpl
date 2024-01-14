<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <link rel="stylesheet" href="gallery.css"/>
    <title>Photos</title>
  </head>
  <body>
    <div class="container">
      <ul class="gallery">
% while IFS="" read -r album; do
% if [ -f $ALBUMS/$album/meta.sh ]; then
% for meta in $ALBUMS/$album/meta.sh; do
% source $meta
        <li>
          <a href="<% $album %>">
            <img src="<% $album/t_$COVER %>"/>
            <div class="overlay">
              <div><h2><% $TITLE %></h2><p><% $DESCRIPTION %></p></div>
            </div>
          </a>
        </li>
% done
% fi
% done < $ALBUMS/meta.sh
      </ul>
    </div>
  </body>
</html>
