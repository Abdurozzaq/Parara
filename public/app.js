const sourceText = document.getElementById("sourceText");
const keywordsInput = document.getElementById("keywords");
const strengthInput = document.getElementById("strength");
const strengthValue = document.getElementById("strengthValue");
const inputMeta = document.getElementById("inputMeta");
const outputMeta = document.getElementById("outputMeta");
const resultBox = document.getElementById("resultBox");
const similarityScore = document.getElementById("similarityScore");
const techniquesList = document.getElementById("techniquesList");
const feedbackMessage = document.getElementById("feedbackMessage");
const submitButton = document.getElementById("submitButton");
const clearButton = document.getElementById("clearButton");
const copyButton = document.getElementById("copyButton");
const fillExampleButton = document.getElementById("fillExampleButton");
const apiStatus = document.getElementById("apiStatus");
const liveWordCount = document.getElementById("liveWordCount");
const liveKeywordCount = document.getElementById("liveKeywordCount");
const liveReadingTime = document.getElementById("liveReadingTime");
const strengthHint = document.getElementById("strengthHint");
const modeButtons = Array.from(document.querySelectorAll("[data-mode]"));

const EXAMPLE_TEXT =
  "Oleh karena itu, sistem ini membantu pengguna menyelesaikan masalah dengan cepat tanpa mengurangi kualitas hasil yang diberikan.";

let selectedMode = "formal";
let latestResult = "";
const strengthDescriptions = {
  1: "Level 1 menjaga struktur tetap sangat dekat dengan teks asli.",
  2: "Level 2 memberi perubahan ringan untuk hasil yang tetap familiar.",
  3: "Level 3 mulai mengganti diksi dan susunan kalimat secara aman.",
  4: "Level 4 memberi hasil yang terasa berbeda tanpa terlalu agresif.",
  5: "Level 5 cocok untuk perubahan yang cukup terasa tapi masih aman dibaca natural.",
  6: "Level 6 mendorong variasi kalimat dan frasa lebih aktif.",
  7: "Level 7 membuat hasil jauh lebih berbeda untuk kebutuhan rewrite berat.",
  8: "Level 8 adalah mode paling agresif untuk paraphrase maksimal.",
};

function setFeedback(message, tone = "default") {
  if (!feedbackMessage) {
    return;
  }

  feedbackMessage.textContent = message;
  feedbackMessage.classList.remove("is-error", "is-success");

  if (tone === "error") {
    feedbackMessage.classList.add("is-error");
  }

  if (tone === "success") {
    feedbackMessage.classList.add("is-success");
  }
}

function updateInputMeta() {
  const text = sourceText.value.trim();
  const wordCount = text ? text.split(/\s+/).length : 0;
  const sentenceCount = text ? (text.match(/[^.!?]+[.!?]?/g) || []).filter(Boolean).length : 0;
  const readingMinutes = wordCount ? Math.max(1, Math.ceil(wordCount / 180)) : 0;

  inputMeta.textContent = `${text.length} karakter • ${wordCount} kata`;
  liveWordCount.textContent = `${wordCount} kata`;
  liveReadingTime.textContent = `${readingMinutes} menit baca`;
  apiStatus.dataset.inputState = sentenceCount ? "ready" : "idle";
}

function updateKeywordMeta() {
  const keywordCount = parseKeywords(keywordsInput.value).length;
  liveKeywordCount.textContent = `${keywordCount} keyword`;
}

function updateStrengthMeta() {
  const currentStrength = Number(strengthInput.value);
  strengthValue.textContent = String(currentStrength);
  strengthHint.textContent = strengthDescriptions[currentStrength] || strengthDescriptions[5];
}

function setApiStatus(label, tone = "default") {
  apiStatus.textContent = label;
  apiStatus.classList.remove("is-online", "is-offline");

  if (tone === "online") {
    apiStatus.classList.add("is-online");
  }

  if (tone === "offline") {
    apiStatus.classList.add("is-offline");
  }
}

function setMode(mode) {
  selectedMode = mode;

  modeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === mode);
  });
}

function parseKeywords(rawValue) {
  return [...new Set(rawValue.split(",").map((item) => item.trim()).filter(Boolean))];
}

function renderResult(text) {
  if (!text) {
    resultBox.innerHTML =
      '<p class="placeholder-text">Hasil paraphrase akan muncul di sini setelah proses dijalankan.</p>';
    outputMeta.textContent = "Belum ada hasil";
    copyButton.disabled = true;
    resultBox.classList.remove("has-result");
    latestResult = "";
    return;
  }

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  resultBox.textContent = text;
  outputMeta.textContent = `${text.length} karakter • ${wordCount} kata`;
  copyButton.disabled = false;
  resultBox.classList.add("has-result");
  latestResult = text;
}

function renderTechniques(techniques) {
  techniquesList.innerHTML = "";

  if (!Array.isArray(techniques) || !techniques.length) {
    const emptyTag = document.createElement("span");
    emptyTag.className = "tag muted-tag";
    emptyTag.textContent = "Belum ada data";
    techniquesList.appendChild(emptyTag);
    return;
  }

  techniques.forEach((technique) => {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = technique.replaceAll("_", " ");
    techniquesList.appendChild(tag);
  });
}

function setLoadingState(isLoading) {
  submitButton.disabled = isLoading;
  clearButton.disabled = isLoading;
  fillExampleButton.disabled = isLoading;
  sourceText.disabled = isLoading;
  keywordsInput.disabled = isLoading;
  strengthInput.disabled = isLoading;

  modeButtons.forEach((button) => {
    button.disabled = isLoading;
  });

  resultBox.classList.toggle("is-loading", isLoading);

  if (isLoading) {
    submitButton.textContent = "Memproses...";
  } else {
    submitButton.textContent = "Parafrase sekarang";
  }
}

async function paraphraseText() {
  const text = sourceText.value.trim();

  if (!text) {
    setFeedback("Masukkan teks terlebih dahulu sebelum menjalankan paraphrase.", "error");
    sourceText.focus();
    return;
  }

  setLoadingState(true);
  setFeedback("Memproses teks dan menyiapkan hasil paraphrase...");

  try {
    const response = await fetch("/paraphrase", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        mode: selectedMode,
        strength: Number(strengthInput.value),
        preserve_keywords: parseKeywords(keywordsInput.value),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Permintaan gagal diproses.");
    }

    renderResult(data.paraphrased || "");
    renderTechniques(data.techniques_used);
    similarityScore.textContent =
      typeof data.similarity_score === "number" ? data.similarity_score.toFixed(2) : "-";
    setFeedback("Paraphrase berhasil dibuat. Anda bisa langsung copy hasilnya.", "success");
  } catch (error) {
    renderResult("");
    renderTechniques([]);
    similarityScore.textContent = "-";
    setFeedback(error.message || "Terjadi kesalahan saat memproses request.", "error");
  } finally {
    setLoadingState(false);
  }
}

async function copyResult() {
  if (!latestResult) {
    return;
  }

  try {
    await navigator.clipboard.writeText(latestResult);
    setFeedback("Hasil berhasil disalin ke clipboard.", "success");
  } catch (_error) {
    setFeedback("Clipboard tidak tersedia. Silakan copy hasil secara manual.", "error");
  }
}

function resetWorkspace() {
  sourceText.value = "";
  keywordsInput.value = "";
  strengthInput.value = "5";
  setMode("formal");
  renderResult("");
  renderTechniques([]);
  similarityScore.textContent = "-";
  setFeedback("Workspace direset. Masukkan teks baru untuk memulai.");
  updateInputMeta();
  updateKeywordMeta();
  updateStrengthMeta();
  sourceText.focus();
}

async function checkHealth() {
  try {
    const response = await fetch("/health");

    if (!response.ok) {
      throw new Error("Health check gagal");
    }

    setApiStatus("READY TO USE", "online");
  } catch (_error) {
    setApiStatus("BACKEND UNAVAILABLE", "offline");
    setFeedback("Server belum merespons. Jalankan aplikasi lalu refresh halaman ini.", "error");
  }
}

modeButtons.forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.mode));
});

sourceText.addEventListener("input", updateInputMeta);
keywordsInput.addEventListener("input", updateKeywordMeta);
strengthInput.addEventListener("input", updateStrengthMeta);
submitButton.addEventListener("click", paraphraseText);
clearButton.addEventListener("click", resetWorkspace);
copyButton.addEventListener("click", copyResult);

fillExampleButton.addEventListener("click", () => {
  sourceText.value = EXAMPLE_TEXT;
  keywordsInput.value = "pengguna, sistem";
  strengthInput.value = "5";
  updateInputMeta();
  updateKeywordMeta();
  updateStrengthMeta();
  setFeedback("Contoh input telah diisikan. Anda bisa langsung menjalankan paraphrase.");
});

updateInputMeta();
updateKeywordMeta();
updateStrengthMeta();
renderTechniques([]);
checkHealth();
setFeedback("Parara open source siap digunakan. Masukkan teks untuk mulai paraphrase.", "success");
