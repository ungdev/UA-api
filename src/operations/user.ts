import { getRepository } from 'typeorm';
import UserModel from '../models/user';

export const fetchUsers = (): Promise<UserModel[]> => {
  return getRepository(UserModel).find();
};

export const fetchUser = (id: string): Promise<UserModel> => {
  return getRepository(UserModel).findOne({ where: { id } });
};
