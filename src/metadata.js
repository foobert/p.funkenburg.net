const AWS = require("aws-sdk");
const gm = require("gm").subClass({ imageMagick: true });
const moment = require("moment");
const path = require("path");
const { label } = require("./util");

const s3 = new AWS.S3();

function parseDstKey(src) {
  return path.join(
    path.dirname(src.key),
    path.basename(src.key, path.extname(src.key)) + ".json"
  );
}

async function createMetadata(src, dst) {
  const dstKey = parseDstKey(src);
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
    src: path.basename(src.key),
    basename: path.basename(src.key, path.extname(src.key)),
    preview: label(path.basename(src.key), "preview"),
    date: date,
    date_pretty: moment(date).format("YYYY-MM-DD"),
    exif: img.Properties,
    width: img.size.width,
    height: img.size.height,
    ratio: ratio
  };
  await s3
    .putObject({
      Bucket: dst.bucket,
      Key: dstKey,
      Body: JSON.stringify(metadata),
      ContentType: "application/json"
    })
    .promise();

  console.log(`${src.bucket}/${src.key} -> ${dst.bucket}/${dstKey}`);
}

async function deleteMetadata(src, dst) {
  const dstKey = parseDstKey(src);
  await s3
    .deleteObject({
      Bucket: dst.bucket,
      Key: dstKey
    })
    .promise();
}

module.exports = {
  create: createMetadata,
  delete: deleteMetadata
};
