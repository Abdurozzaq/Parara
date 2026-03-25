const fs = require("fs");
const path = require("path");

const tmpDir = path.join(__dirname, "tmp");
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

const dest = path.join(tmpDir, "licenses.json");
const fixture = path.join(__dirname, "fixtures", "licenses.json");
fs.copyFileSync(fixture, dest);

process.env.LICENSE_DB_PATH = dest;
process.env.SUPERADMIN_SERIAL = "PARARA-SUPERADMIN-TEST";
