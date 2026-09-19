"use strict";

const { createCanvas } = require("@napi-rs/canvas");
const { COLORS, registerFonts } = require("./theme");
const { drawImageCoverCircle, drawImageCoverRounded, truncateToWidth, wrapText } = require("./canvasHelpers");
const icons = require("./icons");

const WIDTH = 390;
const HEADER_H = 56;
const MEDIA_H = 390;
const SHOP_BAR_H = 48;
const ENGAGEMENT_H = 44;

// La zone légende n'a plus de hauteur fixe : elle s'adapte au nombre de
// lignes que prend réellement la description (1 ou 2), pour que "à
// l'instant" suive tout de suite le texte au lieu de rester collé en bas
// d'un bloc toujours haut de 84px.
const CAPTION_PAD_TOP = 12;
const CAPTION_LINE_H = 19;
const CAPTION_GAP_TO_TIMESTAMP = 22;
const CAPTION_PAD_BOTTOM = 12;
const CAPTION_H_MAX = CAPTION_PAD_TOP + 13 + CAPTION_LINE_H + CAPTION_GAP_TO_TIMESTAMP + CAPTION_PAD_BOTTOM;
const HEIGHT = HEADER_H + MEDIA_H + SHOP_BAR_H + ENGAGEMENT_H + CAPTION_H_MAX;

/**
 * Génère la carte d'un post (tenue) FitFeed. Le nombre de photos (1 à 3)
 * détermine automatiquement la mise en page de la zone image :
 *  - 1 photo  -> pleine largeur/hauteur
 *  - 2 photos -> deux colonnes égales
 *  - 3 photos -> une grande à gauche + deux empilées à droite (collage)
 *
 * @param {object} data
 * @param {string} data.username
 * @param {string} data.location
 * @param {string} data.description
 * @param {string} data.timestamp
 * @param {import("@napi-rs/canvas").Image} data.avatarImage
 * @param {import("@napi-rs/canvas").Image[]} data.photos - 1 à 3 images
 * @returns {Buffer} PNG
 */
function generatePostCard({ username, location, description, timestamp, avatarImage, photos }) {
  registerFonts();

  // Passe de mesure : on a besoin de savoir combien de lignes prendra la
  // description AVANT de créer le vrai canvas, pour lui donner la bonne
  // hauteur totale.
  const scratch = createCanvas(10, 10).getContext("2d");
  const captionLayout = computeCaptionLayout(scratch, username, description);

  const height = HEADER_H + MEDIA_H + SHOP_BAR_H + ENGAGEMENT_H + captionLayout.captionH;
  const canvas = createCanvas(WIDTH, height);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = COLORS.ivory;
  ctx.fillRect(0, 0, WIDTH, height);

  drawHeader(ctx, { username, location, avatarImage });
  drawMedia(ctx, photos, HEADER_H);
  drawShopBar(ctx, HEADER_H + MEDIA_H);
  drawEngagementRow(ctx, HEADER_H + MEDIA_H + SHOP_BAR_H);
  drawCaption(ctx, { username, timestamp }, captionLayout, HEADER_H + MEDIA_H + SHOP_BAR_H + ENGAGEMENT_H);

  return canvas.toBuffer("image/png");
}

function drawHeader(ctx, { username, location, avatarImage }) {
  ctx.strokeStyle = COLORS.hairline;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, HEADER_H);
  ctx.lineTo(WIDTH, HEADER_H);
  ctx.stroke();

  const avatarCx = 16 + 17;
  const avatarCy = HEADER_H / 2;
  const avatarR = 17;
  ctx.beginPath();
  ctx.arc(avatarCx, avatarCy, avatarR + 2, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.navy;
  ctx.fill();
  if (avatarImage) {
    drawImageCoverCircle(ctx, avatarImage, avatarCx, avatarCy, avatarR);
  } else {
    ctx.beginPath();
    ctx.arc(avatarCx, avatarCy, avatarR, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.neutral1;
    ctx.fill();
    icons.person(ctx, avatarCx - 9, avatarCy - 9, 18, COLORS.muted, 1.8);
  }

  const textX = avatarCx + avatarR + 12;
  const maxTextW = WIDTH - textX - 44;

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = COLORS.ink;
  ctx.font = "13.5px 'Space Grotesk Bold'";
  ctx.fillText(truncateToWidth(ctx, username, maxTextW), textX, HEADER_H / 2 - 3);

  icons.pin(ctx, textX, HEADER_H / 2 + 3, 13, COLORS.navy, 2);
  ctx.font = "11.5px 'Space Grotesk Medium'";
  ctx.fillStyle = COLORS.navy;
  ctx.fillText(truncateToWidth(ctx, location, maxTextW - 17), textX + 17, HEADER_H / 2 + 13);

  icons.kebab(ctx, WIDTH - 16 - 18, HEADER_H / 2 - 9, 18, COLORS.ink);
}

function drawMedia(ctx, photos, top) {
  const list = (photos || []).filter(Boolean).slice(0, 3);
  const n = list.length;

  if (n <= 1) {
    const img = list[0];
    if (img) {
      drawImageCoverRounded(ctx, img, 0, top, WIDTH, MEDIA_H, 0);
    } else {
      drawPlaceholder(ctx, 0, top, WIDTH, MEDIA_H, COLORS.neutral1, "Photo de la tenue", 56);
    }
    return;
  }

  if (n === 2) {
    const colW = (WIDTH - 2) / 2;
    drawImageCoverRounded(ctx, list[0], 0, top, colW, MEDIA_H, 0);
    drawImageCoverRounded(ctx, list[1], colW + 2, top, colW, MEDIA_H, 0);
    return;
  }

  // n === 3 : collage grande à gauche + 2 empilées à droite
  const leftW = 256;
  const rightW = WIDTH - leftW - 2;
  const rightTileH = (MEDIA_H - 2) / 2;

  drawImageCoverRounded(ctx, list[0], 0, top, leftW, MEDIA_H, 0);
  drawImageCoverRounded(ctx, list[1], leftW + 2, top, rightW, rightTileH, 0);
  drawImageCoverRounded(ctx, list[2], leftW + 2, top + rightTileH + 2, rightW, rightTileH, 0);
}

function drawPlaceholder(ctx, x, y, w, h, color, label, iconSize) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  icons.hanger(ctx, x + w / 2 - iconSize / 2, y + h / 2 - iconSize / 2 - 10, iconSize, COLORS.muted, 1.4);
  ctx.font = "11px 'Space Grotesk Medium'";
  ctx.fillStyle = COLORS.muted;
  ctx.textAlign = "center";
  ctx.fillText(label.toUpperCase(), x + w / 2, y + h / 2 + iconSize / 2 + 4);
  ctx.textAlign = "left";
}

function drawShopBar(ctx, top) {
  ctx.fillStyle = COLORS.navy;
  ctx.fillRect(0, top, WIDTH, SHOP_BAR_H);

  icons.bag(ctx, 16, top + SHOP_BAR_H / 2 - 9, 18, COLORS.ivory, 1.7);
  ctx.font = "13px 'Space Grotesk Bold'";
  ctx.fillStyle = COLORS.ivory;
  ctx.textBaseline = "middle";
  ctx.fillText("Shop le look", 16 + 18 + 8, top + SHOP_BAR_H / 2 + 1);
  ctx.textBaseline = "alphabetic";

  icons.chevronRight(ctx, WIDTH - 16 - 16, top + SHOP_BAR_H / 2 - 8, 16, COLORS.ivory, 2);
}

function drawEngagementRow(ctx, top) {
  const iconY = top + ENGAGEMENT_H / 2 - 10.5;
  icons.heart(ctx, 16, iconY, 21, COLORS.ink, 1.6);
  icons.comment(ctx, 16 + 21 + 16, iconY, 21, COLORS.ink, 1.6);
  icons.share(ctx, 16 + (21 + 16) * 2, iconY, 21, COLORS.ink, 1.6);
  icons.bookmark(ctx, WIDTH - 16 - 19, top + ENGAGEMENT_H / 2 - 9.5, 19, COLORS.ink, 1.6);
}

/**
 * Calcule le découpage en lignes de la description et la hauteur totale
 * que doit occuper la zone légende, SANS rien dessiner (utilisé en amont
 * pour dimensionner le canvas final).
 */
function computeCaptionLayout(ctx, username, description) {
  const x = 16;
  const maxW = WIDTH - x * 2;
  ctx.font = "13px 'Space Grotesk Bold'";
  const usernamePrefix = `${username} `;
  const usernameW = ctx.measureText(usernamePrefix).width;

  ctx.font = "13px 'Space Grotesk'";
  const lines = wrapText(ctx, description || "", maxW, 2, maxW - usernameW);
  const linesCount = Math.max(lines.length, 1);

  const firstLineY = CAPTION_PAD_TOP + 13;
  const lastLineY = firstLineY + (linesCount - 1) * CAPTION_LINE_H;
  const timestampY = lastLineY + CAPTION_GAP_TO_TIMESTAMP;
  const captionH = timestampY + CAPTION_PAD_BOTTOM;

  return { lines, usernameW, firstLineY, timestampY, captionH };
}

function drawCaption(ctx, { username, timestamp }, layout, top) {
  const x = 16;
  const { lines, usernameW, firstLineY, timestampY } = layout;

  let lineY = top + firstLineY;
  lines.forEach((line, i) => {
    let cursorX = x;
    if (i === 0) {
      ctx.font = "13px 'Space Grotesk Bold'";
      ctx.fillStyle = COLORS.ink;
      ctx.fillText(username, cursorX, lineY);
      cursorX += usernameW;
    }
    ctx.font = "13px 'Space Grotesk'";
    ctx.fillStyle = COLORS.ink;
    ctx.fillText(line, cursorX, lineY);
    lineY += CAPTION_LINE_H;
  });

  ctx.font = "11px 'Space Grotesk Medium'";
  ctx.fillStyle = COLORS.muted;
  ctx.fillText(timestamp || "", x, top + timestampY);
}

module.exports = { generatePostCard, WIDTH, HEIGHT };
