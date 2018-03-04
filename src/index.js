const debug = require("debug")("p.funkenburg.net:index");
const yaml = require("js-yaml");
const s3 = require("./s3");

const preview = require("./preview");
const metadata = require("./metadata");
const single = require("./single");
const album = require("./album");
const home = require("./home");
const cover = require("./cover");

const createHandlers = [
  preview.create,
  metadata.create,
  single.create,
  album.create
];
const deleteHandlers = [
  preview.delete,
  metadata.delete,
  single.delete,
  album.delete
];

function parseSrcAndDst(record) {
  const srcBucket = record.s3.bucket.name;
  // Object key may have spaces or unicode non-ASCII characters.
  const srcKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
  const dstBucket = "p.funkenburg.net-processed";

  // Sanity check: validate that source and destination are different buckets.
  if (srcBucket == dstBucket) {
    throw new Error("Source and destination buckets are the same.");
  }
  return {
    src: { bucket: srcBucket, key: srcKey },
    dst: { bucket: dstBucket }
  };
}

async function handleCreate(record) {
  let { src, dst } = parseSrcAndDst(record);

  if (src.key.match(/meta\.yaml$/i)) {
    debug("fetch %s/%s", src.bucket, src.key);
    src.obj = await s3
      .getObject({ Bucket: src.bucket, Key: src.key })
      .promise();
    src.body = yaml.safeLoad(src.obj.Body.toString("utf8"));
    await cover.create(src, dst);
    await home.create(src, dst);
    return;
  }

  const typeMatch = src.key.match(/\.(jpg|jpeg|png|gif)$/i);
  if (!typeMatch) {
    console.log("Could not determine the image type, ignoring event.");
    return;
  }

  debug("fetch source object %s/%s", src.bucket, src.key);
  src.obj = await s3
    .getObject({
      Bucket: src.bucket,
      Key: src.key
    })
    .promise();

  for (let handler of createHandlers) {
    debug("running %s", handler.name || handler);
    await handler(src, dst);
  }
}

async function handleDelete(record) {
  const { src, dst } = parseSrcAndDst(record);

  for (let handler of deleteHandlers) {
    debug("Delete %s", handler.name || handler);
    await handler(src, dst);
  }
}

exports.handler = async function(event, context, callback) {
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
