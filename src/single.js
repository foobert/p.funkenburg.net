const debug = require("debug")("p.funkenburg.net:single");
const fs = require("fs");
const mustache = require("mustache");
const util = require("util");
const { parse: parseMetadata } = require("./metadata");
const { changeExt } = require("./util");
const s3 = require("./s3");
fs.readFile = util.promisify(fs.readFile);

async function createSingleHtml(src, dst) {
  debug("create single image page");
  const template = await fs.readFile("template/single.html", "utf8");
  const metadata = await parseMetadata(src);
  const dstKey = changeExt(src.key, ".html");
  const rendered = mustache.render(template, metadata);
  debug("upload html to %s/%s", dst.bucket, dstKey);
  await s3
    .putObject({
      Bucket: dst.bucket,
      Key: dstKey,
      Body: rendered,
      ContentType: "text/html"
    })
    .promise();

  debug("single done");
  //console.log(`${src.bucket}/${src.key} -> ${dst.bucket}/${dstKey}`);
}

async function deleteSingleHtml(src, dst) {
  const dstKey = changeExt(src.key, ".html");
  await s3
    .deleteObject({
      Bucket: dst.bucket,
      Key: dstKey
    })
    .promise();
}

module.exports = {
  create: createSingleHtml,
  delete: deleteSingleHtml
};
