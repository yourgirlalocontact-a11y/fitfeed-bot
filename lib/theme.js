"use strict";

const path = require("path");
const { GlobalFonts } = require("@napi-rs/canvas");

const COLORS = {
  ivory: "#F7F2EA",
  ink: "#17151B",
  navy: "#0D1B3E",
  neutral1: "#EDE7DB",
  neutral2: "#E3DBCB",
  hairline: "#E7DFCF",
  muted: "#9B958A",
  captionGrey: "#6B6558",
};

let fontsRegistered = false;

/**
 * Enregistre les polices embarquées auprès de @napi-rs/canvas.
 * Idempotent : peut être appelé plusieurs fois sans problème.
 */
function registerFonts() {
  if (fontsRegistered) return;
  const fontsDir = path.join(__dirname, "..", "fonts");
  GlobalFonts.registerFromPath(path.join(fontsDir, "ArchivoBlack-Regular.ttf"), "Archivo Black");
  GlobalFonts.registerFromPath(path.join(fontsDir, "SpaceGrotesk-Regular.ttf"), "Space Grotesk");
  GlobalFonts.registerFromPath(path.join(fontsDir, "SpaceGrotesk-Medium.ttf"), "Space Grotesk Medium");
  GlobalFonts.registerFromPath(path.join(fontsDir, "SpaceGrotesk-Bold.ttf"), "Space Grotesk Bold");
  fontsRegistered = true;
}

module.exports = { COLORS, registerFonts };
