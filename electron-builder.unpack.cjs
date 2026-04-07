"use strict";

/**
 * Output folder dist/win-unpacked/ — dipakai sebagai input MSIX Packaging Tool
 * (lebih stabil daripada portable NSIS yang membersihkan file setelah app keluar).
 */

const pkg = require("./package.json");

module.exports = {
  ...pkg.build,
  win: {
    ...pkg.build.win,
    target: ["dir"],
  },
};
