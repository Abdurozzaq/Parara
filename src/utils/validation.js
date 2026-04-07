function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function validateParaphraseRequest(req, _res, next) {
  const body = req.body || {};
  const { text, mode = "formal", preserve_keywords: preserveKeywords = [] } = body;

  if (typeof text !== "string" || !text.trim()) {
    return next(createHttpError("Field 'text' wajib berupa string yang tidak kosong."));
  }

  if (!["formal", "santai", "akademik"].includes(mode)) {
    return next(createHttpError("Field 'mode' harus bernilai formal, santai, atau akademik."));
  }

  if ("bypass_ai_detector" in body && typeof body.bypass_ai_detector !== "boolean") {
    return next(createHttpError("Field 'bypass_ai_detector' harus berupa boolean."));
  }

  const bypassAiDetector = body.bypass_ai_detector === true;

  let strength;
  if (bypassAiDetector) {
    strength = 4;
  } else {
    strength = body.strength ?? 3;
    if (!Number.isInteger(strength) || strength < 1 || strength > 8) {
      return next(createHttpError("Field 'strength' harus berupa integer antara 1 sampai 8."));
    }
  }

  if (!Array.isArray(preserveKeywords) || preserveKeywords.some((item) => typeof item !== "string")) {
    return next(createHttpError("Field 'preserve_keywords' harus berupa array string."));
  }

  req.body = {
    text: text.trim(),
    mode,
    strength,
    preserve_keywords: [...new Set(preserveKeywords.map((keyword) => keyword.trim()).filter(Boolean))],
    ...(bypassAiDetector ? { bypass_ai_detector: true } : {}),
  };

  return next();
}

module.exports = {
  createHttpError,
  validateParaphraseRequest,
};
