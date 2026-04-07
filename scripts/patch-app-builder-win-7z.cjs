"use strict";

/**
 * electron-builder's app-builder invokes 7-Zip with -snld (extract symlinks).
 * On Windows without symlink privilege, extracting winCodeSign-*.7z fails on
 * darwin/*.dylib links. Replacing -snld with -snl- skips restoring symlinks
 * and extraction succeeds (see 7-Zip switch -snl-).
 */

const fs = require("fs");
const path = require("path");

if (process.platform !== "win32") {
  process.exit(0);
}

let exe;
try {
  const pkgDir = path.dirname(require.resolve("app-builder-bin/package.json"));
  exe = path.join(pkgDir, "win", "x64", "app-builder.exe");
} catch {
  process.exit(0);
}

if (!fs.existsSync(exe)) {
  process.exit(0);
}

const from = Buffer.from("-snld");
const to = Buffer.from("-snl-");

if (from.length !== to.length) {
  throw new Error("patch-app-builder-win-7z: from/to must be same length");
}

const buf = fs.readFileSync(exe);

function countNeedle(hay, needle) {
  let n = 0;
  for (let i = 0; i <= hay.length - needle.length; i++) {
    if (hay.subarray(i, i + needle.length).equals(needle)) {
      n++;
    }
  }
  return n;
}

if (countNeedle(buf, from) === 0) {
  if (countNeedle(buf, to) >= 1) {
    process.exit(0);
  }
  console.warn("patch-app-builder-win-7z: -snld not found; skip (unknown app-builder version)");
  process.exit(0);
}

let patched = false;
for (let i = 0; i <= buf.length - from.length; i++) {
  if (buf.subarray(i, i + from.length).equals(from)) {
    to.copy(buf, i);
    patched = true;
    i += from.length - 1;
  }
}

if (patched) {
  fs.writeFileSync(exe, buf);
}
