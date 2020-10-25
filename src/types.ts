/* eslint-disable camelcase */
import { Request } from 'express';
import { User as PrismaUser } from '@prisma/client';

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

export interface DecodedToken {
  userId: string;
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

export interface User extends PrismaUser {
  hasPaid?: boolean;
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

export interface User extends PrismaUser {
  hasPaid?: boolean;
}

  updatedAt?: string;
}
  createdAt?: string;
  forUserId: string;
  itemId: string;
  cartId: string;
  quantity: number;
  id: string;
export interface CartItem {

export interface Setting {
  id: string;
  value?: string;
}

export interface TournamentWithLockedTeams extends Tournament {
  lockedTeamsCount: number;
}
export interface Cart {
  id: string;
  userId: string;
  transactionState: TransactionState;
  transactionId?: number;
  createdAt?: string;
  paidAt?: string;
  updatedAt?: string;
}

export interface Contact {
  name: string;
  email: string;
  subject: string;
  message: string;
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

export interface UserRequest extends Request {
  user: User;
}

export interface BodyRequest<T> extends Request {
  body: T;
}

export interface BodyUserRequest<T> extends UserRequest {
  body: T;
}

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

// Toornament Credentials
export interface ToornamentCredentials {
  participantToken: string;
  registrationToken: string;
  expirationDate: Date;
  apiKey: string;
}

export interface ToornamentPlayerCustomFields {
  discord?: string;
}

export interface ToornamentPlayer {
  custom_fields: ToornamentPlayerCustomFields;
}

export interface ToornamentParticipant {
  name: string;
  custom_fields?: ToornamentPlayerCustomFields;
  lineup: Array<ToornamentPlayer>;
}

export interface DiscordParticipants {
  name: string;
  discordIds: string[];
}
