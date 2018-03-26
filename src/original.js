const debug = require("debug")("p.funkenburg.net:original");
const fs = require("fs");
const mkdirp = require("mkdirp-promise");
const path = require("path");
const util = require("util");
const { etag } = require("./etag");
const { exists } = require("./util");

fs.symlinkAsync = util.promisify(fs.symlink);

async function createOriginal(src, dst) {
  const dstKey = await etag(src, "src");
  const dstPath = path.join(dst.bucket, dstKey);
  if (await exists(dstPath)) {
    debug("skip original to %s", dstPath);
    return;
  }

  const target = path.join(
    path.relative(path.dirname(dstPath), path.dirname(src.bucket)),
    src.path
  );
  debug("relative: %s -> %s: %s", dstPath, src.path, target);

  await mkdirp(path.dirname(dstPath));
  await fs.symlinkAsync(target, dstPath);
}

async function deleteOriginal(src, dst) {}

module.exports = {
  create: createOriginal,
  delete: deleteOriginal
};
