const AWS = require("aws-sdk");
const path = require("path");
const gm = require("gm").subClass({ imageMagick: true });
const moment = require("moment");
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

  // Sanity check: validate that source and destination are different buckets.
  if (srcBucket == dstBucket) {
    throw new Error("Source and destination buckets are the same.");
  }
  return { srcBucket, srcKey, dstBucket };
}

async function createPreview(srcObject, srcBucket, srcKey, dstBucket) {
  let dstKey = label(srcKey, "preview");
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

async function createMetadata(srcObject, srcBucket, srcKey, dstBucket) {
  const dstKey = path.join(
    path.dirname(srcKey),
    path.basename(srcKey, path.extname(srcKey)) + ".json"
  );
  const img = await new Promise((accept, reject) => {
    gm(srcObject.Body).identify((err, value) => {
      if (err) {
        reject(err);
      } else {
        accept(value);
      }
    });
  });
  console.log(util.inspect(img));
  const date = img.Properties["exif:DateTimeOriginal"]
    ? moment(img.Properties["exif:DateTimeOriginal"], "YYYY:MM:DD HH:mm:ss")
    : moment(srcObject.LastModified);
  const ratio =
    img.size.width > img.size.height
      ? img.size.height / img.size.width * 100
      : img.size.width / img.size.height * 100;
  const metadata = {
    path: srcKey,
    src: path.basename(srcKey),
    basename: path.basename(srcKey, path.extname(srcKey)),
    preview: label(path.basename(srcKey), "preview"),
    date: date,
    date_pretty: moment(date).format("YYYY-MM-DD"),
    exif: img.Properties,
    width: img.size.width,
    height: img.size.height,
    ratio: ratio
  };
  await s3
    .putObject({
      Bucket: dstBucket,
      Key: dstKey,
      Body: JSON.stringify(metadata),
      ContentType: "application/json"
    })
    .promise();

  console.log(`${srcBucket}/${srcKey} -> ${dstBucket}/${dstKey}`);
}

async function handleCreate(record) {
  const { srcBucket, srcKey, dstBucket } = parseSrcAndDst(record);

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

  await createPreview(srcObject, srcBucket, srcKey, dstBucket);
  await createMetadata(srcObject, srcBucket, srcKey, dstBucket);
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
