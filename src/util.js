const path = require("path");

function label(filename, label) {
  let dir = path.dirname(filename);
  let ext = path.extname(filename);
  let base = path.basename(filename, ext);
  return path.join(dir, `${base}.${label}${ext}`);
}

module.exports = {
  label
};
