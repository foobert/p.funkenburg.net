const debug = require("debug")("p.funkenburg.net:etag");
const crypto = require("crypto");
const path = require("path");

async function sha1(data) {
  const sha1 = crypto.createHash("sha1");
  sha1.update(data);
  return sha1.digest("hex");
}

async function etag(src, label) {
  let hash = src.sha1;
  let dir = path.dirname(src.key);
  let ext = path.extname(src.key);
  if (label) {
    label = "-" + label;
  } else {
    label = "";
  }
  return path.join(dir, hash + label + ext.toLowerCase());
}

module.exports = { sha1, etag };
