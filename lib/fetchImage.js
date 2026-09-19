"use strict";

const { loadImage } = require("@napi-rs/canvas");
const heicConvert = require("heic-convert");
const { UserFacingError } = require("./errors");

const HEIC_SIGNATURES = ["heic", "heif", "heix", "hevc", "hevx", "mif1", "msf1"];

/**
 * Un fichier est-il probablement un HEIC/HEIF (format par défaut sur iPhone) ?
 * On regarde à la fois l'extension du nom de fichier et le "brand" ISOBMFF
 * dans les premiers octets, au cas où Discord aurait renommé le fichier.
 */
function looksLikeHeic(filename, buffer) {
  const lower = (filename || "").toLowerCase();
  if (lower.endsWith(".heic") || lower.endsWith(".heif")) return true;
  if (buffer.length < 12) return false;
  const brand = buffer.subarray(8, 12).toString("ascii").toLowerCase();
  return HEIC_SIGNATURES.includes(brand);
}

/**
 * Télécharge une pièce jointe Discord (image) et renvoie à la fois un objet
 * Image prêt à être dessiné avec @napi-rs/canvas ET le buffer final (après
 * conversion HEIC éventuelle), pour pouvoir le re-uploader tel quel plus
 * tard (ex: garder la photo de profil originale épinglée dans un thread).
 * Lève une UserFacingError avec un message clair si l'image est illisible,
 * corrompue, ou l'URL Discord a expiré.
 *
 * @param {{url: string, name?: string}} attachment - une pièce jointe Discord, ou un objet {url, name} équivalent
 * @param {string} label - nom lisible utilisé dans les messages d'erreur ("photo de profil", "photo 2", ...)
 * @returns {Promise<{image: import("@napi-rs/canvas").Image, buffer: Buffer}>}
 */
async function fetchDiscordImage(attachment, label) {
  let response;
  try {
    response = await fetch(attachment.url);
  } catch (err) {
    throw new UserFacingError(
      `Problème avec ${label} : impossible de télécharger le fichier depuis Discord. Réessaie d'envoyer l'image.`
    );
  }

  if (!response.ok) {
    throw new UserFacingError(
      `Problème avec ${label} : le lien Discord de l'image a expiré ou est invalide. Réessaie d'envoyer l'image.`
    );
  }

  let buffer = Buffer.from(await response.arrayBuffer());

  if (looksLikeHeic(attachment.name, buffer)) {
    try {
      const outputBuffer = await heicConvert({
        buffer,
        format: "JPEG",
        quality: 0.92,
      });
      buffer = Buffer.from(outputBuffer);
    } catch (err) {
      throw new UserFacingError(
        `Problème avec ${label} : ce fichier HEIC (format iPhone) n'a pas pu être converti. Essaie d'envoyer l'image dans un autre format (JPG/PNG).`
      );
    }
  }

  try {
    const image = await loadImage(buffer);
    return { image, buffer };
  } catch (err) {
    throw new UserFacingError(
      `Problème avec ${label} : image invalide ou illisible. Essaie d'envoyer un autre fichier (JPG/PNG).`
    );
  }
}

module.exports = { fetchDiscordImage, looksLikeHeic };
