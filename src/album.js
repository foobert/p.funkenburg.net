const debug = require("debug")("p.funkenburg.net:album");
const fs = require("fs");
const mustache = require("mustache");
const yaml = require("js-yaml");
const path = require("path");
const util = require("util");

const s3 = require("./s3");

async function createAlbum(src, dst) {
  debug("create album html page");
  debug("load meta.yaml");
  const metaObject = await s3
    .getObject({
      Bucket: src.bucket,
      Key: path.join(path.dirname(src.key), "meta.yaml")
    })
    .promise();
  const meta = yaml.safeLoad(metaObject.Body.toString("utf8"));

  // need to iterate all files from the src path
  debug("load metadata files");
  const { Contents: contents } = await s3
    .listObjectsV2({
      Bucket: dst.bucket,
      Prefix: path.dirname(src.key)
    })
    .promise();
  let jsonObjects = await Promise.all(
    contents.filter(c => c.Key.endsWith(".json")).map(c => {
      return s3
        .getObject({
          Bucket: dst.bucket,
          Key: c.Key
        })
        .promise();
    })
  );
  let images = jsonObjects
    .map(obj => JSON.parse(obj.Body.toString("utf8")))
    .sort((a, b) => {
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
  //debug("%o", images.map(img => img.date));

  const albumData = {
    path: path.dirname(src.key),
    meta,
    images,
    pictures1: imagesBalanced[0],
    pictures2: imagesBalanced[1],
    pictures3: imagesBalanced[2],
    pictures4: imagesBalanced[3]
  };
  const template = await util.promisify(fs.readFile)(
    "template/album.html",
    "utf8"
  );
  const rendered = mustache.render(template, albumData);
  const dstKey = path.join(path.dirname(src.key), "index.html");
  debug("upload album html page to %s/%s", dst.bucket, dstKey);
  await s3
    .putObject({
      Bucket: dst.bucket,
      Key: dstKey,
      ContentType: "text/html",
      Body: rendered
    })
    .promise();
  debug("album done");
}

async function deleteAlbum(src, dst) {
  const dstKey = path.join(path.dirname(src.key), "index.html");
  await s3
    .deleteObject({
      Bucket: dst.bucket,
      Key: dstKey
    })
    .promise();
}

module.exports = {
  create: createAlbum,
  delete: deleteAlbum
};
