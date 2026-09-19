"use strict";

const { CancelledError, TimeoutError } = require("./errors");
const { parseHumanCount } = require("./parseCount");

const QUESTION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes, comme Briarstagram
const IMAGE_EXTENSION_RE = /\.(png|jpe?g|webp|gif|heic|heif)$/i;

function isImageAttachment(attachment) {
  if (attachment.contentType && attachment.contentType.startsWith("image/")) return true;
  return IMAGE_EXTENSION_RE.test(attachment.name || "");
}

/** Attend UN message de userId dans channel, avec le délai standard. Lève CancelledError/TimeoutError. */
async function collectOne(channel, userId) {
  const collected = await channel
    .awaitMessages({
      filter: (m) => m.author.id === userId,
      max: 1,
      time: QUESTION_TIMEOUT_MS,
      errors: ["time"],
    })
    .catch(() => null);

  if (!collected || collected.size === 0) {
    throw new TimeoutError();
  }

  const message = collected.first();
  if (message.content.trim().toLowerCase() === "annuler") {
    throw new CancelledError();
  }
  return message;
}

/**
 * Pose une question texte, réessaie tant que la réponse ne passe pas
 * `validate` (qui doit renvoyer un message d'erreur, ou null/undefined si
 * c'est bon).
 */
async function askText(channel, userId, prompt, { validate } = {}) {
  await channel.send(prompt);
  for (;;) {
    const message = await collectOne(channel, userId);
    const text = message.content.trim();
    const error = validate ? validate(text) : null;
    if (error) {
      await channel.send(`${error} Réessaie, ou tape \`annuler\` pour arrêter.`);
      continue;
    }
    return text;
  }
}

/** Comme askText, mais parse un nombre "humain" (128, 1.2k, 3 400...). */
async function askNumber(channel, userId, prompt) {
  await channel.send(prompt);
  for (;;) {
    const message = await collectOne(channel, userId);
    const value = parseHumanCount(message.content.trim());
    if (value === null) {
      await channel.send(
        'Je ne reconnais pas ce nombre. Essaie par exemple `128` ou `1.2k`. Réessaie, ou tape `annuler` pour arrêter.'
      );
      continue;
    }
    return value;
  }
}

/**
 * Demande entre min et max images en pièce jointe, dans un seul message.
 * Renvoie un tableau d'Attachment Discord.
 */
async function askAttachments(channel, userId, prompt, { min = 1, max = 1 } = {}) {
  await channel.send(prompt);
  for (;;) {
    const message = await collectOne(channel, userId);
    const attachments = [...message.attachments.values()].filter(isImageAttachment);

    if (attachments.length < min || attachments.length > max) {
      const label = min === max ? `exactement ${min} image${min > 1 ? "s" : ""}` : `entre ${min} et ${max} images`;
      await channel.send(
        `Il me faut ${label} en pièce jointe, dans le même message. Réessaie, ou tape \`annuler\` pour arrêter.`
      );
      continue;
    }
    return attachments;
  }
}

module.exports = { askText, askNumber, askAttachments, QUESTION_TIMEOUT_MS };
