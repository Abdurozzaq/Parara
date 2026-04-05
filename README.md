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
