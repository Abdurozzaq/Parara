function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function validateParaphraseRequest(req, _res, next) {
  const { text, mode = "formal", strength = 3, preserve_keywords: preserveKeywords = [] } = req.body || {};

  if (typeof text !== "string" || !text.trim()) {
    return next(createHttpError("Field 'text' wajib berupa string yang tidak kosong."));
  }

  if (!["formal", "santai", "akademik"].includes(mode)) {
    return next(createHttpError("Field 'mode' harus bernilai formal, santai, atau akademik."));
  }

  if (!Number.isInteger(strength) || strength < 1 || strength > 5) {
    return next(createHttpError("Field 'strength' harus berupa integer antara 1 sampai 5."));
  }

  if (!Array.isArray(preserveKeywords) || preserveKeywords.some((item) => typeof item !== "string")) {
    return next(createHttpError("Field 'preserve_keywords' harus berupa array string."));
  }

  req.body = {
    text: text.trim(),
    mode,
    strength,
    preserve_keywords: [...new Set(preserveKeywords.map((keyword) => keyword.trim()).filter(Boolean))],
  };

  return next();
}

module.exports = {
  createHttpError,
  validateParaphraseRequest,
};
