const fs = require("fs");
const path = require("path");

const synonymEntries = require("../data/synonyms.json");

const COMMON_NORMALIZATION_MAP = {
  yg: "yang",
  dgn: "dengan",
  krn: "karena",
  utk: "untuk",
  dlm: "dalam",
  dr: "dari",
  tdk: "tidak",
  tsb: "tersebut",
  gk: "tidak",
  ga: "tidak",
  gak: "tidak",
  nggak: "tidak",
  ngga: "tidak",
  nggk: "tidak",
  karna: "karena",
  krna: "karena",
  sm: "sama",
  aja: "saja",
  bgt: "banget",
  cepet: "cepat",
  cepetnya: "cepatnya",
  dapet: "dapat",
  gimana: "bagaimana",
  gitu: "begitu",
  kalo: "kalau",
  klo: "kalau",
  udah: "sudah",
  udh: "sudah",
};

const FORMAL_NORMALIZATION_MAP = {
  banget: "sekali",
  aja: "saja",
  makanya: "oleh karena itu",
  biar: "agar",
  bikin: "membuat",
};

const COMMON_TYPO_MAP = {
  sistim: "sistem",
  resiko: "risiko",
  aktifitas: "aktivitas",
  analisa: "analisis",
  praktek: "praktik",
  ijin: "izin",
  sekedar: "sekadar",
  apotik: "apotek",
  kwalitas: "kualitas",
  trampil: "terampil",
  nopember: "november",
};

const FUNCTION_WORDS = new Set([
  "yang",
  "dan",
  "atau",
  "karena",
  "agar",
  "supaya",
  "untuk",
  "dengan",
  "tanpa",
  "di",
  "ke",
  "dari",
  "pada",
  "dalam",
  "oleh",
  "para",
  "sangat",
  "sekali",
  "tidak",
  "bukan",
  "belum",
  "jangan",
  "sudah",
  "akan",
  "sedang",
  "telah",
  "masih",
  "lebih",
  "kurang",
  "ini",
  "itu",
]);

const SUBJECT_HINTS = new Set([
  "saya",
  "aku",
  "kami",
  "kita",
  "anda",
  "kamu",
  "dia",
  "ia",
  "mereka",
  "parara",
  "platform",
  "sistem",
  "fitur",
  "aplikasi",
  "pengguna",
  "tim",
  "mahasiswa",
  "dosen",
]);

const PREPOSITIONS = new Set(["di", "ke", "dari", "pada", "dalam", "untuk", "dengan", "tanpa", "oleh"]);

function normalizeLookupKey(value) {
  return value.toLowerCase().trim();
}

function readWordlist() {
  const wordlistPath = path.join(__dirname, "../../wordlist.txt");

  try {
    return fs
      .readFileSync(wordlistPath, "utf8")
      .split(/\r?\n/)
      .map((entry) => normalizeLookupKey(entry))
      .filter(Boolean);
  } catch (_error) {
    return [];
  }
}

function addWordMetadata(map, word, modes = []) {
  const key = normalizeLookupKey(word);
  if (!key) {
    return;
  }

  if (!map.has(key)) {
    map.set(key, {
      modes: new Set(),
      canonical: key,
    });
  }

  modes.forEach((mode) => map.get(key).modes.add(mode));
}

function buildDictionaryBuckets(words) {
  const buckets = new Map();

  words.forEach((word) => {
    if (!/^[a-z-]+$/.test(word) || word.includes(" ")) {
      return;
    }

    const firstLetter = word.charAt(0);
    const bucketKey = `${firstLetter}:${word.length}`;

    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, []);
    }

    buckets.get(bucketKey).push(word);
  });

  return buckets;
}

function buildAssets() {
  const dictionaryWords = new Set();
  const wordMetadata = new Map();
  const variantToCanonical = new Map();
  const wordlist = readWordlist();

  wordlist.forEach((word) => {
    dictionaryWords.add(word);
    addWordMetadata(wordMetadata, word);
  });

  synonymEntries.forEach((entry) => {
    const modes = entry.modes || ["formal", "santai", "akademik"];
    const sourceKey = normalizeLookupKey(entry.source);

    dictionaryWords.add(sourceKey);
    addWordMetadata(wordMetadata, sourceKey, modes);
    variantToCanonical.set(sourceKey, sourceKey);

    entry.replacements.forEach((replacement) => {
      const replacementKey = normalizeLookupKey(replacement);
      dictionaryWords.add(replacementKey);
      addWordMetadata(wordMetadata, replacementKey, modes);

      if (!replacementKey.includes(" ")) {
        variantToCanonical.set(replacementKey, sourceKey);
      }
    });
  });

  Object.entries(COMMON_NORMALIZATION_MAP).forEach(([variant, canonical]) => {
    variantToCanonical.set(variant, canonical);
    dictionaryWords.add(canonical);
  });

  Object.entries(FORMAL_NORMALIZATION_MAP).forEach(([variant, canonical]) => {
    variantToCanonical.set(variant, canonical);
    dictionaryWords.add(canonical);
  });

  Object.entries(COMMON_TYPO_MAP).forEach(([variant, canonical]) => {
    variantToCanonical.set(variant, canonical);
    dictionaryWords.add(canonical);
  });

  return {
    commonNormalizationMap: COMMON_NORMALIZATION_MAP,
    formalNormalizationMap: FORMAL_NORMALIZATION_MAP,
    commonTypoMap: COMMON_TYPO_MAP,
    dictionaryWords,
    tokenDictionaryWords: new Set([...dictionaryWords].filter((word) => !word.includes(" "))),
    dictionaryBuckets: buildDictionaryBuckets(dictionaryWords),
    functionWords: FUNCTION_WORDS,
    subjectHints: SUBJECT_HINTS,
    prepositions: PREPOSITIONS,
    variantToCanonical,
    wordMetadata,
  };
}

module.exports = buildAssets();
