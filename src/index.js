const AWS = require("aws-sdk");
const s3 = new AWS.S3();

const preview = require("./preview");
const metadata = require("./metadata");

const createHandlers = [preview.create, metadata.create];
const deleteHandlers = [preview.delete, metadata.delete];

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

  const typeMatch = src.key.match(/\.(jpg|jpeg|png|gif)$/i);
  if (!typeMatch) {
    console.log("Could not determine the image type, ignoring event.");
    return;
  }

  src.object = await s3
    .getObject({
      Bucket: src.bucket,
      Key: src.key
    })
    .promise();

  for (let handler of createHandlers) {
    await handler(src, dst);
  }
}

async function handleDelete(record) {
  const { src, dst } = parseSrcAndDst(record);

  for (let handler of deleteHandlers) {
    await handler(src, dst);
  }
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
