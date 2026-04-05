# Parara

API Express.js untuk paraphrasing teks bahasa Indonesia secara lokal dengan pipeline berlapis:

- normalisasi teks
- perbaikan typo/ejaan ringan
- grammar check berbasis rule sederhana
- perbaikan tanda baca dan kapitalisasi
- penggantian sinonim Indonesia
- transformasi struktur kalimat
- variasi frasa umum
- penyesuaian gaya bahasa
- humanization untuk hasil lebih natural

Parara kini berjalan sebagai aplikasi open source gratis tanpa sistem lisensi serial.
Kredit proyek: [Abdurozzaq Nurul Hadi](https://github.com/Abdurozzaq/Parara).

## Menjalankan

```bash
npm install
npm run dev
```

Server berjalan di `http://localhost:3000`.

## Endpoint

### `POST /paraphrase`

Satu request akan menjalankan correction pipeline lokal terlebih dahulu, lalu meneruskan hasilnya ke engine paraphrase.

Request body:

```json
{
  "text": "Oleh karena itu, sistem ini membantu pengguna menyelesaikan masalah dengan cepat.",
  "mode": "formal",
  "strength": 4,
  "preserve_keywords": ["pengguna"]
}
```

Contoh `curl`:

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

## Struktur

```text
src/
  app.js
  controllers/
  data/
  services/
  utils/
tests/
```

## Testing

```bash
npm test
```

## Generate Data Sinonim

Generator mengambil sinonim dari sumber yang sama dengan package `synonym-antonym-indonesia`, yaitu `sinonimkata.com`.
Konfigurasi default dibaca dari file `.env`.

1. Siapkan daftar kata di `wordlist.txt` (atau file lain via env `SYNONYM_WORDLIST`).
2. Jalankan generator:

```bash
npm run generate:synonyms
```

Output default akan ditulis ke `src/data/synonyms.generated.json` agar tidak menimpa `src/data/synonyms.json` yang sudah dikurasi manual.

Env opsional:

- `SYNONYM_WORD_LIMIT` (default: `3000`, pakai `all`/`full`/`0` untuk proses semua isi `wordlist.txt`)
- `SYNONYM_MAX_REPLACEMENTS` (default: `8`)
- `SYNONYM_REQUEST_DELAY_MS` (default: `350`)
- `SYNONYM_CPU_TARGET` (default: `0.75`, otomatis jadi jumlah worker dari logical CPU)
- `SYNONYM_MAX_CONCURRENCY` (opsional, override langsung jumlah worker)
- `SYNONYM_REQUIRE_IN_WORDLIST=1` untuk memaksa sinonim harus ada di wordlist
