"use strict";

/**
 * Ce script n'est PAS nécessaire pour l'usage normal du bot : index.js
 * enregistre déjà les commandes slash tout seul à chaque démarrage
 * (fonction registerSlashCommands(), appelée sur ClientReady). Il ne sert
 * qu'au débogage en local (par exemple pour vérifier que les identifiants
 * dans .env sont corrects sans lancer tout le bot).
 *
 * Usage : npm run deploy
 */

require("dotenv").config();
const { REST, Routes } = require("discord.js");

const COMMANDS = [
  { name: "fitfeed", description: "Créer ou mettre à jour ton compte FitFeed" },
  { name: "fit", description: "Poster une nouvelle tenue sur ton compte FitFeed" },
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("Enregistrement manuel des commandes slash...");
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), {
      body: COMMANDS,
    });
    console.log("OK — commandes /fitfeed et /fit enregistrées.");
  } catch (err) {
    console.error(err);
  }
})();
