const debug = require("debug")("p.funkenburg.net:single");
const fs = require("fs");
const mkdirp = require("mkdirp-promise");
const mustache = require("mustache");
const path = require("path");
const util = require("util");
const { changeExt, exists } = require("./util");
const { parse: parseMetadata } = require("./metadata");
const { etag } = require("./etag");

fs.readFileAsync = util.promisify(fs.readFile);
fs.writeFileAsync = util.promisify(fs.writeFile);
fs.unlinkAsync = util.promisify(fs.unlink);

async function createSingleHtml(src, dst) {
  debug("create single image page");
  const dstKey = changeExt(await etag(src), ".html");
  const dstPath = path.join(dst.bucket, dstKey);
  const dstDir = path.dirname(dstPath);

  if (await exists(dstPath)) {
    debug("skip single to %s", dstPath);
    return;
  }

  const template = await fs.readFileAsync("template/single.html", "utf8");
  const metadata = await parseMetadata(src);
  const rendered = mustache.render(template, metadata);
  debug("upload html to %s", dstPath);
  await mkdirp(dstDir);
  await fs.writeFileAsync(dstPath, rendered, "utf8");

  debug("single done");
  //console.log(`${src.bucket}/${src.key} -> ${dst.bucket}/${dstKey}`);
}

async function deleteSingleHtml() {
  // nop, rely on GC instead
}

module.exports = {
  create: createSingleHtml,
  delete: deleteSingleHtml
};
