import Joi from 'joi';
import { TournamentId, UserAge, UserType } from '@prisma/client';
import { Permission, Error as ResponseError } from '../types';

// Matches with LoL EUW summoner name
const usernameRegex = /^[0-9\p{L} _-]{3,16}$/u;
const nameRegex = /^[\p{L}\d _'-]{3,100}$/u;
const lastnameRegex = /^[\p{L} _'-]{2,100}$/u;
const passwordRegex = /^.{6,100}$/;
const placeRegex = /^[A-Z]\d{1,3}$/;

// General
export const id = Joi.string()
  .regex(/^[\dA-Z]{6}$/)
  .error(new Error(ResponseError.InvalidUsername));

// User
export const username = Joi.string().regex(usernameRegex).error(new Error(ResponseError.InvalidUsername));
export const firstname = Joi.string().regex(nameRegex).error(new Error(ResponseError.InvalidFirstName));
export const lastname = Joi.string().regex(lastnameRegex).error(new Error(ResponseError.InvalidLastName));
export const email = Joi.string().email().error(new Error(ResponseError.InvalidEmail));
export const password = Joi.string().regex(passwordRegex).error(new Error(ResponseError.InvalidPassword));
export const discordId = Joi.string().error(new Error(ResponseError.InvalidDiscordid));
export const type = Joi.string()
  .valid(...Object.keys(UserType))
  .error(new Error(ResponseError.InvalidUserType));
export const age = Joi.string()
  .valid(...Object.keys(UserAge))
  .error(new Error(ResponseError.InvalidAge));
export const place = Joi.string().regex(placeRegex).error(new Error(ResponseError.InvalidPlace));
export const permission = Joi.string()
  .valid(...Object.keys(Permission))
  .error(new Error(ResponseError.NoPermission));
export const stringBoolean = Joi.string().valid('true', 'false').error(new Error(ResponseError.stringBooleanError));

// Team
export const teamName = Joi.string().regex(nameRegex).error(new Error(ResponseError.InvalidTeamName));

// Cart
export const quantity = Joi.number().integer().min(1).error(new Error(ResponseError.EmptyBasket));

// Tournament
export const tournamentId = Joi.string()
  .valid(...Object.keys(TournamentId))
  .error(new Error(ResponseError.InvalidTournamentId));
