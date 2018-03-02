const AWS = require("aws-sdk");
const gm = require("gm").subClass({ imageMagick: true });

const { label } = require("./util");

const s3 = new AWS.S3();

async function createPreview(src, dst) {
  let dstKey = label(src.key, "preview");
  let contentType = src.obj.ContentType;
  let data = await new Promise((accept, reject) => {
    gm(srcObject.Body)
      .resize(480)
      .toBuffer((err, buffer) => {
        if (err) {
          reject(err);
        } else {
          accept(buffer);
        }
      });
  });

  await s3
    .putObject({
      Bucket: dst.bucket,
      Key: dstKey,
      Body: data,
      ContentType: contentType
    })
    .promise();

  console.log(`${src.bucket}/${src.key} -> ${dst.bucket}/${dst.key}`);
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
