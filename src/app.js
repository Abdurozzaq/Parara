const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");

const paraphraseController = require("./controllers/paraphraseController");
const { validateParaphraseRequest } = require("./utils/validation");
const licenseStore = require("./data/licenseStore");

const app = express();
const activeSessions = new Map();
const SUPERADMIN_SERIAL = (process.env.SUPERADMIN_SERIAL || "PARARA-SUPERADMIN-001").trim();

let adminSession = null;

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || "unknown";
}

function getTokenFromRequest(req) {
  const authorization = req.headers.authorization;

  if (typeof authorization === "string" && authorization.startsWith("Bearer ")) {
    return authorization.slice(7).trim();
  }

  const fallbackToken = req.headers["x-access-token"];
  return typeof fallbackToken === "string" ? fallbackToken.trim() : "";
}

function validateSessionToken(token, req) {
  if (!token) {
    return { ok: false, status: 401, message: "Token akses belum diberikan." };
  }

  for (const [serial, session] of activeSessions.entries()) {
    if (session.token === token) {
      const currentIp = getClientIp(req);
      if (session.ip !== currentIp) {
        return {
          ok: false,
          status: 403,
          message: "Sesi aktif untuk serial ini hanya bisa dipakai dari IP yang sama.",
        };
      }

      return { ok: true, serial, session };
    }
  }

  return { ok: false, status: 401, message: "Token akses tidak valid atau sudah logout." };
}

function validateAdminToken(token, req) {
  if (!token) {
    return { ok: false, status: 401, message: "Token admin belum diberikan." };
  }

  if (!adminSession || adminSession.token !== token) {
    return { ok: false, status: 401, message: "Token admin tidak valid atau sudah logout." };
  }

  const currentIp = getClientIp(req);
  if (adminSession.ip !== currentIp) {
    return {
      ok: false,
      status: 403,
      message: "Sesi superadmin hanya bisa dipakai dari IP yang sama.",
    };
  }

  return { ok: true, session: adminSession };
}

function requireAccessSession(req, res, next) {
  const token = getTokenFromRequest(req);
  const validation = validateSessionToken(token, req);

  if (!validation.ok) {
    return res.status(validation.status).json({
      error: validation.message,
    });
  }

  req.access = {
    serial: validation.serial,
    ip: validation.session.ip,
  };
  return next();
}

function requireAdminSession(req, res, next) {
  const token = getTokenFromRequest(req);
  const validation = validateAdminToken(token, req);

  if (!validation.ok) {
    return res.status(validation.status).json({
      error: validation.message,
    });
  }

  req.admin = {
    ip: validation.session.ip,
  };
  return next();
}

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Terlalu banyak permintaan. Coba lagi dalam beberapa saat.",
  },
});

const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Terlalu banyak permintaan admin. Coba lagi dalam beberapa saat.",
  },
});

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("combined"));
app.use(express.static(path.join(__dirname, "..", "public")));
app.use("/paraphrase", limiter);
app.use("/admin", adminLimiter);

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "parara",
  });
});

app.post("/auth/login", async (req, res, next) => {
  try {
    const rawSerial = typeof req.body?.serial === "string" ? req.body.serial : "";
    const serial = rawSerial.trim();

    if (!serial) {
      return res.status(400).json({
        error: "Serial number wajib diisi.",
      });
    }

    if (serial === SUPERADMIN_SERIAL) {
      return res.status(403).json({
        error: "Serial ini untuk akses superadmin. Gunakan halaman Superadmin.",
      });
    }

    const license = await licenseStore.findBySerial(serial);
    if (!license) {
      return res.status(401).json({
        error: "Serial number tidak terdaftar.",
      });
    }

    const currentIp = getClientIp(req);
    const existingSession = activeSessions.get(serial);

    if (existingSession && existingSession.ip !== currentIp) {
      return res.status(409).json({
        error: "Serial ini sedang aktif di IP lain. Coba lagi setelah user lain logout.",
      });
    }

    const token = crypto.randomBytes(24).toString("hex");
    activeSessions.set(serial, {
      ip: currentIp,
      token,
      createdAt: new Date().toISOString(),
    });

    return res.json({
      message: "Akses diberikan.",
      token,
      serial,
      ip: currentIp,
    });
  } catch (err) {
    next(err);
  }
});

app.get("/auth/session", (req, res) => {
  const token = getTokenFromRequest(req);
  const validation = validateSessionToken(token, req);

  if (!validation.ok) {
    return res.status(validation.status).json({
      error: validation.message,
    });
  }

  return res.json({
    authenticated: true,
    serial: validation.serial,
    ip: validation.session.ip,
  });
});

app.post("/auth/logout", (req, res) => {
  const token = getTokenFromRequest(req);
  const validation = validateSessionToken(token, req);

  if (!validation.ok) {
    return res.status(validation.status).json({
      error: validation.message,
    });
  }

  activeSessions.delete(validation.serial);
  return res.json({
    message: "Logout berhasil. Serial bisa dipakai perangkat/IP lain.",
  });
});

app.post("/admin/auth/login", (req, res) => {
  const rawSerial = typeof req.body?.serial === "string" ? req.body.serial : "";
  const serial = rawSerial.trim();

  if (!serial) {
    return res.status(400).json({
      error: "Serial superadmin wajib diisi.",
    });
  }

  if (serial !== SUPERADMIN_SERIAL) {
    return res.status(401).json({
      error: "Serial superadmin tidak valid.",
    });
  }

  const currentIp = getClientIp(req);
  if (adminSession && adminSession.ip !== currentIp) {
    return res.status(409).json({
      error: "Superadmin sedang aktif di IP lain. Logout dari sana terlebih dahulu.",
    });
  }

  const token = crypto.randomBytes(24).toString("hex");
  adminSession = {
    token,
    ip: currentIp,
    createdAt: new Date().toISOString(),
  };

  return res.json({
    message: "Superadmin masuk.",
    token,
    role: "superadmin",
    ip: currentIp,
  });
});

app.get("/admin/auth/session", (req, res) => {
  const token = getTokenFromRequest(req);
  const validation = validateAdminToken(token, req);

  if (!validation.ok) {
    return res.status(validation.status).json({
      error: validation.message,
    });
  }

  return res.json({
    authenticated: true,
    role: "superadmin",
    ip: validation.session.ip,
  });
});

app.post("/admin/auth/logout", (req, res) => {
  const token = getTokenFromRequest(req);
  const validation = validateAdminToken(token, req);

  if (!validation.ok) {
    return res.status(validation.status).json({
      error: validation.message,
    });
  }

  adminSession = null;
  return res.json({
    message: "Logout superadmin berhasil.",
  });
});

app.get("/admin/licenses", requireAdminSession, async (req, res, next) => {
  try {
    const licenses = await licenseStore.listLicenses();
    return res.json({ licenses });
  } catch (err) {
    return next(err);
  }
});

app.post("/admin/licenses", requireAdminSession, async (req, res, next) => {
  try {
    const row = await licenseStore.createLicense({
      serial: req.body?.serial,
      email: req.body?.email,
    });
    return res.status(201).json({ license: row });
  } catch (err) {
    const status = err.statusCode || 500;
    if (status >= 500) {
      return next(err);
    }
    return res.status(status).json({ error: err.message });
  }
});

app.put("/admin/licenses/:id", requireAdminSession, async (req, res, next) => {
  try {
    const existing = await licenseStore.listLicenses();
    const previous = existing.find((row) => row.id === req.params.id);
    const row = await licenseStore.updateLicense(req.params.id, {
      serial: req.body?.serial,
      email: req.body?.email,
    });
    if (previous?.serial) {
      const oldSerial = String(previous.serial).trim();
      const newSerial = String(row.serial).trim();
      if (oldSerial !== newSerial) {
        activeSessions.delete(oldSerial);
      }
    }
    return res.json({ license: row });
  } catch (err) {
    const status = err.statusCode || 500;
    if (status >= 500) {
      return next(err);
    }
    return res.status(status).json({ error: err.message });
  }
});

app.delete("/admin/licenses/:id", requireAdminSession, async (req, res, next) => {
  try {
    const licenses = await licenseStore.listLicenses();
    const target = licenses.find((row) => row.id === req.params.id);
    await licenseStore.deleteLicense(req.params.id);
    if (target?.serial) {
      activeSessions.delete(target.serial.trim());
    }
    return res.json({ message: "Lisensi dihapus." });
  } catch (err) {
    const status = err.statusCode || 500;
    if (status >= 500) {
      return next(err);
    }
    return res.status(status).json({ error: err.message });
  }
});

app.post(
  "/paraphrase",
  requireAccessSession,
  validateParaphraseRequest,
  paraphraseController.paraphrase,
);

app.use((err, _req, res, _next) => {
  // Keep error output generic to avoid leaking internals.
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || "Terjadi kesalahan pada server.",
  });
});

module.exports = app;
