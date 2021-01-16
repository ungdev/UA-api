import prisma, { TransactionState } from '@prisma/client';
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

// We define all the type here, even if we dont extend them to avoid importing @prisma/client in files and mix both types to avoid potential errors

export type Item = prisma.Item;

export type Setting = prisma.Setting;

export type Cart = prisma.Cart;

export type CartItem = prisma.CartItem;

export type PrimitiveUser = prisma.User & {
  cartItems: CartItem[];
};

export type User = PrimitiveUser & {
  hasPaid: boolean;
};

export type Tournament = prisma.Tournament & {
  lockedTeamsCount: number;
};

export type Team = prisma.Team & {
  users: undefined;
  players: User[];
  coaches: User[];
  visitors: User[];
  askingUsers: User[];
};

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
  // More info on https://www.loggly.com/blog/http-status-code-diagram to know where to put an error

  // 400
  InvalidBody = 'Corps de la requête invalide',
  MalformedBody = 'Corps de la requête malformé',
  InvalidParameters = 'Paramètres de la requête invalides',

  // 401
  Unauthenticated = "Vous n'êtes pas authentifié",
  ExpiredToken = 'Session expirée. Veuillez vous reconnecter',
  InvalidToken = 'Session invalide',
  InvalidCredentials = 'Identifiants invalides',

  // 402
  TeamNotPaid = "Tous les membres de l'équipe n'ont pas payé",

  // 403
  UserAlreadyScanned = "L'utilisateur a déjà scanné son billet",
  NotPaid = "Le billet n'a pas été payé",
  LoginNotAllowed = 'Vous ne pouvez pas vous connecter actuellement',
  ShopNotAllowed = 'La billetterie est fermée',
  EmailNotConfirmed = "Le compte n'est pas confirmé",
  NoPermission = "Vous n'avez pas la permission d'accéder à cette ressource",
  NotCaptain = "Vous devez être le capitaine de l'équipe pour modifier cette ressource",
  NotSelf = 'Vous ne pouvez pas modifier les information de cette personne',
  NotInTeam = "Vous n'êtes pas dans une équipe",

  // 404
  NotFound = 'La ressource est introuvable',
  RouteNotFound = 'La route est introuvable',
  UserNotFound = "L'utilisateur est introuvable",
  TeamNotFound = "L'équipe est introuvable",
  OrderNotFound = 'La commande est introuvable',
  TournamentNotFound = 'Le tournoi est introuvable',
  WrongRegisterToken = "Token d'enregistrement invalide",

  // 406
  NotAcceptable = 'Contenu envoyé inacceptable',

  // 409
  EmailAlreadyExists = 'Cet email est déjà utilisé',
  TeamAlreadyExists = "Le nom de l'équipe existe déjà",
  AlreadyAuthenticated = 'Vous êtes déjà identifié',
  AlreadyInTeam = 'Vous êtes déjà dans une équipe',
  TournamentFull = 'Le tournoi est complet',
  AlreadyAskedATeam = 'Vous avez demandé de vous inscrire dans une équipe',
  NotAskedATeam = "Vous ne demandez l'accès à aucune équipe",
  TeamLocked = "L'équipe est verrouillée",
  TeamNotFull = "L'équipe est incomplète",
  TeamFull = "L'équipe est complète",

  // 500
  Unknown = 'Erreur inconnue',
}

// Toornament
/* eslint-disable camelcase */
export interface ToornamentPlayerCustomFields {
  discord?: string;
  nom_complet: {
    last_name: string;
    first_name: string;
  };
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
