"use strict";

/**
 * Petites icônes vectorielles dessinées directement au canvas (dérivées des
 * pictos utilisés dans les maquettes FitFeed), pour ne dépendre d'aucun
 * fichier image externe. Chaque fonction dessine dans un cadre virtuel
 * 24x24 placé en (x, y) avec une taille "size" (le cadre est carré).
 */

function withIconSpace(ctx, x, y, size, draw) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  draw();
  ctx.restore();
}

function strokeStyle(ctx, color, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

function hanger(ctx, x, y, size, color, lineWidth = 1.6) {
  withIconSpace(ctx, x, y, size, () => {
    strokeStyle(ctx, color, lineWidth);
    ctx.beginPath();
    ctx.arc(12, 4.3, 1.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(12, 5.6);
    ctx.lineTo(12, 7.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(12, 7.6);
    ctx.lineTo(3.4, 13.8);
    ctx.bezierCurveTo(2.5, 14.4, 2.9, 15.8, 4.0, 15.8);
    ctx.lineTo(20.0, 15.8);
    ctx.bezierCurveTo(21.1, 15.8, 21.5, 14.4, 20.6, 13.8);
    ctx.closePath();
    ctx.stroke();
  });
}

function kebab(ctx, x, y, size, color) {
  withIconSpace(ctx, x, y, size, () => {
    ctx.fillStyle = color;
    for (const cy of [5, 12, 19]) {
      ctx.beginPath();
      ctx.arc(12, cy, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function person(ctx, x, y, size, color, lineWidth = 1.6) {
  withIconSpace(ctx, x, y, size, () => {
    strokeStyle(ctx, color, lineWidth);
    ctx.beginPath();
    ctx.arc(12, 8, 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(4, 20);
    ctx.bezierCurveTo(5.6, 16, 8.8, 14, 12, 14);
    ctx.bezierCurveTo(15.2, 14, 18.4, 16, 20, 20);
    ctx.stroke();
  });
}

function pin(ctx, x, y, size, color, lineWidth = 2) {
  withIconSpace(ctx, x, y, size, () => {
    strokeStyle(ctx, color, lineWidth);
    ctx.beginPath();
    ctx.arc(12, 9.5, 6, Math.PI * 0.92, Math.PI * 2.08, false);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(6.9, 13.7);
    ctx.lineTo(12, 21);
    ctx.lineTo(17.1, 13.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(12, 9.5, 2.1, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function bag(ctx, x, y, size, color, lineWidth = 1.7) {
  withIconSpace(ctx, x, y, size, () => {
    strokeStyle(ctx, color, lineWidth);
    ctx.beginPath();
    ctx.moveTo(9, 8);
    ctx.lineTo(9, 6);
    ctx.arc(12, 6, 3, Math.PI, 0, false);
    ctx.lineTo(15, 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(6, 8);
    ctx.lineTo(18, 8);
    ctx.lineTo(19, 20);
    ctx.lineTo(5, 20);
    ctx.closePath();
    ctx.stroke();
  });
}

function chevronRight(ctx, x, y, size, color, lineWidth = 2) {
  withIconSpace(ctx, x, y, size, () => {
    strokeStyle(ctx, color, lineWidth);
    ctx.beginPath();
    ctx.moveTo(9, 6);
    ctx.lineTo(15, 12);
    ctx.lineTo(9, 18);
    ctx.stroke();
  });
}

function heart(ctx, x, y, size, color, lineWidth = 1.6) {
  withIconSpace(ctx, x, y, size, () => {
    strokeStyle(ctx, color, lineWidth);
    ctx.beginPath();
    ctx.moveTo(12, 21);
    ctx.bezierCurveTo(12, 21, 4, 14, 4, 8.5);
    ctx.bezierCurveTo(4, 5.4, 6.4, 3, 9.5, 3);
    ctx.bezierCurveTo(11, 3, 12, 4, 12, 4);
    ctx.bezierCurveTo(12, 4, 13, 3, 14.5, 3);
    ctx.bezierCurveTo(17.6, 3, 20, 5.4, 20, 8.5);
    ctx.bezierCurveTo(20, 14, 12, 21, 12, 21);
    ctx.closePath();
    ctx.stroke();
  });
}

function comment(ctx, x, y, size, color, lineWidth = 1.6) {
  withIconSpace(ctx, x, y, size, () => {
    strokeStyle(ctx, color, lineWidth);
    const r = 3;
    ctx.beginPath();
    ctx.moveTo(4 + r, 4);
    ctx.lineTo(20 - r, 4);
    ctx.arcTo(20, 4, 20, 4 + r, r);
    ctx.lineTo(20, 15 - r);
    ctx.arcTo(20, 15, 20 - r, 15, r);
    ctx.lineTo(9, 15);
    ctx.lineTo(5, 19);
    ctx.lineTo(5, 15);
    ctx.lineTo(4 + r, 15);
    ctx.arcTo(4, 15, 4, 15 - r, r);
    ctx.lineTo(4, 4 + r);
    ctx.arcTo(4, 4, 4 + r, 4, r);
    ctx.closePath();
    ctx.stroke();
  });
}

function share(ctx, x, y, size, color, lineWidth = 1.6) {
  withIconSpace(ctx, x, y, size, () => {
    strokeStyle(ctx, color, lineWidth);
    ctx.beginPath();
    ctx.moveTo(3, 11.5);
    ctx.lineTo(21, 4);
    ctx.lineTo(13.5, 22);
    ctx.lineTo(11.3, 14.2);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(21, 4);
    ctx.lineTo(9.8, 13.7);
    ctx.stroke();
  });
}

function bookmark(ctx, x, y, size, color, lineWidth = 1.6) {
  withIconSpace(ctx, x, y, size, () => {
    strokeStyle(ctx, color, lineWidth);
    ctx.beginPath();
    ctx.moveTo(6, 4);
    ctx.lineTo(18, 4);
    ctx.lineTo(18, 21);
    ctx.lineTo(12, 17);
    ctx.lineTo(6, 21);
    ctx.closePath();
    ctx.stroke();
  });
}

function camera(ctx, x, y, size, color, lineWidth = 1.8) {
  withIconSpace(ctx, x, y, size, () => {
    strokeStyle(ctx, color, lineWidth);
    ctx.beginPath();
    ctx.moveTo(4, 8);
    ctx.lineTo(7, 8);
    ctx.lineTo(9, 6);
    ctx.lineTo(15, 6);
    ctx.lineTo(17, 8);
    ctx.lineTo(20, 8);
    ctx.lineTo(20, 19);
    ctx.lineTo(4, 19);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(12, 13.5, 3.2, 0, Math.PI * 2);
    ctx.stroke();
  });
}

module.exports = {
  hanger,
  kebab,
  person,
  pin,
  bag,
  chevronRight,
  heart,
  comment,
  share,
  bookmark,
  camera,
};
