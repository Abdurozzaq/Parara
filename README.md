# Parara

Aplikasi paraphrase teks bahasa Indonesia yang berjalan **secara lokal** di komputer Anda. Antarmuka utama disajikan lewat **aplikasi desktop Windows** (Electron): server Express berjalan di dalam aplikasi, jadi Anda tidak perlu membuka browser secara terpisah.

Fitur inti pipeline pemrosesan:

- normalisasi teks
- perbaikan typo/ejaan ringan
- grammar check berbasis rule sederhana
- perbaikan tanda baca dan kapitalisasi
- penggantian sinonim Indonesia
- transformasi struktur kalimat
- variasi frasa umum
- penyesuaian gaya bahasa
- humanization untuk hasil lebih natural

Parara open source dan gratis tanpa sistem lisensi serial.  
Kredit proyek: [Abdurozzaq Nurul Hadi](https://github.com/Abdurozzaq/Parara).

## Aplikasi desktop Windows (disarankan)

### Prasyarat

- [Node.js](https://nodejs.org/) (disarankan LTS)
- Windows 10/11 (x64)

### Instalasi dependensi

```bash
npm install
```

### Menjalankan aplikasi desktop (tanpa build installer)

```bash
npm run desktop:start
```

Perintah di atas memakai Electron dan membuka jendela Parara. Server HTTP internal dipilih secara dinamis (biasanya `127.0.0.1` dengan port acak) sehingga tidak bentrok dengan aplikasi lain.

### Membuat installer Windows (`.exe`)

```bash
npm run desktop:dist
```

Artefak utama ada di folder `dist/`:

- **Installer NSIS**: `dist/Parara-Setup-<versi>.exe` (nama mengikuti `version` di `package.json`)

Icon aplikasi Windows berasal dari `assets/parara.ico`. Jika ingin mengubah tampilan icon, edit alur di `scripts/generate-icon.js` lalu jalankan:

```bash
npm run generate:icon
```

Setelah itu build ulang dengan `npm run desktop:dist`.

### Portable EXE dan otomatisasi MSIX (Microsoft Store)

**Portable (satu file `.exe`, tanpa installer NSIS):**

```bash
npm run desktop:portable
```

Artefak: `dist/Parara-portable-<versi>.exe` (lihat [`electron-builder.portable.cjs`](electron-builder.portable.cjs)).

**Installer NSIS untuk MSIX CLI (disarankan):** MSIX Packaging Tool membutuhkan **installer .exe** yang bisa dijalankan **unattended** (biasanya NSIS dengan `/S`). Template bawaan memakai `dist/Parara-Setup-<versi>.exe` + `Arguments="/S"`. Bangun dulu dengan `npm run desktop:dist:unsigned` atau `npm run desktop:dist`.

**Folder `win-unpacked`:** hanya untuk eksperimen; untuk CLI set `MSIX_PACKAGING_MODE=unpacked` dan **wajib** `MSIX_INSTALLER_ARGUMENTS` (Parara.exe biasanya **bukan** installer sunyi—lebih mudah pakai NSIS di atas).

```bash
npm run desktop:unpack
```

**Template + CLI MSIX Packaging Tool:**

1. Pasang [MSIX Packaging Tool](https://www.microsoft.com/p/msix-packaging-tool/9n5lw3jbcxkf) dari Microsoft Store dan pastikan alias **`MsixPackagingTool.exe`** tersedia (biasanya butuh **PowerShell sebagai administrator** untuk `create-package`).
2. Set identitas (sesuaikan dengan Partner Center / sertifikat publisher):

   - `MSIX_PUBLISHER_CN` — misalnya `CN=Nama Anda` (harus konsisten dengan akun developer).
   - `MSIX_PUBLISHER_DISPLAY` — nama tampilan publisher.
   - `MSIX_PACKAGE_NAME` — nama paket identitas (huruf/angka), default `Parara`.

3. Generate template + jalankan tool:

```bash
npm run desktop:msix:template
npm run desktop:msix
```

Atau satu rangkaian (installer NSIS unsigned → template → packaging):

```bash
npm run desktop:msix:full
```

Dengan signing dari `.env`: `npm run desktop:msix:full:signed`.

Berkas keluaran target: `dist/msix/Parara-<versi>.msix` (versi empat segmen dari `package.json`).

**Argumen installer:** opsional `MSIX_INSTALLER_ARGUMENTS` (default **`/S`** untuk NSIS/portable).

**Mode portable ke MSIX:** `MSIX_PACKAGING_MODE=portable`, lalu `npm run desktop:portable`, `npm run desktop:msix:template`, `npm run desktop:msix`.

Detail CLI: [Create a package using the command line interface](https://learn.microsoft.com/en-us/windows/msix/packaging-tool/package-conversion-command-line). Template sumber: [`msix/conversion-template.xml`](msix/conversion-template.xml); hasil terisi: `dist/msix/conversion.generated.xml`.

**Template / CLI:** `<Installer>` memakai skema `template/2018` + **`Arguments="/S"`** (atau nilai `MSIX_INSTALLER_ARGUMENTS`) agar tool tidak meminta *UnattendedInstallWithoutArgument*. Input default adalah **`Parara-Setup-*.exe`**, bukan `Parara.exe` mentah dari `win-unpacked`.

**MSIX harus “terpercaya” (error 0x800B010A):** pesan *publisher certificate could not be verified* artinya Windows **tidak mempercayai rantai sertifikat** yang menandatangani paket `.msix` (bukan bug Parara). Umumnya:

- **Sideload / coba di PC sendiri:** paket harus ditandatangani dengan sertifikat **code signing** yang valid, atau untuk uji saja impor **sertifikat publik (.cer)** publisher ke *Local Machine → Trusted People* (Administrator), lalu pasang ulang MSIX. Sertifikat **self-signed** atau **bukan code signing** tidak dipercaya mesin lain.
- **Microsoft Store:** setelah unggah ke Partner Center, alur Store menangani kepercayaan sesuai kebijakan Microsoft; paket lokal yang dibuat MSIX Packaging Tool sering tetap perlu **publisher identity** yang cocok dengan akun developer dan panduan signing Store.

**Menandatangani `.msix` setelah dibuat** (jika Anda punya `.pfx` code signing + Windows SDK), contoh:

```powershell
signtool sign /fd SHA256 /f "C:\path\ke\codesign.pfx" /p "SANDI" /tr http://timestamp.digicert.com /td SHA256 "dist\msix\Parara-1.0.0.0.msix"
```

`PublisherName` di template (`MSIX_PUBLISHER_CN`, mis. `CN=...`) harus **selaras** dengan subjek sertifikat yang dipakai menandatangani MSIX. Lihat [Sign an MSIX package](https://learn.microsoft.com/en-us/windows/msix/package/sign-app-package-using-signtool).

### Code signing (Microsoft Store Policy 10.2.9)

Untuk pengiriman ke **Microsoft Store** sebagai paket Win32 (installer NSIS), biner harus memiliki **tanda tangan Authenticode SHA-256** dari rantai kepercayaan yang diterima. Tanpa itu, Partner Center akan menandai pelanggaran kebijakan **10.2.9**.

**Sertifikat:** siapkan sertifikat **code signing** (biasanya OV/EV, algoritme SHA-256) dari CA yang diakui, atau gunakan layanan **[Trusted Signing](https://learn.microsoft.com/en-us/azure/trusted-signing/overview)** di Azure sesuai panduan Microsoft. Jangan mengunggah file `.pfx` ke repositori; file tersebut sudah dicantumkan di `.gitignore`.

**Build bertanda tangan (disarankan untuk rilis Store):** `electron-builder` **tidak** membaca `.env` secara otomatis. Pilih salah satu:

- **`npm run desktop:dist:signed`** — memuat `.env` lalu menjalankan build (pastikan di `.env` ada `CSC_LINK` dan `CSC_KEY_PASSWORD` tanpa spasi di sekitar `=`, path bisa memakai bentuk `C:/...`); atau
- **PowerShell:** `$env:CSC_LINK = "C:\path\ke\cert.pfx"; $env:CSC_KEY_PASSWORD = "..."; npm run desktop:dist`

Variabel:

- `CSC_LINK` — path absolut ke file `.pfx`, atau URL HTTPS ke arsip sertifikat (lihat [dokumentasi electron-builder tentang code signing](https://www.electron.build/code-signing)).
- `CSC_KEY_PASSWORD` — sandi untuk `.pfx` (jangan commit; folder `key/` di-ignore oleh git).

**Penting:** `.pfx` harus berupa **sertifikat code signing** (EKU *Code Signing*), bukan sertifikat **TLS/SSL** untuk website (misalnya *origin certificate*). Kalau `Get-AuthenticodeSignature` tetap `NotSigned` setelah env benar, biasanya berarti `signtool` menolak sertifikat itu untuk menandatangani `.exe`.

Alternatif: isi `certificateFile` / `certificatePassword` di `package.json` under `build.win` hanya jika Anda yakin tidak akan pernah commit rahasia (lebih aman tetap memakai variabel lingkungan atau secret CI).

**Build lokal tanpa sertifikat:** kontributor yang tidak punya sertifikat dapat memakai:

```bash
npm run desktop:dist:unsigned
```

Perintah ini memakai [`electron-builder.unsigned.cjs`](electron-builder.unsigned.cjs) (menyalin `build` dari `package.json` lalu menonaktifkan penandatanganan `.exe`); **jangan** mengunggah artefak unsigned ke Store.

**Verifikasi sebelum unggah:** setelah build bertanda tangan, jalankan di PowerShell:

```powershell
npm run desktop:verify-signature
```

Atau: `.\scripts\verify-windows-signature.ps1 -Artifact "dist\Parara-Setup-<versi>.exe"`. Status harus **Valid**.

**Trusted Signing (Azure):** electron-builder mendukung `azureSignOptions` di `build.win` untuk mengalihkan penandatanganan ke Azure; rinciannya ada di [dokumentasi electron-builder (Windows)](https://www.electron.build/win) dan [Trusted Signing](https://learn.microsoft.com/en-us/azure/trusted-signing/overview).

**Jika `npm run desktop:dist` gagal dengan error symlink** (`Cannot create symbolic link` saat mengekstrak cache `winCodeSign`): setelah `npm install`, skrip **`postinstall`** menyesuaikan biner `app-builder.exe` agar 7-Zip memakai switch **`-snl-`** (jangan pulihkan symlink) alih-alih **`-snld`**, sehingga ekstraksi `winCodeSign-*.7z` tidak membutuhkan hak symlink. Jika pesan itu masih muncul, jalankan `node scripts/patch-app-builder-win-7z.cjs` sekali lagi, hapus folder `%LOCALAPPDATA%\electron-builder\Cache\winCodeSign`, lalu ulangi build. **Cadangan:** aktifkan **Mode pengembang** di Windows (Pengaturan → Sistem → Untuk pengembang) atau jalankan terminal sebagai administrator.

`build.toolsets.winCodeSign` **1.1.0** memaketkan **signtool** lewat ZIP Windows terpisah (berguna saat Anda sudah punya sertifikat); itu tidak menggantikan langkah `rcedit` yang memicu unduhan `winCodeSign` di atas.

**Alternatif MSIX:** lihat bagian **Portable EXE dan otomatisasi MSIX** di atas; untuk alur manual, ikuti [MSIX Packaging Tool](https://learn.microsoft.com/en-us/windows/msix/packaging-tool/create-app-package) dan aturan Partner Center.

**Partner Center — “Add or remove programs” & bundleware (rekomendasi sertifikasi):**

- **Nama aplikasi di Programs and Features:** di [`package.json`](package.json), `build.nsis.uninstallDisplayName` disetel ke teks yang lebih deskriptif (bukan hanya “Parara” + versi), agar pengguna mudah mengenali produk. **Publisher** di ARP mengikuti `author.name` — samakan dengan nama publisher di **Partner Center** jika Microsoft meminta konsistensi.
- **Kebijakan 10.2.2 (bundleware):** Parara **tidak** memasang perangkat lunak pihak ketiga terpisah (tidak ada toolbar, tidak ada installer lain yang diselipkan). Isi paket = aplikasi Electron + dependensi Node yang tercantum di repo. Di **Certification notes** / tanggapan review, Anda bisa menulis bahwa satu-satunya entri ARP adalah Parara sendiri dan tidak ada bundling perangkat lunak tambahan yang melanggar kebijakan.

**Setelah lolos verifikasi lokal:** unggah ulang paket di Partner Center. Jika beralih dari Win32 ke MSIX dengan nama yang sama, ikuti petunjuk di dashboard untuk menghapus atau menyesuaikan listing yang bentrok.

### macOS dan Linux

**Installer resmi untuk macOS atau Linux tidak disertakan di repo ini.** Anda bisa membangunnya sendiri di mesin target (disarankan menjalankan `electron-builder` pada OS yang sama dengan target paket):

```bash
npm install
# Contoh: hanya macOS (jalankan di macOS)
npx electron-builder --mac

# Contoh: hanya Linux (jalankan di Linux)
npx electron-builder --linux
```

Untuk opsi target lengkap (DMG, AppImage, deb, dan lainnya), lihat dokumentasi [electron-builder](https://www.electron.build/).

## Mode pengembangan: API + browser lokal

Jika Anda mengembangkan atau ingin mengakses Parara seperti layanan web lokal:

```bash
npm install
npm run dev
```

Server berjalan di `http://localhost:3000` (atau port dari variabel lingkungan `PORT`).

## Endpoint API

### `POST /paraphrase`

Satu request menjalankan correction pipeline lokal terlebih dahulu, lalu meneruskan hasilnya ke engine paraphrase.

Request body:

```json
{
  "text": "Oleh karena itu, sistem ini membantu pengguna menyelesaikan masalah dengan cepat.",
  "mode": "formal",
  "strength": 4,
  "preserve_keywords": ["pengguna"]
}
```

Contoh `curl` (mode web lokal, port default 3000):

```bash
curl -X POST http://localhost:3000/paraphrase \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"Oleh karena itu, sistem ini membantu pengguna menyelesaikan masalah dengan cepat.\",\"mode\":\"formal\",\"strength\":4,\"preserve_keywords\":[\"pengguna\"]}"
```

Contoh respons:

```json
{
  "original": "Oleh karena itu, sistem ini membantu pengguna menyelesaikan masalah dengan cepat.",
  "paraphrased": "Karena itu, sistem ini mendukung pengguna menyelesaikan kendala dengan segera.",
  "techniques_used": [
    "text_normalization",
    "typo_correction",
    "grammar_fix",
    "punctuation_fix",
    "synonym_replacement",
    "phrase_expression_variation",
    "style_adjustment_formal",
    "humanization"
  ],
  "similarity_score": 72.31
}
```

## Struktur proyek

```text
electron/          # proses utama Electron (desktop)
public/            # antarmuka web yang dilayani Express
src/               # server Express, engine paraphrase, data
assets/            # icon desktop (mis. parara.ico)
scripts/           # utilitas build, mis. generate icon
tests/
```

## Testing

```bash
npm test
```

## Generate data sinonim

Generator mengambil sinonim dari sumber yang sama dengan package `synonym-antonym-indonesia`, yaitu `sinonimkata.com`. Konfigurasi default dibaca dari file `.env`.

1. Siapkan daftar kata di `wordlist.txt` (atau file lain via env `SYNONYM_WORDLIST`).
2. Jalankan generator:

```bash
npm run generate:synonyms
```

Output default ditulis ke `src/data/synonyms.generated.json` agar tidak menimpa `src/data/synonyms.json` yang sudah dikurasi manual.

Env opsional:

- `SYNONYM_WORD_LIMIT` (default: `3000`, pakai `all`/`full`/`0` untuk proses semua isi `wordlist.txt`)
- `SYNONYM_MAX_REPLACEMENTS` (default: `8`)
- `SYNONYM_REQUEST_DELAY_MS` (default: `350`)
- `SYNONYM_CPU_TARGET` (default: `0.75`, otomatis jadi jumlah worker dari logical CPU)
- `SYNONYM_MAX_CONCURRENCY` (opsional, override langsung jumlah worker)
- `SYNONYM_REQUIRE_IN_WORDLIST=1` untuk memaksa sinonim harus ada di wordlist
