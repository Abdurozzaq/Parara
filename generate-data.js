require("dotenv").config();

const fs = require("fs");
const os = require("os");
const path = require("path");
const { load } = require("cheerio");

// ===== CONFIG =====
const INPUT_FILE = process.env.SYNONYM_WORDLIST || "./wordlist.txt";
const OUTPUT_FILE = process.env.SYNONYM_OUTPUT || "./src/data/synonyms.generated.json";
const WORD_LIMIT = Number(process.env.SYNONYM_WORD_LIMIT || 3000);
const MAX_REPLACEMENTS = Number(process.env.SYNONYM_MAX_REPLACEMENTS || 8);
const REQUEST_DELAY_MS = Number(process.env.SYNONYM_REQUEST_DELAY_MS || 350);
const SOURCE_BASE_URL = process.env.SYNONYM_SOURCE_URL || "http://www.sinonimkata.com";
const REQUIRE_IN_WORDLIST = process.env.SYNONYM_REQUIRE_IN_WORDLIST === "1";
const CPU_USAGE_TARGET = Number(process.env.SYNONYM_CPU_TARGET || 0.75);
const MAX_CONCURRENCY = Number(process.env.SYNONYM_MAX_CONCURRENCY || 0);
const WORD_LIMIT_RAW = process.env.SYNONYM_WORD_LIMIT;

const DEFAULT_MODES = ["formal", "akademik", "santai"];
const STOPWORDS = new Set(["yang", "dan", "di", "ke", "dari", "untuk", "pada", "dengan"]);

function normalize(word) {
  return String(word || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function isValidEntry(word) {
  if (!word || STOPWORDS.has(word)) {
    return false;
  }

  // Keep only clean Indonesian-like tokens/phrases for replacement.
  if (!/^[a-z\s-]+$/.test(word)) {
    return false;
  }

  if (word.startsWith("-") || word.endsWith("-")) {
    return false;
  }

  if (word.length < 3 || word.length > 32) {
    return false;
  }

  if (word.split(" ").length > 3) {
    return false;
  }

  return true;
}

function readWordList(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");

  const words = raw
    .split(/\r?\n/)
    .map(normalize)
    .filter(isValidEntry);

  return [...new Set(words)];
}

function resolveCpuCount() {
  if (typeof os.availableParallelism === "function") {
    return os.availableParallelism();
  }
  return os.cpus().length;
}

function resolveConcurrency() {
  if (MAX_CONCURRENCY > 0) {
    return Math.max(1, Math.floor(MAX_CONCURRENCY));
  }

  const cpuCount = Math.max(1, resolveCpuCount());
  const targetRatio = Number.isFinite(CPU_USAGE_TARGET) ? CPU_USAGE_TARGET : 0.75;
  const normalizedRatio = Math.min(1, Math.max(0.1, targetRatio));
  return Math.max(1, Math.floor(cpuCount * normalizedRatio));
}

function resolveWordLimit(totalWords) {
  if (!WORD_LIMIT_RAW) {
    return Math.min(totalWords, WORD_LIMIT);
  }

  const normalized = String(WORD_LIMIT_RAW).trim().toLowerCase();
  if (normalized === "all" || normalized === "full") {
    return totalWords;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return Math.min(totalWords, WORD_LIMIT);
  }

  if (parsed <= 0) {
    return totalWords;
  }

  return Math.min(totalWords, Math.floor(parsed));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildSearchUrl(word) {
  const query = new URLSearchParams({ q: word });
  return `${SOURCE_BASE_URL}/search.php/?${query.toString()}`;
}

async function resolveWordPage(word) {
  const response = await fetch(buildSearchUrl(word), {
    method: "GET",
    redirect: "manual",
  });

  if (!response.ok && response.status !== 302 && response.status !== 301) {
    return null;
  }

  const location = response.headers.get("location");
  if (!location) {
    return null;
  }

  return location.startsWith("http")
    ? location
    : `${SOURCE_BASE_URL}/${location.replace(/^\//, "")}`;
}

function parseSynonymsFromHtml(html) {
  const $ = load(html);
  const result = [];

  $("td.link").each((_, tableHeader) => {
    const headerText = $(tableHeader).text().trim().toLowerCase();
    if (!headerText.includes("sinonim")) {
      return;
    }

    const row = $(tableHeader).closest("tr");
    const sourceCell = row.find("td").eq(2);
    sourceCell.find("a").each((__, anchor) => {
      const candidate = normalize($(anchor).text());
      if (isValidEntry(candidate)) {
        result.push(candidate);
      }
    });
  });

  return [...new Set(result)];
}

async function fetchSynonyms(word) {
  const pageUrl = await resolveWordPage(word);
  if (!pageUrl) {
    return [];
  }

  const response = await fetch(pageUrl);
  if (!response.ok) {
    return [];
  }

  const html = await response.text();
  return parseSynonymsFromHtml(html);
}

async function main() {
  const resolvedInputPath = path.resolve(INPUT_FILE);
  const resolvedOutputPath = path.resolve(OUTPUT_FILE);

  if (!fs.existsSync(resolvedInputPath)) {
    throw new Error(`Wordlist tidak ditemukan: ${resolvedInputPath}`);
  }

  const words = readWordList(resolvedInputPath);
  const wordSet = new Set(words);
  const targets = words.slice(0, resolveWordLimit(words.length));
  const concurrency = resolveConcurrency();

  console.log(
    `Processing ${targets.length} kata/frasa dari ${resolvedInputPath} (concurrency=${concurrency})...`,
  );

  const result = [];
  let processed = 0;
  let writeQueue = Promise.resolve();

  function writeSnapshot() {
    const snapshot = [...result].sort((a, b) => a.source.localeCompare(b.source, "id"));
    fs.writeFileSync(resolvedOutputPath, JSON.stringify(snapshot, null, 2));
  }

  function queueSnapshotWrite() {
    writeQueue = writeQueue
      .then(() => {
        writeSnapshot();
      })
      .catch(() => {
        // Keep queue alive if one write fails unexpectedly.
      });
    return writeQueue;
  }

  // Create/overwrite output file early, then update every 50 processed words.
  writeSnapshot();

  async function worker(workerIndex) {
    for (let index = workerIndex; index < targets.length; index += concurrency) {
      const word = targets[index];
      try {
        const synonyms = (await fetchSynonyms(word))
          .filter((candidate) => candidate && candidate !== word)
          .filter((candidate) => !REQUIRE_IN_WORDLIST || wordSet.has(candidate))
          .slice(0, MAX_REPLACEMENTS)
          .map((candidate) => candidate);

        if (synonyms.length > 0) {
          result.push({
            source: word,
            replacements: [...new Set(synonyms)],
            modes: DEFAULT_MODES,
          });
        }
      } catch (error) {
        // Skip failed network/parse for a word and continue generation.
      }

      processed += 1;
      if (processed % 50 === 0 || processed === targets.length) {
        console.log(`Processed ${processed}/${targets.length} kata...`);
        await queueSnapshotWrite();
      }
      await sleep(REQUEST_DELAY_MS);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, targets.length) }, (_, idx) => worker(idx)),
  );
  await queueSnapshotWrite();

  console.log(`Done! Generated ${result.length} entries -> ${resolvedOutputPath}`);
}

main().catch((error) => {
  console.error("Gagal generate sinonim:", error.message);
  process.exit(1);
});