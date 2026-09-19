"use strict";

require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Events,
  REST,
  Routes,
  ChannelType,
} = require("discord.js");

const { generateProfileCard } = require("./lib/generateProfileCard");
const { generatePostCard } = require("./lib/generatePostCard");
const { fetchDiscordImage } = require("./lib/fetchImage");
const { askText, askNumber, askAttachments } = require("./lib/questionnaire");
const { findAccountByUser, findAccountByThread, writeLogAccount } = require("./lib/accountStore");
const { formatHandle } = require("./lib/canvasHelpers");
const { UserFacingError, CancelledError, TimeoutError } = require("./lib/errors");

const COMMANDS = [
  { name: "fitfeed", description: "Créer ou mettre à jour ton compte FitFeed" },
  { name: "fit", description: "Poster une nouvelle tenue sur ton compte FitFeed" },
];

async function registerSlashCommands() {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), {
      body: COMMANDS,
    });
    console.log("Commandes slash (/fitfeed, /fit) enregistrées.");
  } catch (err) {
    console.error("Erreur lors de l'enregistrement des commandes slash :", err);
  }
}

/**
 * /fitfeed — création ou mise à jour du compte FitFeed du joueur.
 * Autorisée uniquement dans FITFEED_ACCOUNT_CHANNEL_ID.
 */
async function handleFitfeed(interaction) {
  if (interaction.channelId !== process.env.FITFEED_ACCOUNT_CHANNEL_ID) {
    await interaction.reply({
      content: `Cette commande ne peut être utilisée que dans <#${process.env.FITFEED_ACCOUNT_CHANNEL_ID}>.`,
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({
    content: "C'est parti ! Réponds directement dans ce salon. Tape `annuler` à tout moment pour arrêter.",
    ephemeral: true,
  });

  const channel = interaction.channel;
  const userId = interaction.user.id;

  const username = await askText(
    channel,
    userId,
    `${interaction.user}, quel est le nom d'utilisateur du compte ? (ex : \`@prenom.nom\`)`,
    {
      validate: (t) => (t.length < 2 ? "C'est un peu court." : t.length > 32 ? "32 caractères maximum." : null),
    }
  );
  const followers = await askNumber(channel, userId, "Combien d'abonnés a ce compte ?");
  const following = await askNumber(channel, userId, "Combien d'abonnements a ce compte ?");
  const [avatarAttachment] = await askAttachments(
    channel,
    userId,
    "Envoie la photo de profil (1 image en pièce jointe).",
    { min: 1, max: 1 }
  );
  const photoAttachments = await askAttachments(
    channel,
    userId,
    "Envoie les 3 photos du compte, toutes dans le même message.",
    { min: 3, max: 3 }
  );

  const progressMessage = await channel.send("Génération de la carte de compte...");

  const { image: avatarImage, buffer: avatarBuffer } = await fetchDiscordImage(
    avatarAttachment,
    "la photo de profil"
  );
  const photoImages = [];
  for (let i = 0; i < photoAttachments.length; i++) {
    const { image } = await fetchDiscordImage(photoAttachments[i], `la photo ${i + 1}`);
    photoImages.push(image);
  }

  const cardBuffer = generateProfileCard({ username, followers, following, avatarImage, photos: photoImages });

  const forumChannel = await interaction.client.channels.fetch(process.env.FITFEED_FORUM_CHANNEL_ID);
  if (!forumChannel || forumChannel.type !== ChannelType.GuildForum) {
    throw new UserFacingError(
      "Le salon forum configuré (FITFEED_FORUM_CHANNEL_ID) est introuvable ou n'est pas un forum."
    );
  }

  const logChannel = await interaction.client.channels.fetch(process.env.FITFEED_LOG_CHANNEL_ID);
  if (!logChannel || !logChannel.isTextBased()) {
    throw new UserFacingError(
      "Le salon de log configuré (FITFEED_LOG_CHANNEL_ID) est introuvable ou n'est pas un salon textuel."
    );
  }

  const existing = await findAccountByUser(logChannel, userId);

  if (existing) {
    const thread = await interaction.client.channels.fetch(existing.data.threadId).catch(() => null);
    if (thread) {
      const starterMessage = await thread.fetchStarterMessage().catch(() => null);
      if (starterMessage) {
        await starterMessage.edit({
          files: [{ attachment: cardBuffer, name: "fitfeed-compte.png" }],
          attachments: [],
        });
      }
      if (thread.name !== username) {
        await thread.setName(username.slice(0, 100)).catch(() => {});
      }
    }
    const accountData = { discordUserId: userId, username, followers, following, threadId: existing.data.threadId };
    await writeLogAccount(logChannel, accountData, existing.message, avatarBuffer);
    await progressMessage.delete().catch(() => {});
    await channel.send(`Ton compte FitFeed a été mis à jour !${thread ? ` ${thread}` : ""}`);
  } else {
    const appliedTags = process.env.FITFEED_FORUM_TAG_ID ? [process.env.FITFEED_FORUM_TAG_ID] : undefined;
    const thread = await forumChannel.threads.create({
      name: username.slice(0, 100),
      appliedTags,
      message: { files: [{ attachment: cardBuffer, name: "fitfeed-compte.png" }] },
    });
    const accountData = { discordUserId: userId, username, followers, following, threadId: thread.id };
    await writeLogAccount(logChannel, accountData, null, avatarBuffer);
    await progressMessage.delete().catch(() => {});
    await channel.send(`Ton compte FitFeed a été créé ! ${thread}`);
  }
}

/**
 * /fit — publication d'une nouvelle tenue. Autorisée uniquement dans le
 * thread-forum du compte du joueur, et seulement par le créateur de ce
 * compte.
 */
async function handleFit(interaction) {
  const channel = interaction.channel;

  if (!channel.isThread() || channel.parentId !== process.env.FITFEED_FORUM_CHANNEL_ID) {
    await interaction.reply({
      content: "Cette commande ne peut être utilisée que dans le post (thread) de ton compte FitFeed.",
      ephemeral: true,
    });
    return;
  }

  const logChannel = await interaction.client.channels.fetch(process.env.FITFEED_LOG_CHANNEL_ID);
  if (!logChannel || !logChannel.isTextBased()) {
    throw new UserFacingError(
      "Le salon de log configuré (FITFEED_LOG_CHANNEL_ID) est introuvable ou n'est pas un salon textuel."
    );
  }

  const account = await findAccountByThread(logChannel, channel.id);
  if (!account) {
    await interaction.reply({
      content: "Je ne trouve pas de compte FitFeed dans ce post. Utilise `/fitfeed` d'abord pour en créer un.",
      ephemeral: true,
    });
    return;
  }

  if (account.data.discordUserId !== interaction.user.id) {
    await interaction.reply({
      content: "Seul le créateur de ce compte peut poster une tenue ici.",
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({
    content: "C'est parti ! Réponds directement dans ce post. Tape `annuler` à tout moment pour arrêter.",
    ephemeral: true,
  });

  const userId = interaction.user.id;

  const description = await askText(channel, userId, "Décris ta tenue (une phrase ou deux) :", {
    validate: (t) => (t.length < 1 ? "La description ne peut pas être vide." : t.length > 280 ? "280 caractères maximum." : null),
  });
  const location = await askText(
    channel,
    userId,
    'Où est-ce que tu portes cette tenue ? (ex : "Soirée de rentrée")',
    {
      validate: (t) => (t.length < 1 ? "La localisation ne peut pas être vide." : t.length > 60 ? "60 caractères maximum." : null),
    }
  );
  const photoAttachments = await askAttachments(
    channel,
    userId,
    "Envoie 1 à 3 photos de ta tenue, toutes dans le même message.",
    { min: 1, max: 3 }
  );

  const progressMessage = await channel.send("Génération du post...");

  let avatarImage = null;
  if (account.avatarUrl) {
    try {
      const result = await fetchDiscordImage(
        { url: account.avatarUrl, name: "avatar.png" },
        "la photo de profil enregistrée"
      );
      avatarImage = result.image;
    } catch {
      avatarImage = null;
    }
  }

  const photoImages = [];
  for (let i = 0; i < photoAttachments.length; i++) {
    const { image } = await fetchDiscordImage(photoAttachments[i], `la photo ${i + 1}`);
    photoImages.push(image);
  }

  const cardBuffer = generatePostCard({
    username: account.data.username,
    location,
    description,
    timestamp: "à l'instant",
    avatarImage,
    photos: photoImages,
  });

  await progressMessage.delete().catch(() => {});
  await channel.send({
    content: `"${formatHandle(account.data.username)}" a posté une nouvelle tenue.`,
    files: [{ attachment: cardBuffer, name: "fitfeed-post.png" }],
  });
}

async function handleCommandError(interaction, err) {
  let message;
  if (err instanceof CancelledError) {
    message = "Commande annulée.";
  } else if (err instanceof TimeoutError) {
    message = err.message;
  } else if (err instanceof UserFacingError) {
    message = err.message;
  } else {
    console.error(err);
    message = "Une erreur inattendue est survenue. Réessaie plus tard, ou préviens un modérateur si ça persiste.";
  }

  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.channel.send(message);
    } else {
      await interaction.reply({ content: message, ephemeral: true });
    }
  } catch (sendErr) {
    console.error("Impossible d'envoyer le message d'erreur :", sendErr);
  }
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.once(Events.ClientReady, async (c) => {
  console.log(`Connecté en tant que ${c.user.tag}`);
  await registerSlashCommands();
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  try {
    if (interaction.commandName === "fitfeed") {
      await handleFitfeed(interaction);
    } else if (interaction.commandName === "fit") {
      await handleFit(interaction);
    }
  } catch (err) {
    await handleCommandError(interaction, err);
  }
});

client.login(process.env.DISCORD_TOKEN).catch((err) => {
  console.error(
    "Impossible de se connecter à Discord. Vérifie que DISCORD_TOKEN est correct dans les variables d'environnement."
  );
  console.error(err);
  process.exit(1);
});
