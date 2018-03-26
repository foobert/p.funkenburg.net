const PQueue = require("p-queue");
const chalk = require("chalk");
const chokidar = require("chokidar");
const createLog = require("./console");
const debug = require("debug")("p.funkenburg.net:index");
const fs = require("fs");
const os = require("os");
const path = require("path");
const util = require("util");
const yaml = require("js-yaml");
const { exists } = require("./util");
const { sha1 } = require("./etag");

fs.readFileAsync = util.promisify(fs.readFile);
fs.copyFileAsync = util.promisify(fs.copyFile);

const preview = require("./preview");
const metadata = require("./metadata");
const single = require("./single");
const album = require("./album");
const home = require("./home");
const cover = require("./cover");
const original = require("./original");

const createHandlers = [
  original.create,
  preview.create,
  metadata.create,
  single.create,
  album.create
];
const deleteHandlers = [
  original.delete,
  preview.delete,
  metadata.delete,
  single.delete,
  album.delete
];

const srcBaseDir = process.env.SRC || "albums";
const dstBaseDir = process.env.DST || "output";
const concurrency =
  parseInt(process.env.CORES) || Math.max(1, os.cpus().length - 1);

console.log(`📂 ${srcBaseDir.padStart(30)}`);
console.log(`🗃 ${dstBaseDir.padStart(30)}`);
console.log(`🔥 ${concurrency.toString().padStart(30)}`);

function parseSrcAndDst(record) {
  // record should be just the src path?
  return {
    src: {
      bucket: srcBaseDir,
      key: record,
      path: path.join(srcBaseDir, record)
    },
    dst: { bucket: dstBaseDir }
  };
}

async function handleCreate(record) {
  let { src, dst } = parseSrcAndDst(record);
  let log = createLog(src, dst);

  if (src.path.match(/meta\.yaml$/i)) {
    debug("fetch %s", src.path);
    src.obj = await fs.readFileAsync(src.path);
    src.body = yaml.safeLoad(src.obj.toString("utf8"));
    try {
      await cover.create(src, dst);
      log.success();
    } catch (err) {
      log.error(err);
      debug("cover failed: %o", err);
    }
    try {
      await home.create(src, dst);
      log.success();
    } catch (err) {
      log.error(err);
      debug("home failed: %o", err);
    }
    log.print("📓");
    return;
  }

  const typeMatch = src.path.match(/\.(jpg|jpeg|png|gif)$/i);
  if (!typeMatch) {
    debug("ignore %s", src.path);
    return;
  }

  debug("fetch source object %s", src.path);
  src.obj = await fs.readFileAsync(src.path);
  src.sha1 = await sha1(src.obj);

  for (let handler of createHandlers) {
    const name = handler.name || handler;
    try {
      await handler(src, dst);
      log.success();
    } catch (err) {
      debug("%s failed: %o", name, err);
      log.error(err);
    }
  }

  log.print("🌅");
}

async function handleDelete(record) {
  const { src, dst } = parseSrcAndDst(record);
  debug("src: %o", src);
  debug("dst: %o", dst);
  let log = createLog(src, dst);

  for (let handler of deleteHandlers) {
    debug("Delete %s", handler.name || handler);
    try {
      await handler(src, dst);
      log.sucess();
    } catch (err) {
      log.error(err);
    }
  }
  log.print("🗑");
}

async function copyStatics() {
  const filenames = [
    "album.css",
    "favicon.ico",
    "header.css",
    "index.css",
    "index.js",
    "lazyload.min.js",
    "single.css",
    "spinner.gif"
  ];
  for (const filename of filenames) {
    if (!await exists(path.join(dstBaseDir, filename))) {
      await fs.copyFileAsync(
        path.join("template", filename),
        path.join(dstBaseDir, filename)
      );
    }
  }
}

const queue = new PQueue({ concurrency });
debug("starting watcher");
const watcher = chokidar.watch(".", {
  cwd: srcBaseDir,
  awaitWriteFinish: true
});
watcher.on("add", path => {
  queue.add(() => handleCreate(path));
});
watcher.on("change", path => {
  queue.add(() => handleCreate(path));
});
watcher.on("unlink", path => {
  queue.add(() => handleDelete(path));
});
watcher.on("ready", () => {
  queue.add(copyStatics);
  queue.add(async () => console.log(chalk`{green 👀} ${"ready".padStart(30)}`));
});
