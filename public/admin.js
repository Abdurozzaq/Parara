const adminLoginPanel = document.getElementById("adminLoginPanel");
const adminWorkspace = document.getElementById("adminWorkspace");
const superadminSerialInput = document.getElementById("superadminSerialInput");
const superadminLoginButton = document.getElementById("superadminLoginButton");
const adminLoginHint = document.getElementById("adminLoginHint");
const adminLogoutButton = document.getElementById("adminLogoutButton");

const licenseForm = document.getElementById("licenseForm");
const licenseEditId = document.getElementById("licenseEditId");
const licenseSerialInput = document.getElementById("licenseSerialInput");
const licenseEmailInput = document.getElementById("licenseEmailInput");
const licenseSubmitButton = document.getElementById("licenseSubmitButton");
const licenseCancelEditButton = document.getElementById("licenseCancelEditButton");
const licenseFormTitle = document.getElementById("licenseFormTitle");
const licenseFormHint = document.getElementById("licenseFormHint");
const licensesTableBody = document.getElementById("licensesTableBody");
const licensesEmptyState = document.getElementById("licensesEmptyState");
const refreshLicensesButton = document.getElementById("refreshLicensesButton");

const ADMIN_TOKEN_KEY = "parara_admin_token";

let adminToken = localStorage.getItem(ADMIN_TOKEN_KEY) || "";

function setAdminLoginHint(message, tone = "default") {
  adminLoginHint.textContent = message;
  adminLoginHint.classList.remove("is-error", "is-success");

  if (tone === "error") {
    adminLoginHint.classList.add("is-error");
  }

  if (tone === "success") {
    adminLoginHint.classList.add("is-success");
  }
}

function setLicenseFormHint(message, tone = "default") {
  licenseFormHint.textContent = message;
  licenseFormHint.classList.remove("is-error", "is-success");

  if (tone === "error") {
    licenseFormHint.classList.add("is-error");
  }

  if (tone === "success") {
    licenseFormHint.classList.add("is-success");
  }
}

function showWorkspace(visible) {
  adminLoginPanel.hidden = visible;
  adminWorkspace.hidden = !visible;
  if (visible) {
    adminWorkspace.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function resetLicenseForm() {
  licenseEditId.value = "";
  licenseSerialInput.value = "";
  licenseEmailInput.value = "";
  licenseFormTitle.textContent = "Tambah lisensi";
  licenseSubmitButton.textContent = "Simpan";
  licenseCancelEditButton.hidden = true;
  setLicenseFormHint("");
}

function startEditLicense(row) {
  licenseEditId.value = row.id;
  licenseSerialInput.value = row.serial;
  licenseEmailInput.value = row.email;
  licenseFormTitle.textContent = "Edit lisensi";
  licenseSubmitButton.textContent = "Simpan perubahan";
  licenseCancelEditButton.hidden = false;
  setLicenseFormHint(`Mengedit: ${row.serial}`);
  licenseSerialInput.focus();
}

function formatDate(iso) {
  if (!iso) {
    return "-";
  }
  try {
    return new Date(iso).toLocaleString("id-ID");
  } catch (_err) {
    return iso;
  }
}

function renderLicenses(licenses) {
  licensesTableBody.innerHTML = "";

  if (!Array.isArray(licenses) || !licenses.length) {
    licensesEmptyState.hidden = false;
    return;
  }

  licensesEmptyState.hidden = true;

  licenses.forEach((row) => {
    const tr = document.createElement("tr");

    const serialTd = document.createElement("td");
    serialTd.textContent = row.serial;

    const emailTd = document.createElement("td");
    emailTd.textContent = row.email;

    const createdTd = document.createElement("td");
    createdTd.textContent = formatDate(row.createdAt);

    const actionsTd = document.createElement("td");
    actionsTd.className = "admin-table-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "ghost-button admin-table-button";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => startEditLicense(row));

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "ghost-button admin-table-button is-danger";
    deleteBtn.textContent = "Hapus";
    deleteBtn.addEventListener("click", () => deleteLicense(row));

    actionsTd.append(editBtn, deleteBtn);
    tr.append(serialTd, emailTd, createdTd, actionsTd);
    licensesTableBody.appendChild(tr);
  });
}

async function fetchLicenses() {
  const response = await fetch("/admin/licenses", {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });
  let data = {};
  try {
    data = await response.json();
  } catch (_err) {
    // body bukan JSON
  }

  if (!response.ok) {
    if (response.status === 401) {
      adminToken = "";
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      showWorkspace(false);
      setAdminLoginHint(
        "Sesi superadmin tidak valid lagi (misalnya setelah server restart). Silakan login ulang.",
        "error",
      );
    }
    throw new Error(data.error || "Gagal memuat lisensi.");
  }

  renderLicenses(data.licenses || []);
}

async function deleteLicense(row) {
  if (!window.confirm(`Hapus lisensi untuk serial "${row.serial}"?`)) {
    return;
  }

  setLicenseFormHint("Menghapus lisensi...");

  try {
    const response = await fetch(`/admin/licenses/${encodeURIComponent(row.id)}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Gagal menghapus lisensi.");
    }

    setLicenseFormHint("Lisensi dihapus.", "success");
    await fetchLicenses();
  } catch (error) {
    setLicenseFormHint(error.message || "Gagal menghapus.", "error");
  }
}

async function adminLogin() {
  const serial = superadminSerialInput.value.trim();

  if (!serial) {
    setAdminLoginHint("Serial superadmin wajib diisi.", "error");
    superadminSerialInput.focus();
    return;
  }

  superadminLoginButton.disabled = true;
  setAdminLoginHint("Memverifikasi serial...");

  try {
    const response = await fetch("/admin/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ serial }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Login superadmin gagal.");
    }

    adminToken = data.token;
    localStorage.setItem(ADMIN_TOKEN_KEY, adminToken);
    setAdminLoginHint("Masuk sebagai superadmin.", "success");
    showWorkspace(true);
    resetLicenseForm();
    await fetchLicenses();
  } catch (error) {
    setAdminLoginHint(error.message || "Login gagal.", "error");
  } finally {
    superadminLoginButton.disabled = false;
  }
}

async function restoreAdminSession() {
  if (!adminToken) {
    showWorkspace(false);
    setAdminLoginHint("Belum masuk.");
    return;
  }

  setAdminLoginHint("Memeriksa sesi superadmin...");

  try {
    const response = await fetch("/admin/auth/session", {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Sesi tidak valid.");
    }

    setAdminLoginHint("Sesi superadmin aktif.", "success");
    showWorkspace(true);
    await fetchLicenses();
  } catch (_error) {
    adminToken = "";
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    showWorkspace(false);
    setAdminLoginHint("Sesi habis. Login ulang.", "error");
  }
}

async function adminLogout() {
  adminLogoutButton.disabled = true;

  try {
    await fetch("/admin/auth/logout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
  } catch (_error) {
    // Tetap bersihkan token lokal.
  } finally {
    adminToken = "";
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    resetLicenseForm();
    showWorkspace(false);
    setAdminLoginHint("Logout superadmin selesai.");
    adminLogoutButton.disabled = false;
  }
}

licenseForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const serial = licenseSerialInput.value.trim();
  const email = licenseEmailInput.value.trim();
  const editId = licenseEditId.value.trim();

  if (!serial || !email) {
    setLicenseFormHint("Serial dan email wajib diisi.", "error");
    return;
  }

  licenseSubmitButton.disabled = true;
  setLicenseFormHint("Menyimpan...");

  try {
    const isEdit = Boolean(editId);
    const url = isEdit ? `/admin/licenses/${encodeURIComponent(editId)}` : "/admin/licenses";
    const method = isEdit ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ serial, email }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Gagal menyimpan lisensi.");
    }

    setLicenseFormHint(isEdit ? "Perubahan disimpan." : "Lisensi ditambahkan.", "success");
    resetLicenseForm();
    await fetchLicenses();
  } catch (error) {
    setLicenseFormHint(error.message || "Gagal menyimpan.", "error");
  } finally {
    licenseSubmitButton.disabled = false;
  }
});

licenseCancelEditButton.addEventListener("click", () => {
  resetLicenseForm();
});

superadminLoginButton.addEventListener("click", adminLogin);
superadminSerialInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    adminLogin();
  }
});

adminLogoutButton.addEventListener("click", adminLogout);
refreshLicensesButton.addEventListener("click", async () => {
  refreshLicensesButton.disabled = true;
  try {
    await fetchLicenses();
    setLicenseFormHint("Daftar dimuat ulang.", "success");
  } catch (error) {
    setLicenseFormHint(error.message || "Gagal memuat ulang.", "error");
  } finally {
    refreshLicensesButton.disabled = false;
  }
});

restoreAdminSession();
