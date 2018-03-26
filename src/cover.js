const debug = require("debug")("p.funkenburg.net:cover");
const fs = require("fs");
const gm = require("gm").subClass({ imageMagick: true });
const path = require("path");
const util = require("util");
const yaml = require("js-yaml");
const { exists } = require("./util");

fs.readFileAsync = util.promisify(fs.readFile);
fs.writeFileAsync = util.promisify(fs.writeFile);

function parseKeys(src, cover) {
  const srcKey = path.join(path.dirname(src.key), cover);
  const dstKey = path.join(path.dirname(src.key), "cover"); // no file extension, who cares, right?
  return { srcKey, dstKey };
}

async function createCover(src, dst) {
  debug("create cover");
  const meta = src.body;

  if (!meta.cover) {
    debug("not an album meta.yaml, skipping");
    return;
  }

  const { srcKey, dstKey } = parseKeys(src, meta.cover);
  const srcPath = path.join(src.bucket, srcKey);
  const dstPath = path.join(dst.bucket, dstKey);

  if (await exists(dstPath)) {
    debug("skipping cover to %s", dstPath);
    return;
  }

  debug("load source image");
  const coverObject = await fs.readFileAsync(srcPath);
  const data = await new Promise((accept, reject) => {
    debug("resizing image");
    gm(coverObject)
      .resize("1102x620^")
      .gravity("Center")
      .crop(1102, 620, 0, 0)
      .toBuffer((err, buffer) => {
        if (err) {
          debug("resize error %o", err);
          reject(err);
        } else {
          accept(buffer);
        }
      });
  });

  debug("upload cover image to %s", dstPath);
  await fs.writeFileAsync(dstPath, data);

  debug("cover done");
}

async function deleteCover(src, dst) {
  debug("delete cover");
  const { dstKey } = parseKeys(src);
  await s3.deleteObject({ Bucket: dst.bucket, Key: dstKey }).promise();
}

module.exports = {
  create: createCover,
  delete: deleteCover
};
