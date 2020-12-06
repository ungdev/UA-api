import { Tournament, User, TransactionState } from '@prisma/client';

/**
 * DISCLAMER: en environnement de développement, la modification de ce fichier ne sera peut-être pas prise en compte par le serveur de dev
 * Redémarrer le serveur dans ce cas là
 */

/*************/
/** General **/
/*************/

export enum Permission {
  stream = 'stream',
  entry = 'entry',
  anim = 'anim',
  admin = 'admin',
}

export interface DecodedToken {
  userId: string;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer;
}

export interface MailData {
  username: string;
  gunnarCode: string;
  compumsaCode: string;
}

export interface EmailContent {
  title: string;
  html: string;
}

export interface Contact {
  name: string;
  email: string;
  subject: string;
  message: string;
}

/************************/
/** Databse extensions **/
/************************/

export interface UserWithHasPaid extends User {
  hasPaid: boolean;
}

export interface TournamentWithLockedTeams extends Tournament {
  lockedTeamsCount: number;
}

/************/
/** Etupay **/
/************/

export interface EtupayResponse {
  transactionId: number;
  step: TransactionState;
  paid: boolean;
  serviceData: string;
}

/**********/
/** Misc **/
/**********/

export enum Error {
  // 400
  BadRequest = 'Requête invalide',
  AlreadyInTeam = 'Vous êtes déjà dans une équipe',
  LoginNotAllowed = 'Vous ne pouvez pas vous connecter actuellement',
  ShopNotAllowed = 'La billetterie est fermée',

  // 401
  Unauthenticated = "Vous n'êtes pas authentifié",
  ExpiredToken = 'Session expirée. Veuillez vous reconnecter',
  InvalidToken = 'Session invalide',
  InvalidPassword = 'Mot de passe invalide',
  InvalidForm = 'Formulaire invalide',

  // 403
  Unauthorized = "Vous n'avez pas l'autorisation d'accéder à cette ressource",
  UserAlreadyScanned = "L'utilisateur a déjà scanné son billet",
  NotPaid = "Le billet n'a pas été payé",

  // 404
  NotFound = 'La ressource est introuvable',
  RouteNotFound = 'La route est introuvable',
  UserNotFound = "L'utilisateur est introuvable",
  OrderNotFound = 'La commande est introuvable',
  WrongRegisterToken = "Token d'enregistrement invalide",

  // 406
  NotAcceptable = 'Contenu envoyé inacceptable',

  // 500
  Unknown = 'Erreur inconnue',
}

// Alias type for Object
export type ObjectType = Record<string, unknown>;

// Toornament
/* eslint-disable camelcase */
export interface ToornamentPlayerCustomFields {
  discord?: string;
  nom_complet: {
    last_name: string;
    first_name: string;
  };
  summoner_player_id?: string;
}

export interface ToornamentPlayer {
  name: string;
  email: string;
  custom_fields: ToornamentPlayerCustomFields;
}

export interface ToornamentParticipant {
  id: string;
  name: string;
  user_id: string;
  email: string;
  custom_fields?: ToornamentPlayerCustomFields;
  lineup: Array<ToornamentPlayer>;
  created_at: string;
}
/* eslint-enable camelcase */

export interface DiscordParticipants {
  name: string;
  discordIds: string[];
}

export interface PlayerInformations {
  username: string;
  email: string;
  firstname: string;
  lastname: string;
}
export interface SummonersParticipants {
  name: string;
  summonersName: string[];
}
