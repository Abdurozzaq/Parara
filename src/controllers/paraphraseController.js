const paraphraseEngine = require("../services/paraphraseEngine");

async function paraphrase(req, res, next) {
  try {
    const result = await paraphraseEngine.paraphrase(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  paraphrase,
};
