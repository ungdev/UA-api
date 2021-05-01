import Joi from 'joi';
import { TournamentId, UserType } from '@prisma/client';

// Matches with LoL EUW summoner name
const usernameRegex = /^[0-9\p{L} _.]{3,16}$/u;
const nameRegex = /^[\p{L} _'-]{3,100}/u;
const passwordRegex = /^.{6,100}$/;

// General
export const id = Joi.string().regex(/^[\dA-Z]{6}$/);

// User
export const username = Joi.string().regex(usernameRegex);
export const firstname = Joi.string().regex(nameRegex);
export const lastname = Joi.string().regex(nameRegex);
export const email = Joi.string().email();
export const password = Joi.string().regex(passwordRegex);
export const discordId = Joi.string();
export const type = Joi.string().valid(UserType.player, UserType.coach);

// Team
export const teamName = Joi.string().regex(nameRegex);

// Cart
export const quantity = Joi.number().integer().min(1);

// Tournament
export const tournamentId = Joi.string().valid(...Object.keys(TournamentId));
