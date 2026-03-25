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
const modeButtons = Array.from(document.querySelectorAll("[data-mode]"));
const serialInput = document.getElementById("serialInput");
const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");
const accessHint = document.getElementById("accessHint");

const EXAMPLE_TEXT =
  "Oleh karena itu, sistem ini membantu pengguna menyelesaikan masalah dengan cepat tanpa mengurangi kualitas hasil yang diberikan.";

let selectedMode = "formal";
let latestResult = "";
let accessToken = localStorage.getItem("parara_access_token") || "";
let sessionSerial = localStorage.getItem("parara_serial") || "";
let isAuthenticated = false;

function setFeedback(message, tone = "default") {
  feedbackMessage.textContent = message;
  feedbackMessage.classList.remove("is-error", "is-success");

  if (tone === "error") {
    feedbackMessage.classList.add("is-error");
  }

  if (tone === "success") {
    feedbackMessage.classList.add("is-success");
  }
}

function setAccessHint(message, tone = "default") {
  accessHint.textContent = message;
  accessHint.classList.remove("is-error", "is-success");

  if (tone === "error") {
    accessHint.classList.add("is-error");
  }

  if (tone === "success") {
    accessHint.classList.add("is-success");
  }
}

function applyAccessState(authenticated) {
  isAuthenticated = authenticated;
  document.body.classList.toggle("is-locked", !authenticated);
  logoutButton.disabled = !authenticated;
  loginButton.disabled = authenticated;
  serialInput.disabled = authenticated;
}

function updateInputMeta() {
  const text = sourceText.value.trim();
  const wordCount = text ? text.split(/\s+/).length : 0;
  inputMeta.textContent = `${text.length} karakter • ${wordCount} kata`;
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
    latestResult = "";
    return;
  }

  resultBox.textContent = text;
  outputMeta.textContent = `${text.length} karakter`;
  copyButton.disabled = false;
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
  if (!isAuthenticated || !accessToken) {
    setFeedback("Akses belum aktif. Masukkan serial number terlebih dahulu.", "error");
    return;
  }

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
        Authorization: `Bearer ${accessToken}`,
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
  strengthInput.value = "4";
  strengthValue.textContent = "4";
  setMode("formal");
  renderResult("");
  renderTechniques([]);
  similarityScore.textContent = "-";
  setFeedback("Workspace direset. Masukkan teks baru untuk memulai.");
  updateInputMeta();
  sourceText.focus();
}

async function checkHealth() {
  try {
    const response = await fetch("/health");

    if (!response.ok) {
      throw new Error("Health check gagal");
    }

    apiStatus.textContent = "API connected";
  } catch (_error) {
    apiStatus.textContent = "API unavailable";
    setFeedback("Server belum merespons. Jalankan aplikasi lalu refresh halaman ini.", "error");
  }
}

async function activateAccess() {
  const serial = serialInput.value.trim();

  if (!serial) {
    setAccessHint("Serial number wajib diisi.", "error");
    serialInput.focus();
    return;
  }

  loginButton.disabled = true;
  setAccessHint("Memvalidasi serial number...");

  try {
    const response = await fetch("/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        serial,
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Login serial gagal.");
    }

    accessToken = data.token;
    sessionSerial = data.serial;
    localStorage.setItem("parara_access_token", accessToken);
    localStorage.setItem("parara_serial", sessionSerial);
    applyAccessState(true);
    setAccessHint(`Akses aktif untuk serial ${sessionSerial}.`, "success");
    setFeedback("Access checker aktif. Anda bisa mulai menggunakan editor.", "success");
  } catch (error) {
    applyAccessState(false);
    setAccessHint(error.message || "Gagal memvalidasi serial number.", "error");
  } finally {
    if (!isAuthenticated) {
      loginButton.disabled = false;
    }
  }
}

async function logoutAccess() {
  if (!accessToken) {
    applyAccessState(false);
    return;
  }

  logoutButton.disabled = true;
  setFeedback("Memproses logout akses serial...");

  try {
    await fetch("/auth/logout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch (_error) {
    // Cleanup local session even if server is unreachable.
  } finally {
    accessToken = "";
    sessionSerial = "";
    localStorage.removeItem("parara_access_token");
    localStorage.removeItem("parara_serial");
    applyAccessState(false);
    setAccessHint("Akses ditutup. Serial sekarang bisa dipakai perangkat/IP lain.");
    setFeedback("Logout akses selesai.", "success");
  }
}

async function restoreAccessSession() {
  if (!accessToken) {
    applyAccessState(false);
    setAccessHint("Akses belum aktif.");
    return;
  }

  setAccessHint("Memeriksa sesi akses...");

  try {
    const response = await fetch("/auth/session", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Sesi akses tidak valid.");
    }

    sessionSerial = data.serial || sessionSerial;
    applyAccessState(true);
    setAccessHint(`Sesi aktif: ${sessionSerial}.`, "success");
  } catch (_error) {
    accessToken = "";
    sessionSerial = "";
    localStorage.removeItem("parara_access_token");
    localStorage.removeItem("parara_serial");
    applyAccessState(false);
    setAccessHint("Sesi akses habis. Login ulang serial number.", "error");
  }
}

modeButtons.forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.mode));
});

strengthInput.addEventListener("input", () => {
  strengthValue.textContent = strengthInput.value;
});

sourceText.addEventListener("input", updateInputMeta);
submitButton.addEventListener("click", paraphraseText);
clearButton.addEventListener("click", resetWorkspace);
copyButton.addEventListener("click", copyResult);

fillExampleButton.addEventListener("click", () => {
  sourceText.value = EXAMPLE_TEXT;
  keywordsInput.value = "pengguna, sistem";
  updateInputMeta();
  setFeedback("Contoh input telah diisikan. Anda bisa langsung menjalankan paraphrase.");
});
loginButton.addEventListener("click", activateAccess);
logoutButton.addEventListener("click", logoutAccess);
serialInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !isAuthenticated) {
    activateAccess();
  }
});

updateInputMeta();
renderTechniques([]);
checkHealth();
restoreAccessSession();
