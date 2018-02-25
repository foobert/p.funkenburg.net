const AWS = require("aws-sdk");
const path = require("path");
const gm = require("gm").subClass({ imageMagick: true });
const util = require("util");

const s3 = new AWS.S3();

function label(filename, label) {
  let dir = path.dirname(filename);
  let ext = path.extname(filename);
  let base = path.basename(filename, ext);
  return path.join(dir, `${base}.${label}${ext}`);
}

function parseSrcAndDst(record) {
  const srcBucket = record.s3.bucket.name;
  // Object key may have spaces or unicode non-ASCII characters.
  const srcKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
  const dstBucket = "p.funkenburg.net-processed";
  const dstKey = label(srcKey, "preview");

  // Sanity check: validate that source and destination are different buckets.
  if (srcBucket == dstBucket) {
    throw new Error("Source and destination buckets are the same.");
  }
  return { srcBucket, srcKey, dstBucket, dstKey };
}

async function handleCreate(record) {
  const { srcBucket, srcKey, dstBucket, dstKey } = parseSrcAndDst(record);

  const typeMatch = srcKey.match(/\.(jpg|jpeg|png|gif)$/i);
  if (!typeMatch) {
    console.log("Could not determine the image type, ignoring event.");
    return;
  }

  const srcObject = await s3
    .getObject({
      Bucket: srcBucket,
      Key: srcKey
    })
    .promise();

  let contentType = srcObject.ContentType;
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
      Bucket: dstBucket,
      Key: dstKey,
      Body: data,
      ContentType: contentType
    })
    .promise();

  console.log(`${srcBucket}/${srcKey} -> ${dstBucket}/${dstKey}`);
}

async function handleDelete(record) {
  const { dstBucket, dstKey } = parseSrcAndDst(record);

  await s3
    .deleteObject({
      Bucket: dstBucket,
      Key: dstKey
    })
    .promise();
}

exports.handler = async function(event, context, callback) {
  // console.log(util.inspect(event, { depth: 5 }));
  try {
    for (let record of event.Records) {
      switch (record.eventName) {
        case "ObjectCreated:Put":
          await handleCreate(record);
          break;
        case "ObjectRemoved:Delete":
          await handleDelete(record);
          break;
        default:
          console.log("Unknown eventName", record.eventName);
      }
    }
    callback(null, "ok");
  } catch (err) {
    callback(err);
  }
};
