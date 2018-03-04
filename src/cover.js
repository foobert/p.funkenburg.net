const debug = require("debug")("p.funkenburg.net:debug");
const yaml = require("js-yaml");
const gm = require("gm").subClass({ imageMagick: true });
const path = require("path");
const s3 = require("./s3");

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

  debug("load source image");
  const coverObject = await s3
    .getObject({
      Bucket: src.bucket,
      Key: srcKey
    })
    .promise();
  const contentType = coverObject.ContentType;
  const data = await new Promise((accept, reject) => {
    debug("resizing image");
    gm(coverObject.Body)
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

  debug("upload cover image to %s/%s", dst.bucket, dstKey);
  await s3
    .putObject({
      Bucket: dst.bucket,
      Key: dstKey,
      ContentType: contentType,
      Body: data
    })
    .promise();

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
