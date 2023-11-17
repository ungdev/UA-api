import prisma, { TransactionState, UserType, UserAge, Caster } from '@prisma/client';
import type { ErrorRequestHandler } from 'express';
import type Mail from 'nodemailer/lib/mailer';
import type { ParsedQs } from 'qs';
import type { Mail as Email } from './services/email';

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
  PASSWORD_RESET = 'reset',
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

export type MailQuery = ParsedQs & {
  readonly locked?: boolean;
  readonly tournamentId?: string;
  readonly preview: boolean;
  readonly subject: string;
  readonly highlight: {
    readonly title: string;
    readonly intro: string;
  };
  readonly reason?: string;
  readonly content: Email['sections'];
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
  repo = 'repo',
  orga = 'orga',
}

export { TransactionState, UserAge, UserType, ItemCategory, Log, RepoItemType } from '@prisma/client';

/************************/
/** Database extensions **/
/************************/

// We define all the type here, even if we dont extend them to avoid importing @prisma/client in files and mix both types to avoid potential errors

export type Setting = prisma.Setting;
export type CartItem = prisma.CartItem;
export type RawUser = prisma.User;
export type Cart = prisma.Cart;
export type RawItem = prisma.Item;
export type PrimitiveTeam = prisma.Team;
export type PrimitiveTournament = prisma.Tournament;
export type RepoItem = prisma.RepoItem;
export type RepoLog = prisma.RepoLog & { item: RepoItem };

export type Item = RawItem & {
  left?: number;
};

export type DetailedCartItem = CartItem & {
  item: RawItem;
  forUser: RawUser;
};

export type CartWithCartItems = Cart & {
  cartItems: (CartItem & { forUser: RawUser })[];
};

export interface CartWithCartItemsAdmin extends CartWithCartItems {
  totalPrice?: number;
  cartItems: (DetailedCartItem & { forUser: RawUser; item: RawItem })[];
}

export type DetailedCart = Cart & {
  cartItems: DetailedCartItem[];
  user: RawUser;
};

export interface PrimitiveCartItem {
  itemId: string;
  quantity: number;
  price: number;
  reducedPrice?: number;
  forUserId: string;
}

export type ParsedPermissionsHolder<T extends RawUser> = Omit<T, 'permissions'> & {
  permissions: Permission[];
};

export type PrimitiveUser = ParsedPermissionsHolder<RawUser> & {
  cartItems: (CartItem & {
    cart: Cart;
  })[];
};

export type RawUserWithCartItems = Pick<PrimitiveUser, 'cartItems'> & RawUser;

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
  team: PrimitiveTeam;
};

export type PrimitiveTeamWithPartialTournament = PrimitiveTeam & {
  tournament: Pick<PrimitiveTournament, 'id' | 'name'>;
};

export type RawUserWithTeamAndTournamentInfo = RawUserWithCartItems & { team: PrimitiveTeamWithPartialTournament };

export type UserWithTeamAndTournamentInfo = UserWithTeam & { team: PrimitiveTeamWithPartialTournament };

// We need to use here a type instead of an interface as it is used for a casting that wouldn't work on an interface
export type UserSearchQuery = {
  userId: string;
  search: string;
  type: UserType;
  permission: Permission;
  tournament: string;
  locked: string;
  payment: string;
  scan: string;
  place: string;
};

export type UserPatchBody = Partial<
  Pick<
    User,
    | 'type'
    | 'place'
    | 'permissions'
    | 'discordId'
    | 'customMessage'
    | 'age'
    | 'username'
    | 'firstname'
    | 'lastname'
    | 'email'
  >
>;

export type PrimitiveTeamWithPrimitiveUsers = PrimitiveTeam & {
  users: RawUserWithCartItems[];
  askingUsers: RawUserWithCartItems[];
};

export type LogSearchQuery = ParsedQs & {
  page: number;
  userId?: string;
  teamId?: string;
};

export type Team = PrimitiveTeam & {
  users: undefined;
  players: User[];
  coaches: User[];
  askingUsers: User[];
};

export type Tournament = PrimitiveTournament & {
  lockedTeamsCount: number;
  placesLeft: number;
  teams: Team[];
  casters: Caster[];
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
  InvalidAge = 'Tu dois préciser si tu es majeur ou mineur',
  InvalidUserType = "Type d'utilisateur invalide",
  InvalidPlace = 'Numéro de place invalide',
  InvalidPermission = "Ces permissions n'existent pas",
  stringBooleanError = "Ce n'est pas du texte",

  InvalidTeamName = "Nom d'équipe invalide !",

  InvalidQRCode = 'Le QR code est invalide',
  NoQRCode = "Le QR code n'existe pas",

  InvalidCart = 'Le contenu de la commande est invalide',
  ItemNotAvailableYet = "L'objet demandé n'est pas encore disponible",
  EmptyLogin = "Le nom d'utilisateur ne peut pas être vide",

  MalformedMailBody = 'Structure du mail incorrecte',
  InvalidMailOptions = "Paramètres d'envoi incorrects",

  NoPokemonIdProvided = "L'ID Pokémon n'a pas été spécifié",

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
  IsOrga = "L'utilisateur est un organisateur",
  TeamNotPaid = "Tous les membres de l'équipe n'ont pas payé",
  LoginNotAllowed = 'Tu ne peux pas te connecter actuellement',
  NotAdmin = "Tu n'es pas administrateur",
  ShopNotAllowed = 'La billetterie est fermée',
  EmailNotConfirmed = "Le compte n'est pas confirmé",
  EmailAlreadyConfirmed = 'Le compte est déjà confirmé',
  NoPermission = "Tu n'as pas la permission d'accéder à cette ressource",
  NotCaptain = "Tu dois être le capitaine de l'équipe pour modifier cette ressource",
  NotSelf = 'Tu ne peux pas modifier les information de cette personne',
  NotInTeam = "Tu n'es pas dans une équipe",
  NotInSameTeam = "Tu n'est pas dans la même équipe que le joueur spécifié",
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
  AlreadyHasPendingCartWithDiscountSSBU = "Tu as déjà un panier en attente de paiement avec une réduction SSBU. Ce panier expirera au bout d'une heure, tu pourras alors rajouter l'item à ton panier",
  NotWhitelisted = "Tu n'es pas qualifié pour ce tournoi",
  HasAlreadyPaidForAnotherTicket = 'Tu as déjà payé un ticket vendu à un prix différent. Pour changer de tournoi, contacte nous !',
  EtupayNoAccess = "Tu n'as pas accès à cette url",
  NotYourItem = "Cet item n'est pas le tiens",
  AlreadyHaveComputer = 'Tu as déjà un ordinateur stocké',
  AlreadyPickedUp = "L'objet a déjà été récupéré",
  TooMuchLockedTeams = "Il y a plus d'équipes inscrites que le nombre d'équipes maximal souhaité",
  TournamentFull = "Le tournoi est plein, attends qu'une place se libère pour payer un ticket",

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

  // 405
  // The request method is known by the server but is not supported by the target resource
  NotScannedOrLocked = "Ce joueur n'a pas été scanné ou son inscription n'a pas été bloquée",
  OnlyPlayersAllowed = 'Cette fonctionnalité est réservée aux joueurs et aux coachs/managers',

  // 409
  // Indicates a request conflict with current state of the target resource
  EmailAlreadyExists = 'Cet email est déjà utilisé',
  UsernameAlreadyExists = "Ce nom d'utilisateur est déjà utilisé",
  TeamAlreadyExists = "Le nom de l'équipe existe déjà",
  PlaceAlreadyAttributed = 'Cette place est déjà attribuée',
  DiscordAccountAlreadyUsed = 'Ce compte discord est déjà lié à un compte',
  TournamentNameAlreadyExists = 'Un tournoi a déjà ce nom',

  // 410
  // indicates that access to the target resource is no longer available at the server.
  ItemOutOfStock = "L'objet demandé n'est plus en stock",
  ItemNotAvailableAnymore = "L'objet demandé n'est plus disponible",

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
