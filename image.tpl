% source $ALBUM/meta.sh
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <link rel="stylesheet" href="../image.css"/>
    <title><% $TITLE %></title>
  </head>
  <body>
    <div class="container">
      <h1><a href="<% ../$UP %>">⇧ <% $TITLE %></a></h1>
      <div class="image">
        % if [ $POS -gt 0 ]; then
        <div class="nav"><a href="<% ${PREV%.*}.html %>">⇦</a></div>
        % else
        <div class="nav">&nbsp;</div>
        % fi
        <img src="<% $IMAGE %>"/>
        % if [ $POS -lt $LEN ]; then
        <div class="nav"><a href="<% ${NEXT%.*}.html %>">⇨</a></div>
        % else
        <div class="nav">&nbsp;</div>
        % fi
      </div>
    </div>
  </body>
</html>
