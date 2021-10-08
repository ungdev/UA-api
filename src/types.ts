import prisma, { TournamentId, TransactionState, UserType, UserAge } from '@prisma/client';
import { ErrorRequestHandler } from 'express';
import Mail from 'nodemailer/lib/mailer';
/**
 * DISCLAMER: en environnement de développement, la modification de ce fichier ne sera peut-être pas prise en compte par le serveur de dev
 * Redémarrer le serveur dans ce cas là
 */

/*************/
/** General **/
/*************/

export enum ActionFeedback {
  DISCORD_OAUTH = 'oauth',
  VALIDATE = 'validate',
  PASSWORD_RESET = 'pwd-reset',
}

export enum DiscordFeedbackCode {
  LINKED_NEW = 0,
  LINKED_UPDATED = 1,
  NOT_MODIFIED = 2,
  ERR_ALREADY_LINKED = 3,
  ERR_OAUTH_DENIED = 4,
  ERR_BAD_REQUEST = 5,
  ERR_UNKNOWN = 6,
}

export interface DecodedToken {
  userId: string;
}

export type EmailAttachement = Mail.Attachment & {
  filename: string;
  content: Buffer;
};

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
  cartItems: (CartItem & { forUser: prisma.User })[];
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
  attendant?: Pick<User, 'firstname' | 'lastname' | 'id'> & {
    age: typeof UserAge.adult;
    type: typeof UserType.attendant;
  };
  attended?: User & {
    age: typeof UserAge.child;
  };
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
  InvalidUsername = "Nom d'utilisateur invalide",
  InvalidFirstName = 'Prénom invalide',
  InvalidLastName = 'Nom de famille invalide',
  InvalidEmail = 'Email invalide',
  InvalidPassword = 'Mot de passe invalide',
  InvalidDiscordid = 'Identifiant Discord invalide',
  InvalidAge = 'Tu dois préciser si tu êtes majeur ou mineur',
  InvalidUserType = "Type d'utilisateur invalide",
  InvalidPlace = 'Numéro de place invalide',
  stringBooleanError = "Ce n'est pas du texte",

  InvalidTeamName = "Nom d'équipe invalide !",
  InvalidTournamentId = "Ce tournoi n'existe pas",

  InvalidQRCode = 'Le QR code est invalide',
  NoQRCode = "Le QR code n'existe pas",

  InvalidCart = 'Le contenu de la commande est invalide',
  EmptyLogin = "Le nom d'utilisateur ne peut pas être vide",

  // 401
  // The user credentials were refused or not provided
  Unauthenticated = "Tu n'es pas authentifié",
  ExpiredToken = 'Session expirée. Reconnecte toi',
  InvalidToken = 'Session invalide',
  InvalidCredentials = 'Identifiants invalides',
  NoDiscordAccountLinked = 'Tu dois lier ton compte discord pour créer ou rejoindre une équipe',
  NoToken = "Aucun token n'a été donné",

  // 403
  // The server understood the request but refuses to authorize it
  UserAlreadyScanned = "L'utilisateur a déjà scanné son billet",
  NotPaid = "Le billet n'a pas été payé",
  TeamNotPaid = "Tous les membres de l'équipe n'ont pas payé",
  LoginNotAllowed = 'Tu ne peux pas te connecter actuellement',
  ShopNotAllowed = 'La billetterie est fermée',
  EmailNotConfirmed = "Le compte n'est pas confirmé",
  NoPermission = "Tu n'as pas la permission d'accéder à cette ressource",
  NotCaptain = "Tu dois être le capitaine de l'équipe pour modifier cette ressource",
  NotSelf = 'Tu ne peux pas modifier les information de cette personne',
  NotInTeam = "Tu n'es pas dans une équipe",
  LoginAsAttendant = "Tu ne peux pas te connecter en tant qu'accompagnateur",
  AlreadyAuthenticated = 'Tu es déjà identifié',
  NotplayerOrCoach = "L'utilisateur doit être un joueur ou un coach",
  NotPlayerOrCoachOrSpectator = "L'utilisateur n'est ni un joueur, ni un coach, ni un spectateur",
  AlreadyPaid = 'Le joueur possède déjà une place',
  AlreadyErrored = 'Tu ne peux pas valider une transaction échouée',
  TeamLocked = "L'équipe est verrouillée",
  TeamNotLocked = "L'équipe n'est pas verrouillée",
  TeamNotFull = "L'équipe est incomplète",
  TeamFull = "L'équipe est complète",
  AlreadyInTeam = "Tu es déjà dans l'équipe",
  PlayerAlreadyInTeam = "L'utilisateur a déjà rejoint une équipe",
  AlreadyAskedATeam = "Tu as déjà demandé de t'inscrire dans une équipe",
  AlreadyCaptain = 'Tu es déjà un capitaine',
  NotAskedTeam = "Tu ne demandes pas l'accès à l'équipe",
  CaptainCannotQuit = "Un capitaine ne peut pas se bannir, dissous l'équipe ou nommes un autre chef d'équipe",
  CannotChangeType = 'Tu ne peux pas changer de type si tu as payé',
  NotSameType = "Les deux utilisateurs n'ont pas le même type",
  BasketCannotBeNegative = 'Le total du panier ne peut pas être négatif',
  TeamMaxCoachReached = 'Une équipe ne peut pas avoir plus de deux coachs',
  AttendantNotAllowed = "Un majeur ne peut pas avoir d'accompagnateur",
  AttendantAlreadyRegistered = "Tu ne peux pas avoir plus d'un accompagnateur",
  CannotSpectate = 'Tu dois quitter ton équipe pour devenir spectateur',
  CannotUnSpectate = "Tu n'es pas spectateur",
  NoSpectator = "Les spectateurs n'ont pas accès à cette ressource",
  AlreadyAppliedDiscountSSBU = 'Tu as déjà profité de la promotion !',
  NotPlayerDiscountSSBU = 'Seul les joueurs peuvent profiter de la promotion !',
  NotWhitelisted = "Tu n'es pas qualifié pour ce tournoi",

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
  PlaceAlreadyAttributed = 'Cette place est déjà attribuée',

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
