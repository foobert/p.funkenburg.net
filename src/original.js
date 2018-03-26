const debug = require("debug")("p.funkenburg.net:original");
const fs = require("fs");
const mkdirp = require("mkdirp-promise");
const path = require("path");
const util = require("util");
const { etag } = require("./etag");
const { exists } = require("./util");

fs.copyFileAsync = util.promisify(fs.copyFile);
fs.symlinkAsync = util.promisify(fs.symlink);
fs.unlinkAsync = util.promisify(fs.unlink);

async function createOriginal(src, dst) {
  const dstKey = await etag(src, "src");
  const dstPath = path.join(dst.bucket, dstKey);
  if (await exists(dstPath)) {
    debug("skip original to %s", dstPath);
    return;
  }

  await mkdirp(path.dirname(dstPath));
  await fs.copyFileAsync(src.path, dstPath);
}

async function deleteOriginal() {
  // nop, rely on GC instead
}

module.exports = {
  create: createOriginal,
  delete: deleteOriginal
};
