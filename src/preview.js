const debug = require("debug")("p.funkenburg.net:preview");
const fs = require("fs");
const gm = require("gm").subClass({ imageMagick: true });
const mkdirp = require("mkdirp-promise");
const path = require("path");
const util = require("util");
const { etag } = require("./etag");
const { exists } = require("./util");

fs.writeFileAsync = util.promisify(fs.writeFile);
fs.unlinkAsync = util.promisify(fs.unlink);

async function createPreview(src, dst) {
  debug("create preview");
  let dstKey = await etag(src, "pre");
  let dstPath = path.join(dst.bucket, dstKey);
  let dstDir = path.dirname(dstPath);

  if (await exists(dstPath)) {
    debug("skip preview to %s", dstPath);
    return;
  }

  let data = await new Promise((accept, reject) => {
    debug("resizing image");
    gm(src.obj)
      .resize(480)
      .toBuffer((err, buffer) => {
        if (err) {
          debug("resize error %o", err);
          reject(err);
        } else {
          accept(buffer);
        }
      });
  });

  debug("upload preview image to %s (%d b)", dstPath, data.length);
  await mkdirp(dstDir);
  await fs.writeFileAsync(dstPath, data);

  //console.log(`preview: ${src.bucket}/${src.key} -> ${dst.bucket}/${dstKey}`);
  debug("preview done");
}

async function deletePreview() {
  // nop, rely on GC instead
}

module.exports = {
  create: createPreview,
  delete: deletePreview
};
