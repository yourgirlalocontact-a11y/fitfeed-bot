"use strict";

const { CancelledError, TimeoutError } = require("./errors");
const { parseHumanCount } = require("./parseCount");

const QUESTION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes, comme Briarstagram
const IMAGE_EXTENSION_RE = /\.(png|jpe?g|webp|gif|heic|heif)$/i;

function isImageAttachment(attachment) {
  if (attachment.contentType && attachment.contentType.startsWith("image/")) return true;
  return IMAGE_EXTENSION_RE.test(attachment.name || "");
}

/**
 * Ajoute l'id d'un message dans `tracker` (un simple tableau) si fourni.
 * `tracker` est optionnel partout : on ne suit les messages que quand
 * l'appelant veut pouvoir les nettoyer ensuite (voir deleteTrackedMessages).
 */
function track(tracker, message) {
  if (tracker && message) tracker.push(message.id);
  return message;
}

/** Attend UN message de userId dans channel, avec le délai standard. Lève CancelledError/TimeoutError. */
async function collectOne(channel, userId, tracker) {
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
  track(tracker, message);
  if (message.content.trim().toLowerCase() === "annuler") {
    throw new CancelledError();
  }
  return message;
}

/**
 * Pose une question texte, réessaie tant que la réponse ne passe pas
 * `validate` (qui doit renvoyer un message d'erreur, ou null/undefined si
 * c'est bon). Si `tracker` (un tableau) est fourni, tous les messages
 * échangés (question, éventuels messages d'erreur, réponses du joueur) y
 * sont ajoutés pour pouvoir être nettoyés ensuite.
 */
async function askText(channel, userId, prompt, { validate, tracker } = {}) {
  track(tracker, await channel.send(prompt));
  for (;;) {
    const message = await collectOne(channel, userId, tracker);
    const text = message.content.trim();
    const error = validate ? validate(text) : null;
    if (error) {
      track(tracker, await channel.send(`${error} Réessaie, ou tape \`annuler\` pour arrêter.`));
      continue;
    }
    return text;
  }
}

/** Comme askText, mais parse un nombre "humain" (128, 1.2k, 3 400...). */
async function askNumber(channel, userId, prompt, { tracker } = {}) {
  track(tracker, await channel.send(prompt));
  for (;;) {
    const message = await collectOne(channel, userId, tracker);
    const value = parseHumanCount(message.content.trim());
    if (value === null) {
      track(
        tracker,
        await channel.send(
          'Je ne reconnais pas ce nombre. Essaie par exemple `128` ou `1.2k`. Réessaie, ou tape `annuler` pour arrêter.'
        )
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
async function askAttachments(channel, userId, prompt, { min = 1, max = 1, tracker } = {}) {
  track(tracker, await channel.send(prompt));
  for (;;) {
    const message = await collectOne(channel, userId, tracker);
    const attachments = [...message.attachments.values()].filter(isImageAttachment);

    if (attachments.length < min || attachments.length > max) {
      const label = min === max ? `exactement ${min} image${min > 1 ? "s" : ""}` : `entre ${min} et ${max} images`;
      track(
        tracker,
        await channel.send(
          `Il me faut ${label} en pièce jointe, dans le même message. Réessaie, ou tape \`annuler\` pour arrêter.`
        )
      );
      continue;
    }
    return attachments;
  }
}

/**
 * Supprime tous les messages suivis pendant un questionnaire (questions du
 * bot + réponses du joueur), pour ne laisser que le résultat final dans le
 * salon. Utilise le bulk delete de Discord quand c'est possible (2 à 100
 * messages), avec un repli message par message sinon (permission
 * manquante, message déjà supprimé, etc. — jamais bloquant).
 */
async function deleteTrackedMessages(channel, messageIds) {
  const ids = [...new Set(messageIds)].filter(Boolean);
  if (ids.length === 0) return;

  if (ids.length === 1) {
    await channel.messages.delete(ids[0]).catch(() => {});
    return;
  }

  try {
    await channel.bulkDelete(ids, true);
  } catch {
    await Promise.all(ids.map((id) => channel.messages.delete(id).catch(() => {})));
  }
}

module.exports = { askText, askNumber, askAttachments, deleteTrackedMessages, QUESTION_TIMEOUT_MS };
