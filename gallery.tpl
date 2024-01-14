<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <link rel="stylesheet" href="../gallery.css"/>
  </head>
  <body>
% source $ALBUM/meta.sh
    <div class="container">
      <h1><a href="/">Photos</a> / <% $TITLE %></h1>
      <h2><% $DESCRIPTION %></h2>
      <ul class="gallery">
%
shopt -s nullglob
for filename in $ALBUM/*.{JPG,JPEG,jpg,jpeg,gif}; do
  image=$(basename "$filename")
%
        <li>
          <a href="<% $image %>">
            <img src="t_<% $image %>"/>
          </a>
        </li>
%
done
%
      </ul>
    </div>
  </body>
</html>
