"use strict";

const pkg = require("./package.json");

module.exports = {
  ...pkg.build,
  win: {
    ...pkg.build.win,
    target: ["portable"],
    artifactName: "${productName}-portable-${version}.${ext}",
  },
};
