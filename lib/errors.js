"use strict";

/**
 * Erreur "propre" : le message est déjà rédigé pour être affiché
 * directement au joueur dans Discord (pas de stack trace, pas de jargon).
 */
class UserFacingError extends Error {
  constructor(message) {
    super(message);
    this.name = "UserFacingError";
    this.userMessage = message;
  }
}

/** Le joueur a tapé "annuler" pendant un questionnaire. */
class CancelledError extends Error {
  constructor(message = "Commande annulée.") {
    super(message);
    this.name = "CancelledError";
  }
}

/** Le joueur n'a pas répondu à temps pendant un questionnaire. */
class TimeoutError extends Error {
  constructor(message = "Temps écoulé, la commande a été annulée. Relance-la quand tu veux.") {
    super(message);
    this.name = "TimeoutError";
  }
}

module.exports = { UserFacingError, CancelledError, TimeoutError };
