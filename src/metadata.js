const debug = require("debug")("p.funkenburg.net:metadata");
const fs = require("fs");
const gm = require("gm").subClass({ imageMagick: true });
const mkdirp = require("mkdirp-promise");
const moment = require("moment");
const path = require("path");
const util = require("util");
const { etag } = require("./etag");
const { label, changeExt, exists, tryUnlink } = require("./util");

fs.writeFileAsync = util.promisify(fs.writeFile);
fs.statAsync = util.promisify(fs.stat);
fs.unlinkAsync = util.promisify(fs.unlink);
fs.symlinkAsync = util.promisify(fs.symlink);

async function getMtime(filename) {
  let s = await fs.statAsync(filename);
  return s.mtime;
}

async function parseMetadata(src) {
  debug("parse metadata");
  const img = await new Promise((accept, reject) => {
    gm(src.obj).identify((err, value) => {
      if (err) {
        reject(err);
      } else {
        accept(value);
      }
    });
  });

  const date = img.Properties["exif:DateTimeOriginal"]
    ? moment(img.Properties["exif:DateTimeOriginal"], "YYYY:MM:DD HH:mm:ss")
    : moment(getMtime(src.path));
  const ratio =
    img.size.width > img.size.height
      ? img.size.height / img.size.width * 100
      : img.size.width / img.size.height * 100;
  const metadata = {
    path: src.key,
    src: path.basename(await etag(src, "src")),
    basename: path.basename(src.key, path.extname(src.key)),
    preview: path.basename(await etag(src, "pre")),
    single: path.basename(changeExt(await etag(src), ".html")),
    date: date,
    date_pretty: moment(date).format("YYYY-MM-DD"),
    exif: img.Properties,
    width: img.size.width,
    height: img.size.height,
    ratio: ratio
  };
  return metadata;
}

async function createMetadata(src, dst) {
  debug("create metadata");
  const dstKey = changeExt(await etag(src), ".json");
  const dstPath = path.join(dst.bucket, dstKey);

  const target = label(changeExt(path.basename(src.key), ".json"), "meta");
  const linkPath = path.join(path.dirname(dstPath), target);
  if (!await exists(linkPath)) {
    await fs.symlinkAsync(path.basename(dstPath), linkPath);
  }

  if (await exists(dstPath)) {
    debug("skip metadata to %s", dstPath);
    return;
  }

  const metadata = await parseMetadata(src);
  debug("upload metadata to %s", dstPath);
  await mkdirp(path.dirname(dstPath));
  await fs.writeFileAsync(dstPath, JSON.stringify(metadata), "utf8");

  debug("metadata done");
  //console.log(`metadata: ${src.bucket}/${src.key} -> ${dst.bucket}/${dstKey}`);
}

async function deleteMetadata(src, dst) {
  const target = path.join(
    dst.bucket,
    path.dirname(src.key),
    label(changeExt(path.basename(src.key), ".json"), "meta")
  );
  debug("unlink: %s", target);
  await tryUnlink(target);
}

module.exports = {
  create: createMetadata,
  delete: deleteMetadata,
  parse: parseMetadata
};
