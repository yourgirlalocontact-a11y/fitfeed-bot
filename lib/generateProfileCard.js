"use strict";

const { createCanvas } = require("@napi-rs/canvas");
const { COLORS, registerFonts } = require("./theme");
const {
  fillRoundRect,
  drawImageCoverCircle,
  drawImageCoverRounded,
  formatHandle,
  truncateToWidth,
} = require("./canvasHelpers");
const icons = require("./icons");
const { formatCount } = require("./parseCount");

const WIDTH = 390;
const HEIGHT = 500;

/**
 * Génère la carte de compte FitFeed (image PNG) postée comme premier
 * message du thread-forum d'un joueur.
 *
 * @param {object} data
 * @param {string} data.username
 * @param {number} data.followers
 * @param {number} data.following
 * @param {import("@napi-rs/canvas").Image} data.avatarImage
 * @param {import("@napi-rs/canvas").Image[]} data.photos - exactement 3 images
 * @returns {Buffer} PNG
 */
function generateProfileCard({ username, followers, following, avatarImage, photos }) {
  registerFonts();
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  // Fond
  ctx.fillStyle = COLORS.ivory;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // --- Header ---
  const headerH = 56;
  ctx.strokeStyle = COLORS.hairline;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, headerH);
  ctx.lineTo(WIDTH, headerH);
  ctx.stroke();

  fillRoundRect(ctx, 20, 13, 30, 30, 9, COLORS.ink);
  icons.hanger(ctx, 27, 20, 16, COLORS.ivory, 1.8);

  ctx.textBaseline = "middle";
  ctx.font = "15px 'Archivo Black'";
  const fitWidth = ctx.measureText("Fit").width;
  ctx.fillStyle = COLORS.ink;
  ctx.fillText("Fit", 58, 28);
  ctx.fillStyle = COLORS.navy;
  ctx.fillText("Feed", 58 + fitWidth, 28);

  icons.kebab(ctx, WIDTH - 20 - 20, 8, 20, COLORS.ink);

  // --- Avatar ---
  const avatarCx = WIDTH / 2;
  const avatarCy = headerH + 32 + 52;
  const avatarR = 52;

  ctx.beginPath();
  ctx.arc(avatarCx, avatarCy, avatarR + 3, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.navy;
  ctx.fill();

  if (avatarImage) {
    drawImageCoverCircle(ctx, avatarImage, avatarCx, avatarCy, avatarR);
  } else {
    ctx.beginPath();
    ctx.arc(avatarCx, avatarCy, avatarR, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.neutral1;
    ctx.fill();
    icons.person(ctx, avatarCx - 22, avatarCy - 22, 44, COLORS.muted, 1.6);
  }

  // --- Username ---
  let cursorY = avatarCy + avatarR + 14 + 9;
  ctx.font = "19px 'Space Grotesk Bold'";
  ctx.fillStyle = COLORS.ink;
  ctx.textAlign = "center";
  const displayUsername = truncateToWidth(ctx, formatHandle(username), WIDTH - 48);
  ctx.fillText(displayUsername, avatarCx, cursorY);
  ctx.textAlign = "left";

  // --- Stats ---
  cursorY += 14 + 19 + 2 + 13 + 4;
  const gap = 40;
  ctx.font = "19px 'Space Grotesk Bold'";
  const followersLabel = formatCount(followers);
  const followingLabel = formatCount(following);
  const followersNumW = ctx.measureText(followersLabel).width;
  const followingNumW = ctx.measureText(followingLabel).width;
  ctx.font = "11px 'Space Grotesk Medium'";
  const followersCapW = ctx.measureText("ABONNÉS").width;
  const followingCapW = ctx.measureText("ABONNEMENTS").width;
  const block1W = Math.max(followersNumW, followersCapW);
  const block2W = Math.max(followingNumW, followingCapW);
  const totalStatsW = block1W + gap + 1 + gap + block2W;
  let statsX = avatarCx - totalStatsW / 2;

  const numY = cursorY;
  const capY = cursorY + 19 + 2 + 6;

  ctx.textAlign = "center";
  ctx.font = "19px 'Space Grotesk Bold'";
  ctx.fillStyle = COLORS.ink;
  ctx.fillText(followersLabel, statsX + block1W / 2, numY);
  ctx.font = "11px 'Space Grotesk Medium'";
  ctx.fillStyle = COLORS.captionGrey;
  ctx.fillText("ABONNÉS", statsX + block1W / 2, capY);

  const dividerX = statsX + block1W + gap;
  ctx.strokeStyle = COLORS.hairline;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(dividerX, numY - 14);
  ctx.lineTo(dividerX, numY + 14);
  ctx.stroke();

  const block2X = dividerX + gap;
  ctx.font = "19px 'Space Grotesk Bold'";
  ctx.fillStyle = COLORS.ink;
  ctx.fillText(followingLabel, block2X + block2W / 2, numY);
  ctx.font = "11px 'Space Grotesk Medium'";
  ctx.fillStyle = COLORS.captionGrey;
  ctx.fillText("ABONNEMENTS", block2X + block2W / 2, capY);
  ctx.textAlign = "left";

  // --- Boutons Suivre / Message (décoratifs) ---
  const buttonsY = capY + 6 + 4;
  const buttonH = 40;
  const msgButtonW = 44;
  const buttonGap = 10;
  const sideMargin = 24;
  const followBtnW = WIDTH - sideMargin * 2 - buttonGap - msgButtonW;

  fillRoundRect(ctx, sideMargin, buttonsY, followBtnW, buttonH, 20, COLORS.navy);
  ctx.font = "14px 'Space Grotesk Bold'";
  ctx.fillStyle = COLORS.ivory;
  ctx.textAlign = "center";
  ctx.fillText("Suivre", sideMargin + followBtnW / 2, buttonsY + buttonH / 2 + 1);
  ctx.textAlign = "left";

  const msgBtnX = sideMargin + followBtnW + buttonGap;
  ctx.beginPath();
  const msgR = buttonH / 2;
  ctx.moveTo(msgBtnX + msgR, buttonsY);
  ctx.arcTo(msgBtnX + msgButtonW, buttonsY, msgBtnX + msgButtonW, buttonsY + buttonH, msgR);
  ctx.arcTo(msgBtnX + msgButtonW, buttonsY + buttonH, msgBtnX, buttonsY + buttonH, msgR);
  ctx.arcTo(msgBtnX, buttonsY + buttonH, msgBtnX, buttonsY, msgR);
  ctx.arcTo(msgBtnX, buttonsY, msgBtnX + msgButtonW, buttonsY, msgR);
  ctx.closePath();
  ctx.strokeStyle = COLORS.ink;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  icons.comment(ctx, msgBtnX + msgButtonW / 2 - 9, buttonsY + buttonH / 2 - 9, 18, COLORS.ink);

  // --- Rangée des 3 photos ---
  const photosY = buttonsY + buttonH + 24 + 1;
  ctx.strokeStyle = COLORS.hairline;
  ctx.beginPath();
  ctx.moveTo(0, photosY);
  ctx.lineTo(WIDTH, photosY);
  ctx.stroke();

  const tileGap = 2;
  const tileW = (WIDTH - tileGap * 2) / 3;
  const tileH = tileW;
  for (let i = 0; i < 3; i++) {
    const tx = i * (tileW + tileGap);
    const ty = photosY;
    const photo = photos && photos[i];
    if (photo) {
      drawImageCoverRounded(ctx, photo, tx, ty, tileW, tileH, 0);
    } else {
      ctx.fillStyle = i % 2 === 0 ? COLORS.neutral1 : COLORS.neutral2;
      ctx.fillRect(tx, ty, tileW, tileH);
      icons.hanger(ctx, tx + tileW / 2 - 13, ty + tileH / 2 - 20, 26, COLORS.muted, 1.5);
    }
  }

  return canvas.toBuffer("image/png");
}

module.exports = { generateProfileCard, WIDTH, HEIGHT };
