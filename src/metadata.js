const debug = require("debug")("p.funkenburg.net:metadata");
const gm = require("gm").subClass({ imageMagick: true });
const moment = require("moment");
const path = require("path");
const { label, changeExt } = require("./util");
const s3 = require("./s3");

// gm identify is super slow, so we do a stupid in-memory cache here
const metadataCache = {};

async function parseMetadata(src) {
  debug("parse metadata");
  if (metadataCache[src]) {
    debug("metadata cache hit");
    return metadataCache[src];
  }
  const img = await new Promise((accept, reject) => {
    gm(src.obj.Body).identify((err, value) => {
      if (err) {
        reject(err);
      } else {
        accept(value);
      }
    });
  });

  const date = img.Properties["exif:DateTimeOriginal"]
    ? moment(img.Properties["exif:DateTimeOriginal"], "YYYY:MM:DD HH:mm:ss")
    : moment(src.obj.LastModified);
  const ratio =
    img.size.width > img.size.height
      ? img.size.height / img.size.width * 100
      : img.size.width / img.size.height * 100;
  const metadata = {
    path: src.key,
    src:
      "http://localhost:4572/p.funkenburg.net/" +
      path.dirname(src.key) +
      "/" +
      path.basename(src.key),
    basename: path.basename(src.key, path.extname(src.key)),
    preview: label(path.basename(src.key), "preview"),
    date: date,
    date_pretty: moment(date).format("YYYY-MM-DD"),
    exif: img.Properties,
    width: img.size.width,
    height: img.size.height,
    ratio: ratio
  };
  metadataCache[src] = metadata;
  return metadata;
}

async function createMetadata(src, dst) {
  debug("create metadata");
  const dstKey = changeExt(src.key, ".json");
  const metadata = await parseMetadata(src);
  debug("upload metadata to %s/%s", dst.bucket, dstKey);
  await s3
    .putObject({
      Bucket: dst.bucket,
      Key: dstKey,
      Body: JSON.stringify(metadata),
      ContentType: "application/json"
    })
    .promise();

  debug("metadata done");
  //console.log(`metadata: ${src.bucket}/${src.key} -> ${dst.bucket}/${dstKey}`);
}

async function deleteMetadata(src, dst) {
  const dstKey = changeExt(src.key, ".json");
  await s3
    .deleteObject({
      Bucket: dst.bucket,
      Key: dstKey
    })
    .promise();
}

module.exports = {
  create: createMetadata,
  delete: deleteMetadata,
  parse: parseMetadata
};
