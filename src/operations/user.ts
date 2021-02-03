import userOperations from 'bcryptjs';
import { TransactionState, UserType } from '@prisma/client';
import database from '../services/database';
import nanoid from '../utils/nanoid';
import env from '../utils/env';
import { PrimitiveUser, User } from '../types';

export const userInclusions = {
  cartItems: {
    include: {
      cart: true,
    },
  },
};

export const formatUser = (user: PrimitiveUser): User => {
  if (!user) return null;

  if (user.cartItems.some((cartItem) => cartItem.forUserId !== user.id))
    throw new Error('Error just to make sure of something');

  const hasPaid = user.cartItems.some(
    (cartItem) => cartItem.itemId === 'ticket-player' && cartItem.cart.transactionState === TransactionState.paid,
  );

  return {
    ...user,
    hasPaid,
  };
};

export const fetchUser = async (parameterId: string, key = 'id'): Promise<User> => {
  const user = await database.user.findUnique({
    where: { [key]: parameterId },
    include: userInclusions,
  });

  return formatUser(user);
};

export const createUser = async (
  username: string,
  firstname: string,
  lastname: string,
  email: string,
  password: string,
  type: UserType,
) => {
  const salt = await userOperations.genSalt(env.bcrypt.rounds);
  const hashedPassword = await userOperations.hash(password, salt);
  return database.user.create({
    data: {
      id: nanoid(),
      username,
      firstname,
      lastname,
      email,
      type,
      password: hashedPassword,
      registerToken: nanoid(),
    },
  });
};

export const createVisitor = (firstname: string, lastname: string) =>
  database.user.create({
    data: {
      id: nanoid(),
      firstname,
      lastname,
      type: UserType.visitor,
    },
  });

export const removeUserRegisterToken = (userId: string) =>
  database.user.update({
    data: {
      registerToken: null,
    },
    where: {
      id: userId,
    },
  });

export const removeUserResetToken = (userId: string) =>
  database.user.update({
    data: {
      resetToken: null,
    },
    where: {
      id: userId,
    },
  });

export const generateResetToken = (userId: string) =>
  database.user.update({
    data: {
      resetToken: nanoid(),
    },
    where: {
      id: userId,
    },
  });

export const changePassword = async (user: User, newPassword: string) => {
  const salt = await userOperations.genSalt(env.bcrypt.rounds);
  const hashedPassword = await userOperations.hash(newPassword, salt);

  return database.user.update({
    where: {
      id: user.id,
    },
    data: {
      password: hashedPassword,
    },
  });
};

export const deleteUser = (id: string) => database.user.delete({ where: { id } });
