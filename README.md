# Photos

The image gallery is based of some simple static HTML files. They are "rendered" using bash-tpl, which is a
single-binary, bash-based templating language.

## Building

The workflow is driven by generate.sh, which renders the HTML files and also uses image magick to resize the
thumbnails. I guess I could have moved the build process inside docker, to not have these dependencies on the host,
but maybe later.

## Deployment

A single pre-built docker image is too large, instead we re-use nginx and rsync the files manually to the server.
The output is then directly mounted into nginx and we're done.
