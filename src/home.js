const debug = require("debug")("p.funkenburg.net:home");
const fs = require("fs");
const yaml = require("js-yaml");
const mustache = require("mustache");
const path = require("path");
const util = require("util");
const s3 = require("./s3");
fs.readFile = util.promisify(fs.readFile);

async function createHomepage(src, dst) {
  debug("create index html");

  debug("load meta.yaml");
  const metaObject = await s3
    .getObject({
      Bucket: src.bucket,
      Key: "albums/meta.yaml"
    })
    .promise();
  const meta = yaml.safeLoad(metaObject.Body.toString("utf8"));

  // iterate all albums to get titles, etc.
  debug("load album meta.yaml");
  const albumMetaObjects = await Promise.all(
    meta.sort.map(async album => {
      let key = path.join("albums", album, "meta.yaml");
      debug("load %s/%s", src.bucket, key);
      let obj = await s3.getObject({ Bucket: src.bucket, Key: key }).promise();
      // hack in the original key and album name
      obj.Key = key;
      obj.album = album;
      return obj;
    })
  );
  const albumMeta = albumMetaObjects
    // should already be sorted!
    //.sort((a, b) => meta.sort.indexOf(a.album) - meta.sort.indexOf(b.album))
    .map(obj => {
      let meta = yaml.safeLoad(obj.Body.toString("utf8"));
      meta.cover_resized = "cover";
      return {
        path: path.join("albums", obj.album),
        meta
      };
    });

  debug("render");
  const template = await fs.readFile("template/index.html", "utf8");
  const data = {
    albums: albumMeta
  };
  const rendered = mustache.render(template, data);
  debug("upload homepage to %s/%s", dst.bucket, "index.html");
  await s3
    .putObject({
      Bucket: dst.bucket,
      Key: "index.html",
      ContentType: "text/html",
      Body: rendered
    })
    .promise();
  debug("homepage done");
}

module.exports = {
  create: createHomepage,
  delete: () => {}
};
