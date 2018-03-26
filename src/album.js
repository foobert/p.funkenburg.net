const debug = require("debug")("p.funkenburg.net:album");
const fs = require("fs");
const mustache = require("mustache");
const yaml = require("js-yaml");
const path = require("path");
const util = require("util");
const mkdirp = require("mkdirp-promise");

fs.readFileAsync = util.promisify(fs.readFile);
fs.writeFileAsync = util.promisify(fs.writeFile);
fs.readDirAsync = util.promisify(fs.readdir);

let stupidHack = null;

async function createAlbum(src, dst) {
  debug("create album html page");
  debug("load meta.yaml");
  const dstDir = path.join(dst.bucket, path.dirname(src.key));
  const metaObject = await fs.readFileAsync(
    path.join(path.dirname(src.path), "meta.yaml"),
    "utf8"
  );
  const meta = yaml.safeLoad(metaObject);

  // need to iterate all files from the src path
  debug("load metadata files");
  const files = await fs.readDirAsync(dstDir);
  let jsonObjects = await Promise.all(
    files
      .filter(f => f.endsWith("-meta.json"))
      .map(f => fs.readFileAsync(path.join(dstDir, f), "utf8"))
  );
  let images = jsonObjects.map(obj => JSON.parse(obj)).sort((a, b) => {
    if (a.date < b.date) {
      return -1;
    } else if (a.date > b.date) {
      return 1;
    } else {
      return 0;
    }
  });
  let imagesBalanced = [[], [], [], []];
  for (let i in images) {
    imagesBalanced[i % 4].push(images[i]);
  }
  debug("found %d images", images.length);
  //debug("%o", images.map(img => img.single));

  const albumData = {
    path: path.dirname(src.key),
    meta,
    images,
    pictures1: imagesBalanced[0],
    pictures2: imagesBalanced[1],
    pictures3: imagesBalanced[2],
    pictures4: imagesBalanced[3]
  };
  if (JSON.stringify(albumData) === stupidHack) {
    debug("skip album html");
    return;
  } else {
    stupidHack = JSON.stringify(albumData);
  }
  const template = await util.promisify(fs.readFile)(
    "template/album.html",
    "utf8"
  );
  const rendered = mustache.render(template, albumData);
  const dstKey = path.join(path.dirname(src.key), "index.html");
  debug("upload album html page to %s/%s", dst.bucket, dstKey);
  await fs.writeFileAsync(path.join(dst.bucket, dstKey), rendered, "utf8");
  debug("album done");
}

module.exports = {
  create: createAlbum,
  delete: createAlbum
};
