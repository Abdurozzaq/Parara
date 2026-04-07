"use strict";

/**
 * Menghasilkan XML untuk MSIX Packaging Tool CLI:
 *   MsixPackagingTool.exe create-package --template <file> -v
 *
 * Default: installer NSIS dist/Parara-Setup-<versi>.exe + Arguments="/S" (wajib untuk mode unattended .exe).
 * MSIX_PACKAGING_MODE=portable  -> Parara-portable-*.exe + /S
 * MSIX_PACKAGING_MODE=unpacked  -> dist/win-unpacked/Parara.exe + MSIX_INSTALLER_ARGUMENTS (set sendiri; CLI sering gagal tanpa installer sunyi).
 */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const pkg = require(path.join(root, "package.json"));

const mode = (process.env.MSIX_PACKAGING_MODE || "nsis").toLowerCase();
const silentArgsDefault = "/S";

function toQuadVersion(v) {
  const parts = String(v).split(".").map((p) => parseInt(p, 10) || 0);
  while (parts.length < 4) {
    parts.push(0);
  }
  return parts.slice(0, 4).join(".");
}

const version = pkg.version;
const versionQuad = toQuadVersion(version);
const productName = pkg.build.productName || pkg.name;
const packageName = (process.env.MSIX_PACKAGE_NAME || "Parara").replace(/[^A-Za-z0-9]/g, "");
const authorName =
  typeof pkg.author === "string" ? pkg.author : pkg.author && pkg.author.name ? pkg.author.name : null;
const publisherCn =
  process.env.MSIX_PUBLISHER_CN || "CN=PublisherPlaceholder";
const publisherDisplay =
  process.env.MSIX_PUBLISHER_DISPLAY || authorName || productName;

const distDir = path.join(root, "dist");
const outMsix = path.join(distDir, "msix", `${packageName}-${versionQuad}.msix`);
const templateSnapshot = path.join(distDir, "msix", "conversion.template-snapshot.xml");

let installerXml;
let installerPath;
let modeLabel = mode;

if (mode === "portable") {
  const portableName = `${productName}-portable-${version}.exe`;
  installerPath = path.join(distDir, portableName);
  if (!fs.existsSync(installerPath)) {
    console.error(`generate-msix-conversion-template: tidak menemukan ${installerPath}`);
    console.error("Jalankan: npm run desktop:portable");
    process.exit(1);
  }
  const args = (process.env.MSIX_INSTALLER_ARGUMENTS || silentArgsDefault).trim();
  installerXml = `<Installer Path="${escapeXml(installerPath)}" Arguments="${escapeXml(args)}" />`;
} else if (mode === "unpacked") {
  installerPath = path.join(distDir, "win-unpacked", "Parara.exe");
  if (!fs.existsSync(installerPath)) {
    console.error(`generate-msix-conversion-template: tidak menemukan ${installerPath}`);
    console.error("Jalankan: npm run desktop:unpack");
    process.exit(1);
  }
  const args = (process.env.MSIX_INSTALLER_ARGUMENTS || "").trim();
  if (!args) {
    console.error(
      "generate-msix-conversion-template: mode unpacked butuh MSIX_INSTALLER_ARGUMENTS (unattended untuk .exe ini).",
    );
    console.error(
      "Untuk CLI Packaging Tool gunakan mode default nsis: npm run desktop:dist:unsigned lalu npm run desktop:msix:template",
    );
    process.exit(1);
  }
  installerXml = `<Installer Path="${escapeXml(installerPath)}" Arguments="${escapeXml(args)}" />`;
} else {
  const setupName = `${productName}-Setup-${version}.exe`;
  installerPath = path.join(distDir, setupName);
  if (!fs.existsSync(installerPath)) {
    console.error(`generate-msix-conversion-template: tidak menemukan ${installerPath}`);
    console.error("Jalankan: npm run desktop:dist:unsigned atau npm run desktop:dist");
    process.exit(1);
  }
  const args = (process.env.MSIX_INSTALLER_ARGUMENTS || silentArgsDefault).trim();
  installerXml = `<Installer Path="${escapeXml(installerPath)}" Arguments="${escapeXml(args)}" />`;
  modeLabel = "nsis";
}

const tplPath = path.join(root, "msix", "conversion-template.xml");
let xml = fs.readFileSync(tplPath, "utf8");

xml = xml.replace("__INSTALLER_XML__", installerXml);
xml = xml.replace("__PACKAGE_OUTPUT_MSIX__", escapeXml(outMsix));
xml = xml.replace("__TEMPLATE_SNAPSHOT_XML__", escapeXml(templateSnapshot));
xml = xml.replace(/__PACKAGE_NAME__/g, escapeXml(packageName));
xml = xml.replace(/__PACKAGE_DISPLAY_NAME__/g, escapeXml(productName));
xml = xml.replace(/__PUBLISHER_CN__/g, escapeXml(publisherCn));
xml = xml.replace(/__PUBLISHER_DISPLAY__/g, escapeXml(publisherDisplay));
xml = xml.replace(/__VERSION_QUAD__/g, escapeXml(versionQuad));

fs.mkdirSync(path.dirname(outMsix), { recursive: true });
const generatedPath = path.join(distDir, "msix", "conversion.generated.xml");
fs.writeFileSync(generatedPath, xml, "utf8");

console.log("MSIX conversion template written:");
console.log(`  ${generatedPath}`);
console.log("Output MSIX (target):");
console.log(`  ${outMsix}`);
console.log(`Mode: ${modeLabel} (${installerPath})`);
const loggedArgs =
  mode === "unpacked"
    ? (process.env.MSIX_INSTALLER_ARGUMENTS || "").trim()
    : (process.env.MSIX_INSTALLER_ARGUMENTS || silentArgsDefault).trim();
console.log(`Installer arguments: ${loggedArgs || "(none)"}`);

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
