import Joi from 'joi';
import { TransactionState, UserType } from '@prisma/client';

const dynamicEntity = Joi.object({
  id: Joi.string().length(6).required(),
  createdAt: Joi.date().required(),
  updatedAt: Joi.date().min(Joi.ref('createdAt')).required(),
});

export const cartValidator = dynamicEntity.append({
  transactionState: Joi.string()
    .valid(...Object.keys(TransactionState))
    .default('pending')
    .required(),
  transactionId: Joi.number(),
  paidAt: Joi.date(),
  userId: Joi.string().length(6).required(),
});

export const cartItemValidator = dynamicEntity.append({
  quantity: Joi.number().min(1).required(),
  itemId: Joi.string().required(),
  forUserId: Joi.string().length(6).required(),
  cartId: Joi.string().length(6).required(),
});

export const teamValidator = dynamicEntity.append({
  name: Joi.string().required(),
  lockedAt: Joi.date(),
  captainId: Joi.string().length(6).required(),
  tournamentId: Joi.string().required(),
});

export const userValidator = Joi.object({
  username: Joi.string().required(),
  firstname: Joi.string().required(),
  lastname: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  discordId: Joi.string().required(),
});

export const contactValidator = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  subject: Joi.string().required(),
  message: Joi.string().required(),
});

export const playerValidator = Joi.object({
  custom_fields: Joi.object({
    nom_complet: Joi.object({
      first_name: Joi.string().required(),
      last_name: Joi.string().required(),
    })
      .unknown()
      .required(),
  })
    .unknown()
    .required(),
}).unknown();
