# Bot FitFeed

Bot Discord pour le réseau social **FitFeed** : les joueurs créent un compte
(un post dans un salon forum) puis y publient leurs tenues.

- `/fitfeed` — crée ou met à jour le compte de la personne qui tape la
  commande. Utilisable **uniquement** dans le salon "compte" que tu vas
  configurer (`FITFEED_ACCOUNT_CHANNEL_ID`). Le bot pose les questions une
  par une directement dans le salon (nom d'utilisateur, abonnés,
  abonnements, photo de profil, 3 photos du compte), puis crée un nouveau
  post dans le salon forum FitFeed — ou met à jour le post existant si la
  personne a déjà un compte.
- `/fit` — publie une nouvelle tenue. Utilisable **uniquement** dans le post
  (thread) du compte, et seulement par la personne qui l'a créé. Le bot
  demande la description, la localisation ("Soirée de rentrée", etc.) et 1
  à 3 photos, puis publie la carte directement dans ce thread.

Aucune base de données : chaque compte est stocké dans un message que le
bot poste dans un salon de log dédié, invisible pour les joueurs
(`FITFEED_LOG_CHANNEL_ID`) — ce message contient les infos du compte + la
photo de profil d'origine. Le post visible du compte, lui, ne contient
plus aucune donnée technique. Rien n'est perdu si le bot redémarre ou si
tu redéploies le code — même principe que les bots Fifth Line et
Briarstagram.

## 1. Créer l'application Discord

1. Va sur le [Discord Developer Portal](https://discord.com/developers/applications) et clique **New Application**. Donne-lui un nom (ex : "FitFeed").
2. Dans l'onglet **Bot** :
   - Clique **Reset Token** pour obtenir le token du bot (`DISCORD_TOKEN`). Garde-le secret, ne le partage jamais.
   - Descends jusqu'à **Privileged Gateway Intents** et active **MESSAGE CONTENT INTENT** (indispensable : le bot lit les réponses tapées librement pendant les questionnaires `/fitfeed` et `/fit`).
3. Dans l'onglet **General Information**, note l'**Application ID** (`CLIENT_ID`).
4. Dans l'onglet **OAuth2 > URL Generator** :
   - Coche **bot** et **applications.commands**.
   - Dans les permissions du bot, coche au minimum : *View Channels*, *Send Messages*, *Send Messages in Threads*, *Create Public Threads*, *Manage Threads*, *Attach Files*, *Read Message History*.
   - Copie le lien généré en bas de page, ouvre-le dans un navigateur, et invite le bot sur ton serveur.

## 2. Préparer les salons Discord

Il te faut trois salons :

1. Un salon **texte normal** où les joueurs tapent `/fitfeed` (le "salon bot"). Note son ID (clic droit sur le salon > Copier l'ID — active d'abord le mode développeur dans Discord : Réglages > Avancés > Mode développeur).
2. Un salon **Forum** où les comptes (posts) seront créés. Note son ID de la même façon.
3. Un salon **texte, privé (staff uniquement)** qui sert de "log" technique : c'est là que le bot range les données de chaque compte (invisible pour les joueurs). Un simple salon texte avec les permissions visibles seulement par le staff/le bot suffit. Note son ID de la même façon.

Si tu veux qu'un tag soit automatiquement appliqué à chaque nouveau post du forum, crée ce tag dans les paramètres du forum et note son ID (clic droit sur le tag dans les paramètres, ou via le mode développeur).

## 3. Variables d'environnement

Copie `.env.example` en `.env` et remplis :

```
DISCORD_TOKEN=...
CLIENT_ID=...
GUILD_ID=...
FITFEED_ACCOUNT_CHANNEL_ID=...
FITFEED_FORUM_CHANNEL_ID=...
FITFEED_LOG_CHANNEL_ID=...
FITFEED_FORUM_TAG_ID=   (optionnel)
```

`GUILD_ID` = l'ID de ton serveur Discord (clic droit sur l'icône du serveur > Copier l'ID).

## 4. Déploiement (GitHub + Railway)

Même méthode que pour les bots Fifth Line et Briarstagram — voir le guide
"Déployer le bot — GitHub Desktop + Railway" du projet. En résumé :

1. Dézippe ce projet, ouvre-le avec **GitHub Desktop**, crée le dépôt, commit, **Publish repository**.
2. Sur [Railway](https://railway.app), **New Project > Deploy from GitHub repo**, choisis ce dépôt.
3. Dans l'onglet **Variables** du service, ajoute toutes les variables listées ci-dessus (les mêmes valeurs que dans ton `.env`).
4. Railway redéploie automatiquement. Va dans **Deployments > View Logs** : tu dois voir `Connecté en tant que ...` puis `Commandes slash (/fitfeed, /fit) enregistrées.`
5. Le bot est en ligne en permanence. Pour les mises à jour futures : modifie le code, **Commit to main** puis **Push origin** dans GitHub Desktop — Railway redéploie tout seul.

Les commandes slash s'enregistrent **automatiquement** à chaque démarrage du
bot (pas besoin de lancer `npm run deploy`). Ce script existe dans le projet
uniquement pour du débogage local.

## Structure du projet

```
index.js                    point d'entrée, commandes /fitfeed et /fit
deploy-commands.js          enregistrement manuel des commandes (debug local)
lib/
  generateProfileCard.js    dessine la carte de compte (canvas)
  generatePostCard.js       dessine la carte de post/tenue (1, 2 ou 3 photos)
  accountStore.js           lit/écrit les données de compte dans le salon de log (pas de DB)
  questionnaire.js          pose les questions une par une, gère "annuler" et le délai
  fetchImage.js             télécharge les photos + conversion HEIC (iPhone)
  parseCount.js             parse "128", "1.2k", "3 400"... en nombre
  icons.js                  petites icônes dessinées au canvas (cintre, coeur, sac...)
  theme.js                  couleurs et polices de la charte FitFeed
  canvasHelpers.js          fonctions utilitaires de dessin (coins arrondis, recadrage...)
  errors.js                 erreurs "propres" affichées telles quelles aux joueurs
fonts/                      polices Archivo Black + Space Grotesk (licence OFL, incluses)
licenses/                   licences OFL des polices ci-dessus
```

## Notes

- Le bouton "Shop le look" et la ligne like/commentaire/partager/enregistrer sur les posts sont pour l'instant **décoratifs** (aucune boutique n'est branchée derrière) — c'est un gabarit visuel, pas une fonctionnalité d'achat.
- Si un joueur refait `/fitfeed` alors qu'il a déjà un compte, son post existant est mis à jour (nouvelle carte, nouveaux compteurs) plutôt que d'en créer un second.
- Seul le joueur qui a créé un compte peut faire `/fit` dans son propre post.
- Quand un joueur publie une tenue avec `/fit`, le bot ajoute un petit texte au-dessus de la carte : `"@untel" a posté une nouvelle tenue.`
- Le salon de log (`FITFEED_LOG_CHANNEL_ID`) grossit au fil du temps (un message par compte, mis à jour à chaque `/fitfeed`) — c'est normal et voulu, c'est lui qui fait office de base de données. Ne supprime pas ces messages.
