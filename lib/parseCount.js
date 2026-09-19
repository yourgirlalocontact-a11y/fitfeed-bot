"use strict";

/**
 * Parse un nombre "humain" tapé dans Discord : "128", "3 400", "3,400",
 * "1.2k", "2,5k", "10k"... Renvoie un entier positif, ou null si le texte
 * n'est vraiment pas un nombre.
 */
function parseHumanCount(raw) {
  if (typeof raw !== "string") return null;
  let text = raw.trim().toLowerCase().replace(/\s/g, "");
  if (text === "") return null;

  let multiplier = 1;
  if (text.endsWith("k")) {
    multiplier = 1000;
    text = text.slice(0, -1);
  } else if (text.endsWith("m")) {
    multiplier = 1_000_000;
    text = text.slice(0, -1);
  }

  // Un texte du genre "3.400" ou "3,400" utilisé comme séparateur de
  // milliers (pas de décimale) : on l'enlève avant de parser, sauf si
  // c'est clairement une décimale devant "k"/"m" (ex: "1.2k").
  if (multiplier > 1) {
    text = text.replace(",", ".");
  } else {
    text = text.replace(/[.,](?=\d{3}(\D|$))/g, "");
    text = text.replace(",", ".");
  }

  const value = Number(text);
  if (!Number.isFinite(value) || value < 0) return null;

  return Math.round(value * multiplier);
}

/**
 * Met un nombre en forme lisible pour l'affichage sur la carte
 * (128 -> "128", 12450 -> "12,4k", 3000000 -> "3M").
 */
function formatCount(value) {
  // Seuil légèrement sous 1 000 000 : au-delà, l'arrondi à 1 décimale en k
  // (ex: 999 600 -> "1000k") donnerait un résultat absurde, donc on bascule
  // en millions un peu plus tôt.
  if (value >= 999_500) {
    return `${trimZero(value / 1_000_000)}M`;
  }
  if (value >= 10_000) {
    return `${Math.round(value / 1000)}k`;
  }
  if (value >= 1000) {
    return `${trimZero(value / 1000)}k`;
  }
  return String(value);
}

function trimZero(n) {
  const rounded = Math.round(n * 10) / 10;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1).replace(".", ",");
}

module.exports = { parseHumanCount, formatCount };
