const chokidar = require("chokidar");
const debug = require("debug")("p.funkenburg.net:index");
const fs = require("fs");
const util = require("util");
const yaml = require("js-yaml");
const path = require("path");
const PQueue = require("p-queue");

fs.readFileAsync = util.promisify(fs.readFile);

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

const srcBaseDir = "albums";
const dstBaseDir = "output";

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

  if (src.path.match(/meta\.yaml$/i)) {
    debug("fetch %s", src.path);
    src.obj = await fs.readFileAsync(src.path);
    src.body = yaml.safeLoad(src.obj.toString("utf8"));
    await cover.create(src, dst);
    await home.create(src, dst);
    return;
  }

  return;

  const typeMatch = src.path.match(/\.(jpg|jpeg|png|gif)$/i);
  if (!typeMatch) {
    console.log(
      `Could not determine the image type of "${src.path}", ignoring event.`
    );
    return;
  }

  debug("fetch source object %s", src.path);
  src.obj = await fs.readFileAsync(src.path);

  for (let handler of createHandlers) {
    const name = handler.name || handler;
    debug("running %s", name);
    try {
      await handler(src, dst);
    } catch (err) {
      console.log("error during " + name, err);
    }
  }
}

async function handleDelete(record) {
  const { src, dst } = parseSrcAndDst(record);
  debug("src: %o", src);
  debug("dst: %o", dst);
  return;

  for (let handler of deleteHandlers) {
    debug("Delete %s", handler.name || handler);
    await handler(src, dst);
  }
}

const queue = new PQueue({ concurrency: 4 });
debug("starting watcher");
const watcher = chokidar.watch(".", { cwd: "albums", awaitWriteFinish: true });
watcher.on("add", path => {
  queue.add(() => handleCreate(path));
});
watcher.on("delete", path => {
  queue.add(() => handleDelete(path));
});
watcher.on("ready", () => debug("Ready"));
