const fs = require("fs/promises");
const path = require("path");
const { randomUUID } = require("crypto");

const DEFAULT_JSON_PATH = path.join(__dirname, "licenses.json");

function getDbPath() {
  return process.env.LICENSE_DB_PATH || DEFAULT_JSON_PATH;
}

async function readDatabase() {
  const filePath = getDbPath();
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const data = JSON.parse(raw);
    if (!Array.isArray(data.licenses)) {
      return { licenses: [] };
    }
    return data;
  } catch (err) {
    if (err.code === "ENOENT") {
      return { licenses: [] };
    }
    throw err;
  }
}

async function writeDatabase(data) {
  const filePath = getDbPath();
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  await fs.rename(tmp, filePath);
}

function normalizeSerial(value) {
  return String(value ?? "").trim();
}

function isValidEmail(email) {
  if (!email || typeof email !== "string") {
    return false;
  }
  const trimmed = email.trim();
  if (!trimmed || trimmed.length > 254) {
    return false;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

async function listLicenses() {
  const db = await readDatabase();
  return [...db.licenses];
}

async function findBySerial(serial) {
  const target = normalizeSerial(serial);
  const db = await readDatabase();
  return db.licenses.find((row) => normalizeSerial(row.serial) === target) || null;
}

async function createLicense({ serial, email }) {
  const nextSerial = normalizeSerial(serial);
  const nextEmail = String(email ?? "").trim();

  if (!nextSerial) {
    const err = new Error("Serial wajib diisi.");
    err.statusCode = 400;
    throw err;
  }
  if (!isValidEmail(nextEmail)) {
    const err = new Error("Email pemilik lisensi tidak valid.");
    err.statusCode = 400;
    throw err;
  }

  const db = await readDatabase();
  if (db.licenses.some((row) => normalizeSerial(row.serial) === nextSerial)) {
    const err = new Error("Serial sudah terdaftar.");
    err.statusCode = 409;
    throw err;
  }

  const row = {
    id: randomUUID(),
    serial: nextSerial,
    email: nextEmail,
    createdAt: new Date().toISOString(),
  };
  db.licenses.push(row);
  await writeDatabase(db);
  return row;
}

async function updateLicense(id, { serial, email }) {
  const db = await readDatabase();
  const idx = db.licenses.findIndex((row) => row.id === id);
  if (idx === -1) {
    const err = new Error("Lisensi tidak ditemukan.");
    err.statusCode = 404;
    throw err;
  }

  const nextSerial =
    serial !== undefined ? normalizeSerial(serial) : normalizeSerial(db.licenses[idx].serial);
  const nextEmail =
    email !== undefined ? String(email).trim() : String(db.licenses[idx].email).trim();

  if (!nextSerial) {
    const err = new Error("Serial wajib diisi.");
    err.statusCode = 400;
    throw err;
  }
  if (!isValidEmail(nextEmail)) {
    const err = new Error("Email pemilik lisensi tidak valid.");
    err.statusCode = 400;
    throw err;
  }

  const duplicate = db.licenses.some(
    (row, i) => i !== idx && normalizeSerial(row.serial) === nextSerial,
  );
  if (duplicate) {
    const err = new Error("Serial sudah dipakai lisensi lain.");
    err.statusCode = 409;
    throw err;
  }

  db.licenses[idx] = {
    ...db.licenses[idx],
    serial: nextSerial,
    email: nextEmail,
  };
  await writeDatabase(db);
  return db.licenses[idx];
}

async function deleteLicense(id) {
  const db = await readDatabase();
  const before = db.licenses.length;
  db.licenses = db.licenses.filter((row) => row.id !== id);
  if (db.licenses.length === before) {
    const err = new Error("Lisensi tidak ditemukan.");
    err.statusCode = 404;
    throw err;
  }
  await writeDatabase(db);
}

module.exports = {
  listLicenses,
  findBySerial,
  createLicense,
  updateLicense,
  deleteLicense,
  isValidEmail,
};
