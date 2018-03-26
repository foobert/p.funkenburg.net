const chalk = require("chalk");

const BLOCK = "■";

function perc(a, b, c) {
  return (
    (a[0] * 1000000000 + a[1] - (b[0] * 1000000000 + b[1])) /
    (c[0] * 1000000000 + c[1])
  );
}

function mapStats(stats) {
  const colors = stats.map((_, i) =>
    chalk.hsv(i / stats.length * 255, 100, 100)
  );
  const percentages = stats.map((s, i) =>
    perc(
      s.time,
      i > 0 ? stats[i - 1].time : [0, 0],
      stats[stats.length - 1].time
    )
  );
  const width = process.stdout.columns - 45;
  const parts = percentages.map(s => Math.floor(s * width));
  const sum = parts.reduce((s, x) => s + x, 0);
  const line = parts
    .map(w => BLOCK.repeat(w))
    .map((w, i) => colors[i](w))
    .join("");
  const fix =
    sum < width ? colors[colors.length - 1](BLOCK.repeat(width - sum)) : "";
  return line + fix;
}

function getMillis(stats) {
  let last = stats[stats.length - 1].time;
  return last[0] * 1000 + last[1] / 1000000;
}

function mapMillis(millis) {
  const red = 5000; // msec
  return chalk.hsv(170 - Math.min(red, millis) / red * 170, 100, 100);
}

function log(src, dst) {
  const start = process.hrtime();
  let stats = [];

  return {
    success: function() {
      stats.push({ time: process.hrtime(start) });
    },
    error: function(err) {
      stats.push({ time: process.hrtime(start), err });
    },
    print: function(prefix) {
      stats.push({ time: process.hrtime(start) });
      const millis = getMillis(stats);
      const rainbow = mapStats(stats);
      console.log(
        chalk.green(prefix || "?"),
        src.key.padStart(30),
        mapMillis(millis)(millis.toFixed(0).padStart(5) + " ms"),
        rainbow
      );
    }
  };
}

module.exports = log;
