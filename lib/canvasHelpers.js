"use strict";

/** Rectangle aux coins arrondis (chemin, à remplir/clipper ensuite). */
function roundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function fillRoundRect(ctx, x, y, w, h, r, color) {
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = color;
  ctx.fill();
}

/**
 * Dessine une image en mode "cover" (comme object-fit: cover en CSS) à
 * l'intérieur d'un rectangle x,y,w,h : l'image remplit tout le cadre sans
 * être déformée, en étant recadrée sur les bords si besoin.
 */
function drawImageCover(ctx, image, x, y, w, h) {
  const imgRatio = image.width / image.height;
  const boxRatio = w / h;
  let sx, sy, sw, sh;

  if (imgRatio > boxRatio) {
    sh = image.height;
    sw = sh * boxRatio;
    sx = (image.width - sw) / 2;
    sy = 0;
  } else {
    sw = image.width;
    sh = sw / boxRatio;
    sx = 0;
    sy = (image.height - sh) / 2;
  }

  ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h);
}

/** Comme drawImageCover, mais recadré à l'intérieur d'un cercle. */
function drawImageCoverCircle(ctx, image, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  drawImageCover(ctx, image, cx - r, cy - r, r * 2, r * 2);
  ctx.restore();
}

/** Comme drawImageCover, mais recadré à l'intérieur d'un rectangle arrondi. */
function drawImageCoverRounded(ctx, image, x, y, w, h, r) {
  ctx.save();
  roundRectPath(ctx, x, y, w, h, r);
  ctx.clip();
  drawImageCover(ctx, image, x, y, w, h);
  ctx.restore();
}

/**
 * Ajoute un "@" devant le pseudo pour l'affichage sur les cartes, sauf s'il
 * y en a déjà un (évite "@@untel" si le joueur l'a tapé lui-même). Le nom
 * stocké dans le compte reste inchangé, seul l'affichage est concerné.
 */
function formatHandle(username) {
  const trimmed = (username || "").trim();
  if (!trimmed) return trimmed;
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

/** Tronque un texte avec "…" pour qu'il tienne dans maxWidth. */
function truncateToWidth(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && ctx.measureText(truncated + "…").width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + "…";
}

/**
 * Découpe un texte en plusieurs lignes tenant dans maxWidth, limité à
 * maxLines (ajoute "…" sur la dernière si tronqué). La toute première
 * ligne peut avoir une largeur disponible différente via firstLineMaxWidth
 * (utile quand elle commence par un préfixe déjà dessiné, ex: "@user ").
 */
function wrapText(ctx, text, maxWidth, maxLines, firstLineMaxWidth = maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  const widthForLine = (lineIndex) => (lineIndex === 0 ? firstLineMaxWidth : maxWidth);

  for (const word of words) {
    const tentative = current ? `${current} ${word}` : word;
    const limit = widthForLine(lines.length);
    if (ctx.measureText(tentative).width > limit && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    } else {
      current = tentative;
    }
  }
  if (lines.length < maxLines && current) lines.push(current);

  if (lines.length === maxLines) {
    const consumedWords = lines.join(" ").split(/\s+/).length;
    const remaining = consumedWords < words.length;
    if (remaining) {
      const limit = widthForLine(maxLines - 1);
      lines[maxLines - 1] = truncateToWidth(ctx, lines[maxLines - 1] + "…", limit);
    }
  }

  return lines;
}

module.exports = {
  roundRectPath,
  fillRoundRect,
  drawImageCover,
  drawImageCoverCircle,
  drawImageCoverRounded,
  formatHandle,
  truncateToWidth,
  wrapText,
};
