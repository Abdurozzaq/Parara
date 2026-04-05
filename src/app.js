const { getPublicDir, resolveOptionalResourcePath } = require("./runtimePaths");

const envPath = resolveOptionalResourcePath(".env");
require("dotenv").config(envPath ? { path: envPath } : undefined);

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const paraphraseController = require("./controllers/paraphraseController");
const { validateParaphraseRequest } = require("./utils/validation");

const app = express();

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Terlalu banyak permintaan. Coba lagi dalam beberapa saat.",
  },
});

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("combined"));
app.use(express.static(getPublicDir()));
app.use("/paraphrase", limiter);

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "parara",
  });
});

app.post(
  "/paraphrase",
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
