const debug = require("debug")("p.funkenburg.net:home");
const fs = require("fs");
const yaml = require("js-yaml");
const mustache = require("mustache");
const path = require("path");
const util = require("util");

fs.readFileAsync = util.promisify(fs.readFile);
fs.writeFileAsync = util.promisify(fs.writeFile);

let stupidHack = null;

async function createHomepage(src, dst) {
  debug("create index html");

  debug("load meta.yaml");
  const metaObject = await fs.readFileAsync(path.join(src.bucket, "meta.yaml"));
  const meta = yaml.safeLoad(metaObject.toString("utf8"));

  // iterate all albums to get titles, etc.
  debug("load album meta.yaml");
  const albumMetaObjects = await Promise.all(
    meta.sort.map(async album => {
      let key = path.join(album, "meta.yaml");
      debug("load %s/%s", src.bucket, key);
      let obj = await fs.readFileAsync(path.join(src.bucket, key));
      return { Key: key, album: album, Body: obj };
    })
  );
  const albumMeta = albumMetaObjects
    // should already be sorted!
    //.sort((a, b) => meta.sort.indexOf(a.album) - meta.sort.indexOf(b.album))
    .map(obj => {
      let meta = yaml.safeLoad(obj.Body.toString("utf8"));
      meta.cover_resized = "cover";
      return {
        path: obj.album,
        meta
      };
    });

  const data = {
    albums: albumMeta
  };

  if (JSON.stringify(data) === stupidHack) {
    debug("skip homepage");
    return;
  } else {
    stupidHack = JSON.stringify(data);
  }

  debug("render");
  const template = await fs.readFileAsync("template/index.html", "utf8");
  const rendered = mustache.render(template, data);
  debug("upload homepage to %s/%s", dst.bucket, "index.html");
  await fs.writeFileAsync(path.join(dst.bucket, "index.html"), rendered);
  debug("homepage done");
}

module.exports = {
  create: createHomepage,
  delete: () => {}
};
