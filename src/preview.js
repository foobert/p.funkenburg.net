const debug = require("debug")("p.funkenburg.net:preview");
const gm = require("gm").subClass({ imageMagick: true });
const { label } = require("./util");
const s3 = require("./s3");

async function createPreview(src, dst) {
  debug("create preview");
  let dstKey = label(src.key, "preview");
  let contentType = src.obj.ContentType;
  let data = await new Promise((accept, reject) => {
    debug("resizing image");
    gm(src.obj.Body)
      .resize(480)
      .toBuffer((err, buffer) => {
        if (err) {
          debug("resize error %o", err);
          reject(err);
        } else {
          accept(buffer);
        }
      });
  });

  debug(
    "upload preview image to %s/%s (%d b)",
    dst.bucket,
    dstKey,
    data.length
  );
  await s3
    .putObject({
      Bucket: dst.bucket,
      Key: dstKey,
      Body: data,
      ContentType: contentType
    })
    .promise();

  //console.log(`preview: ${src.bucket}/${src.key} -> ${dst.bucket}/${dstKey}`);
  debug("preview done");
}

async function deletePreview(src, dst) {
  let key = label(src.key, "preview");
  await s3
    .deleteObject({
      Bucket: dst.bucket,
      Key: key
    })
    .promise();
}

module.exports = {
  create: createPreview,
  delete: deletePreview
};
