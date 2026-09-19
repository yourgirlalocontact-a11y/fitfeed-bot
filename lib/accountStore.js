"use strict";

/**
 * "Base de données" du bot FitFeed : il n'y en a pas. Chaque compte est
 * stocké dans un message posté par le bot dans un salon de log dédié
 * (FITFEED_LOG_CHANNEL_ID) — un salon invisible pour les joueurs. Ce
 * message contient un petit bloc JSON (avec l'ID du thread du compte) et
 * la photo de profil d'origine ré-uploadée. Le post visible du compte
 * (dans le salon forum) ne contient donc plus aucune donnée technique.
 * On peut redéployer le bot sans jamais perdre les comptes des joueurs
 * (même principe que le bot "The Fifth Line").
 */

const MARKER = "fitfeed-account";
const BLOCK_REGEX = new RegExp("```" + MARKER + "\\n([\\s\\S]*?)\\n```");

function serializeAccount(data) {
  const payload = JSON.stringify(data);
  return (
    `Compte de <@${data.discordUserId}> — voir le post : <#${data.threadId}>\n` +
    "```" + MARKER + "\n" + payload + "\n```"
  );
}

function parseAccount(content) {
  const match = content && content.match(BLOCK_REGEX);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

/**
 * Parcourt l'historique du salon de log (par paquets de 100 messages, du
 * plus récent au plus ancien) à la recherche du premier message de compte
 * qui satisfait `predicate(data)`. Renvoie { message, data, avatarUrl } ou
 * null si rien ne correspond.
 */
async function findLogAccount(logChannel, predicate) {
  const botId = logChannel.client.user.id;
  let before;
  for (;;) {
    const batch = await logChannel.messages.fetch(before ? { limit: 100, before } : { limit: 100 });
    if (batch.size === 0) return null;

    for (const message of batch.values()) {
      if (message.author.id !== botId) continue;
      const data = parseAccount(message.content);
      if (data && predicate(data)) {
        const avatarUrl = message.attachments.first()?.url ?? null;
        return { message, data, avatarUrl };
      }
    }

    if (batch.size < 100) return null;
    before = batch.last().id;
  }
}

/** Cherche le compte FitFeed d'un utilisateur Discord donné. */
async function findAccountByUser(logChannel, discordUserId) {
  return findLogAccount(logChannel, (data) => data.discordUserId === discordUserId);
}

/** Cherche le compte FitFeed associé à un thread (post) donné. */
async function findAccountByThread(logChannel, threadId) {
  return findLogAccount(logChannel, (data) => data.threadId === threadId);
}

/**
 * Écrit (ou met à jour) le message de log d'un compte dans le salon de
 * log, avec la photo de profil originale attachée (avatarBuffer). Si un
 * message existant est fourni, il est édité (et son ancienne pièce jointe
 * remplacée) ; sinon un nouveau message est envoyé.
 */
async function writeLogAccount(logChannel, data, existingMessage, avatarBuffer) {
  const content = serializeAccount(data);
  const files = avatarBuffer ? [{ attachment: avatarBuffer, name: "avatar.png" }] : [];

  if (existingMessage) {
    await existingMessage.edit({ content, files, attachments: [] });
    return existingMessage;
  }
  return logChannel.send({ content, files });
}

module.exports = {
  serializeAccount,
  parseAccount,
  findAccountByUser,
  findAccountByThread,
  writeLogAccount,
};
