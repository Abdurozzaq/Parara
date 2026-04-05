const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");
const toIco = require("to-ico");

const outputDir = path.join(__dirname, "..", "assets");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function mixColor(left, right, ratio) {
  return {
    r: Math.round(left.r + (right.r - left.r) * ratio),
    g: Math.round(left.g + (right.g - left.g) * ratio),
    b: Math.round(left.b + (right.b - left.b) * ratio),
  };
}

function drawRoundedRect(png, left, top, width, height, radius, color) {
  const maxX = left + width;
  const maxY = top + height;

  for (let y = top; y < maxY; y += 1) {
    for (let x = left; x < maxX; x += 1) {
      const dx = x < left + radius ? left + radius - x : x >= maxX - radius ? x - (maxX - radius - 1) : 0;
      const dy = y < top + radius ? top + radius - y : y >= maxY - radius ? y - (maxY - radius - 1) : 0;

      if (dx * dx + dy * dy <= radius * radius) {
        const index = (png.width * y + x) << 2;
        png.data[index] = color.r;
        png.data[index + 1] = color.g;
        png.data[index + 2] = color.b;
        png.data[index + 3] = 255;
      }
    }
  }
}

function drawCircle(png, centerX, centerY, radius, color, alpha = 1) {
  const minX = Math.max(0, Math.floor(centerX - radius));
  const maxX = Math.min(png.width - 1, Math.ceil(centerX + radius));
  const minY = Math.max(0, Math.floor(centerY - radius));
  const maxY = Math.min(png.height - 1, Math.ceil(centerY + radius));

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= radius) {
        const softness = clamp(1 - distance / radius, 0, 1);
        const opacity = Math.round(255 * alpha * softness);
        const index = (png.width * y + x) << 2;
        const currentAlpha = png.data[index + 3] / 255;
        const nextAlpha = opacity / 255;
        const compositeAlpha = nextAlpha + currentAlpha * (1 - nextAlpha);

        if (compositeAlpha === 0) {
          continue;
        }

        png.data[index] = Math.round(
          (color.r * nextAlpha + png.data[index] * currentAlpha * (1 - nextAlpha)) / compositeAlpha,
        );
        png.data[index + 1] = Math.round(
          (color.g * nextAlpha + png.data[index + 1] * currentAlpha * (1 - nextAlpha)) / compositeAlpha,
        );
        png.data[index + 2] = Math.round(
          (color.b * nextAlpha + png.data[index + 2] * currentAlpha * (1 - nextAlpha)) / compositeAlpha,
        );
        png.data[index + 3] = Math.round(compositeAlpha * 255);
      }
    }
  }
}

function fillBackground(png) {
  const topColor = hexToRgb("#3227C8");
  const bottomColor = hexToRgb("#6F3BFF");

  for (let y = 0; y < png.height; y += 1) {
    const verticalRatio = y / (png.height - 1);

    for (let x = 0; x < png.width; x += 1) {
      const diagonalRatio = clamp((x / (png.width - 1)) * 0.35 + verticalRatio * 0.65, 0, 1);
      const color = mixColor(topColor, bottomColor, diagonalRatio);
      const index = (png.width * y + x) << 2;
      png.data[index] = color.r;
      png.data[index + 1] = color.g;
      png.data[index + 2] = color.b;
      png.data[index + 3] = 255;
    }
  }

  drawCircle(png, png.width * 0.78, png.height * 0.22, png.width * 0.28, hexToRgb("#3DE2D0"), 0.32);
  drawCircle(png, png.width * 0.2, png.height * 0.82, png.width * 0.25, hexToRgb("#16206D"), 0.28);
}

function drawPararaMark(png) {
  const white = hexToRgb("#F7F8FF");
  const accent = hexToRgb("#48E2D0");
  const size = png.width;

  drawRoundedRect(
    png,
    Math.round(size * 0.24),
    Math.round(size * 0.16),
    Math.round(size * 0.18),
    Math.round(size * 0.68),
    Math.round(size * 0.09),
    white,
  );
  drawRoundedRect(
    png,
    Math.round(size * 0.24),
    Math.round(size * 0.16),
    Math.round(size * 0.3),
    Math.round(size * 0.16),
    Math.round(size * 0.08),
    white,
  );
  drawRoundedRect(
    png,
    Math.round(size * 0.24),
    Math.round(size * 0.4),
    Math.round(size * 0.24),
    Math.round(size * 0.15),
    Math.round(size * 0.075),
    white,
  );
  drawRoundedRect(
    png,
    Math.round(size * 0.46),
    Math.round(size * 0.16),
    Math.round(size * 0.2),
    Math.round(size * 0.36),
    Math.round(size * 0.1),
    white,
  );
  drawRoundedRect(
    png,
    Math.round(size * 0.5),
    Math.round(size * 0.51),
    Math.round(size * 0.12),
    Math.round(size * 0.17),
    Math.round(size * 0.06),
    accent,
  );
}

function createPngBuffer(size) {
  const png = new PNG({ width: size, height: size });
  fillBackground(png);
  drawPararaMark(png);
  return PNG.sync.write(png);
}

async function main() {
  ensureDir(outputDir);

  const png256 = createPngBuffer(256);
  const png128 = createPngBuffer(128);
  const png64 = createPngBuffer(64);
  const png32 = createPngBuffer(32);
  const png16 = createPngBuffer(16);

  fs.writeFileSync(path.join(outputDir, "parara-icon.png"), png256);

  const icoBuffer = await toIco([png16, png32, png64, png128, png256]);
  fs.writeFileSync(path.join(outputDir, "parara.ico"), icoBuffer);
}

main().catch((error) => {
  console.error("Gagal membuat icon Parara.", error);
  process.exit(1);
});
