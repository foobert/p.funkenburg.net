const fs = require("fs");
const path = require("path");

function label(filename, label) {
  let dir = path.dirname(filename);
  let ext = path.extname(filename);
  let base = path.basename(filename, ext);
  return path.join(dir, `${base}-${label}${ext}`);
}

function changeExt(filename, ext) {
  return path.join(
    path.dirname(filename),
    path.basename(filename, path.extname(filename)) + ext
  );
}

function exists(filename) {
  return new Promise((accept, reject) => {
    fs.stat(filename, err => {
      if (err && err.code === "ENOENT") {
        accept(false);
      } else if (err) {
        reject(err);
      } else {
        accept(true);
      }
    });
  });
}

function tryUnlink(filename) {
  return new Promise(accept => {
    // cannot simply pass accept here, because we want to ignore err
    fs.unlink(filename, () => accept());
  });
}

module.exports = {
  label,
  changeExt,
  exists,
  tryUnlink
};
