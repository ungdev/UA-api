import prisma, { TournamentId, TransactionState, UserType } from '@prisma/client';
import { ErrorRequestHandler } from 'express';
import Mail from 'nodemailer/lib/mailer';
/**
 * DISCLAMER: en environnement de développement, la modification de ce fichier ne sera peut-être pas prise en compte par le serveur de dev
 * Redémarrer le serveur dans ce cas là
 */

/*************/
/** General **/
/*************/

export interface DecodedToken {
  userId: string;
}

export interface MailData {
  username: string;
  gunnarCode: string;
  compumsaCode: string;
}

export type EmailAttachement = Mail.Attachment & {
  filename: string;
  content: Buffer;
};

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

export enum Permission {
  stream = 'stream',
  entry = 'entry',
  anim = 'anim',
  admin = 'admin',
}

/************************/
/** Databse extensions **/
/************************/

// We define all the type here, even if we dont extend them to avoid importing @prisma/client in files and mix both types to avoid potential errors

export type Item = prisma.Item & {
  left?: number;
};

export type Setting = prisma.Setting;

export type CartItem = prisma.CartItem;

export type DetailedCartItem = CartItem & {
  item: prisma.Item;
  forUser: prisma.User;
};

export type Cart = prisma.Cart;

export type CartWithCartItems = Cart & {
  cartItems: CartItem[];
};

export type DetailedCart = Cart & {
  cartItems: DetailedCartItem[];
  user: prisma.User;
};

export interface PrimitiveCartItem {
  itemId: string;
  quantity: number;
  forUserId: string;
}

export type PrimitiveUser = prisma.User & {
  cartItems: (CartItem & {
    cart: Cart;
  })[];
};

export type User = PrimitiveUser & {
  hasPaid: boolean;
};

export type UserWithTeam = User & {
  team: prisma.Team;
};

// We need to use here a type instead of an interface as it is used for a casting that wouldn't work on an interface
export type UserSearchQuery = {
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  type: UserType;
  permission: Permission;
  team: string;
  tournament: TournamentId;
  scanned: string;
  place: string;
};

export type Team = prisma.Team & {
  users: undefined;
  players: User[];
  coaches: User[];
  askingUsers: User[];
};

export type Tournament = prisma.Tournament & {
  lockedTeamsCount: number;
  placesLeft: number;
  teams: Team[];
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

export type EtupayError = ErrorRequestHandler & {
  message: string;
};

/**********/
/** Misc **/
/**********/
export const enum Error {
  // More info on https://www.loggly.com/blog/http-status-code-diagram to know where to put an error

  // 400
  // Used when the request contains a bad syntax and makes the request unprocessable
  InvalidBody = 'Corps de la requête invalide',
  MalformedBody = 'Corps de la requête malformé',
  InvalidParameters = 'Paramètres de la requête invalides',
  InvalidQueryParameters = 'Paramètres de la requête invalides (query)',
  EmptyBasket = 'Le panier est vide',

  // 401
  // The user credentials were refused or not provided
  Unauthenticated = "Vous n'êtes pas authentifié",
  ExpiredToken = 'Session expirée. Veuillez vous reconnecter',
  InvalidToken = 'Session invalide',
  InvalidCredentials = 'Identifiants invalides',

  // 403
  // The server understood the request but refuses to authorize it
  UserAlreadyScanned = "L'utilisateur a déjà scanné son billet",
  NotPaid = "Le billet n'a pas été payé",
  TeamNotPaid = "Tous les membres de l'équipe n'ont pas payé",
  LoginNotAllowed = 'Vous ne pouvez pas vous connecter actuellement',
  ShopNotAllowed = 'La billetterie est fermée',
  EmailNotConfirmed = "Le compte n'est pas confirmé",
  NoPermission = "Vous n'avez pas la permission d'accéder à cette ressource",
  NotCaptain = "Vous devez être le capitaine de l'équipe pour modifier cette ressource",
  NotSelf = 'Vous ne pouvez pas modifier les information de cette personne',
  NotInTeam = "Vous n'êtes pas dans l'équipe",
  LoginAsVisitor = 'Vous ne pouvez pas vous connecter en tant que visiteur',
  AlreadyAuthenticated = 'Vous êtes déjà identifié',
  NotPlayerOrCoach = "L'utilisateur n'est pas un joueur ou un coach",
  AlreadyPaid = 'Le joueur possède déjà une place',
  AlreadyErrored = 'Vous ne pouvez pas valider une transaction échouée',
  TeamLocked = "L'équipe est verrouillée",
  TeamNotLocked = "L'équipe n'est pas verrouillée",
  TeamNotFull = "L'équipe est incomplète",
  TeamFull = "L'équipe est complète",
  AlreadyInTeam = "Vous êtes déjà dans l'équipe",
  AlreadyAskedATeam = 'Vous avez déjà demandé de vous inscrire dans une équipe',
  AlreadyCaptain = 'Vous êtes déjà un capitaine',
  NotAskedTeam = "Vous ne demandez pas l'accès à l'équipe",
  CaptainCannotQuit = "Un capitaine ne peut pas se bannir, veuillez dissoudre l'équipe ou nommer un autre chef d'équipe",
  CannotChangeType = 'Vous ne pouvez pas changer de type si vous avez payé',
  NotSameType = "Les deux utilisateurs n'ont pas le même type",

  // 404
  // The server can't find the requested resource
  NotFound = 'La ressource est introuvable',
  RouteNotFound = 'La route est introuvable',
  UserNotFound = "L'utilisateur est introuvable",
  TeamNotFound = "L'équipe est introuvable",
  CartNotFound = 'Le panier est introuvable',
  OrderNotFound = 'La commande est introuvable',
  ItemNotFound = "L'objet est introuvable",
  TournamentNotFound = 'Le tournoi est introuvable',
  TicketNotFound = 'Le ticket est introuvable',
  WrongRegisterToken = "Token d'enregistrement invalide",

  // 409
  // Indicates a request conflict with current state of the target resource
  EmailAlreadyExists = 'Cet email est déjà utilisé',
  UsernameAlreadyExists = "Ce nom d'utilisateur est déjà utilisé",
  TeamAlreadyExists = "Le nom de l'équipe existe déjà",

  // 410
  // indicates that access to the target resource is no longer available at the server.
  TournamentFull = 'Le tournoi est complet',
  ItemOutOfStock = "L'objet demandé n'est plus en stock",

  // 415
  UnsupportedMediaType = "Le format de la requête n'est pas supporté",

  // 500
  // The server encountered an unexpected condition that prevented it from fulfilling the request
  InternalServerError = 'Erreur inconnue',
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
