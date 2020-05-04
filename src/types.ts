import { Request } from 'express';
/**
 * DISCLAMER: Dans mode développement, la modification de ce fichier ne sera peut-être pas prise en compte par le serveur de dev
 * Redémarrer le serveur dans ce cas là
 */
// General

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

// Model Types
export enum UserType {
  Player = 'player',
  Coach = 'coach',
  Visitor = 'visitor',
  Orga = 'orga',
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

// Express method merging
declare module 'express' {
  interface Request {
    permissions?: Permissions;
    etupay?: EtupayResponse;
  }
}

export interface BodyRequest<T> extends Request {
  body: T;
}

export interface EtupayResponse {
  transactionId: number;
  step: TransactionState;
  paid: boolean;
  serviceData: string;
}

export enum TransactionState {
  Pending = 'pending',
  Paid = 'paid',
  Canceled = 'canceled',
  Refused = 'refused',
  Refunded = 'refunded',
}

export enum ItemCategory {
  Ticket = 'ticket',
  Item = 'item',
}

export enum Gender {
  Male = 'male',
  Female = 'female',
}
