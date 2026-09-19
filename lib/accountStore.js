"use strict";

/**
 * "Base de données" du bot FitFeed : il n'y en a pas. Chaque compte vit
 * entièrement dans son thread du forum Discord, sous la forme d'un message
 * épinglé (posté par le bot) qui contient un petit bloc JSON caché dans un
 * bloc de code. On peut donc redéployer le bot sans jamais perdre les
 * comptes des joueurs (même principe que le bot "The Fifth Line").
 */

const MARKER = "fitfeed-account";
const BLOCK_REGEX = new RegExp("```" + MARKER + "\\n([\\s\\S]*?)\\n```");

function serializeAccount(data) {
  const payload = JSON.stringify(data);
  return (
    `_Compte FitFeed — ne pas supprimer, ce message garde les infos du compte (repliées ci-dessous)._\n` +
    "||```" + MARKER + "\n" + payload + "\n```||"
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
 * Cherche, parmi les messages épinglés d'un thread, celui posté par le bot
 * qui contient les données du compte. Renvoie { message, data, avatarUrl }
 * ou null. avatarUrl pointe vers la photo de profil ORIGINALE (pas la
 * carte générée), ré-uploadée sur ce même message pour rester disponible
 * même après expiration du lien Discord d'origine.
 */
async function readThreadAccount(thread) {
  const pinned = await thread.messages.fetchPinned();
  const botId = thread.client.user.id;
  for (const message of pinned.values()) {
    if (message.author.id !== botId) continue;
    const data = parseAccount(message.content);
    if (data) {
      const avatarUrl = message.attachments.first()?.url ?? null;
      return { message, data, avatarUrl };
    }
  }
  return null;
}

/**
 * Écrit (ou met à jour) le message de données du compte dans un thread,
 * avec la photo de profil originale attachée (avatarBuffer). Si un message
 * existant est fourni, il est édité (et son ancienne pièce jointe
 * remplacée) ; sinon un nouveau message est envoyé puis épinglé.
 */
async function writeThreadAccount(thread, data, existingMessage, avatarBuffer) {
  const content = serializeAccount(data);
  const files = avatarBuffer ? [{ attachment: avatarBuffer, name: "avatar.png" }] : [];

  if (existingMessage) {
    await existingMessage.edit({ content, files, attachments: [] });
    return existingMessage;
  }
  const message = await thread.send({ content, files });
  await message.pin().catch(() => {});
  return message;
}

/**
 * Parcourt tous les threads (actifs + archivés) du salon forum à la
 * recherche du compte d'un utilisateur Discord donné.
 * Renvoie { thread, message, data } ou null si aucun compte trouvé.
 */
async function findAccountByUser(forumChannel, discordUserId) {
  const [active, archived] = await Promise.all([
    forumChannel.threads.fetchActive(),
    forumChannel.threads.fetchArchived({ fetchAll: true }).catch(() => ({ threads: new Map() })),
  ]);

  const allThreads = new Map([...active.threads, ...archived.threads]);

  for (const thread of allThreads.values()) {
    const found = await readThreadAccount(thread).catch((err) => {
      console.error(`Impossible de lire le compte du thread ${thread.id} :`, err);
      return null;
    });
    if (found && found.data.discordUserId === discordUserId) {
      return { thread, message: found.message, data: found.data, avatarUrl: found.avatarUrl };
    }
  }
  return null;
}

module.exports = {
  serializeAccount,
  parseAccount,
  readThreadAccount,
  writeThreadAccount,
  findAccountByUser,
};
