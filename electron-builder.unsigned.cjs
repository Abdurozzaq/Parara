"use strict";

const pkg = require("./package.json");

module.exports = {
  ...pkg.build,
  win: {
    ...pkg.build.win,
    signAndEditExecutable: false,
    signExts: ["!.exe"],
  },
};
