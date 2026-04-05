const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");

function uniquePaths(candidates) {
  return [...new Set(candidates.filter(Boolean))];
}

function resolveOptionalResourcePath(relativePath) {
  const candidates = uniquePaths([
    path.join(projectRoot, relativePath),
    typeof process.resourcesPath === "string"
      ? path.join(process.resourcesPath, relativePath)
      : null,
    process.cwd() ? path.join(process.cwd(), relativePath) : null,
  ]);

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function getPublicDir() {
  return resolveOptionalResourcePath("public") || path.join(projectRoot, "public");
}

module.exports = {
  getPublicDir,
  resolveOptionalResourcePath,
};
