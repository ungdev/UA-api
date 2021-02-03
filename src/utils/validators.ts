import Joi from 'joi';
import { UserType } from '@prisma/client';

// General
export const id = Joi.string()
  .regex(/^[\dA-Z]{6}$/)
  .required();

// User
export const username = Joi.string().required();
export const firstname = Joi.string().required();
export const lastname = Joi.string().required();
export const email = Joi.string().email().required();
export const password = Joi.string().required();
export const discordId = Joi.string().required();
export const type = Joi.string().valid(UserType.player, UserType.visitor);

// Team
export const teamName = Joi.string().required();

// Cart
export const quantity = Joi.number().integer().min(1).required();
