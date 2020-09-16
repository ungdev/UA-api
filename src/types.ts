import { Request } from 'express';

/**
 * DISCLAMER: en environnement de développement, la modification de ce fichier ne sera peut-être pas prise en compte par le serveur de dev
 * Redémarrer le serveur dans ce cas là
 */

/*************/
/** General **/
/*************/

export enum Permissions {
  Stream = 'stream',
  Entry = 'entry',
  Anim = 'anim',
  Admin = 'admin',
}

export interface Token {
  userId: number;
  permissions: Permissions;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer;
}

/********************/
/** Database enums **/
/********************/

export enum UserType {
  Player = 'player',
  Coach = 'coach',
  Visitor = 'visitor',
  Orga = 'orga',
}

export enum ItemCategory {
  Ticket = 'ticket',
  Item = 'item',
}

export enum TransactionState {
  Pending = 'pending',
  Paid = 'paid',
  Canceled = 'canceled',
  Refused = 'refused',
  Refunded = 'refunded',
}

/*********************/
/** Database models **/
/*********************/

export interface Tournament {
  id: string;
  name: string;
  maxPlayers: number;
  playersPerTeam: number;
}

export interface User {
  id: string;
  username?: string | null;
  firstname: string;
  lastname: string;
  email?: string | null;
  password?: string | null;
  type: UserType;
  permissions?: string | null;
  place?: string | null;
  scannedAt?: string | null;
  registerToken?: string | null;
  resetToken?: string | null;
  discordId?: string | null;
  teamId?: string | null;
  askingTeamId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Team {
  id: string;
  name: string;
  tournamentId: string;
  captainId: string;
  lockedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Item {
  id: string;
  name: string;
  category: ItemCategory;
  attribute?: string | null;
  price: number;
  reducedPrice?: number | null;
  infos?: string | null;
  image?: string | null;
  stock?: number | null;
}

export interface Cart {
  id: string;
  userId: string;
  transactionState: TransactionState;
  transactionId?: number | null;
  paidAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItem {
  id: string;
  quantity: number;
  cartId: string;
  itemId: string;
  forUserId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Setting {
  id: string;
  value?: string | null;
}

/*************/
/** Winston **/
/*************/

export enum LoggingLevel {
  Emerg = 'emerg',
  ALert = 'alert',
  Crit = 'crit',
  Error = 'error',
  Warning = 'warning',
  Notice = 'notice',
  Info = 'info',
  Debug = 'debug',
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

export interface BodyRequest<T> extends Request {
  body: T;
}

export interface PermissionsRequest extends Request {
  permissions: Permissions;
}

export enum Error {
  // 400
  BadRequest = 'Requête invalide',

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

  // 406
  NotAcceptable = 'Contenu envoyé inacceptable',

  // 500
  Unknown = 'Erreur inconnue',
}
