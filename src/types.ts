/* eslint-disable camelcase */
import { Request } from 'express';
import { Tournament, User as PrismaUser } from '@prisma/client';

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

export interface Contact {
  name: string;
  email: string;
  subject: string;
  message: string;
}

/************************/
/** Databse extensions **/
/************************/

export interface TournamentWithLockedTeams extends Tournament {
  lockedTeamsCount: number;
}

/********************/
/** Database enums **/
/********************/

export enum ItemCategory {
  ticket = 'ticket',
  item = 'item',
}

export enum UserType {
  player = 'player',
  coach = 'coach',
  visitor = 'visitor',
  orga = 'orga',
}

export enum TransactionState {
  pending = 'pending',
  paid = 'paid',
  canceled = 'canceled',
  refused = 'refused',
  refunded = 'refunded',
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

export interface User extends PrismaUser {
  hasPaid?: boolean;
}

export interface BodyRequest<T> extends Request {
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

// Toornament
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
