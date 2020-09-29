import database from '../utils/database';

export const fetchSetting = (id: string) => {
  return database.settings.findOne({ where: { id } });
};

export const fetchLogin = () => {
  return database.settings.findOne({ where: { id: 'login' } });
};

export const fetchShop = () => {
  return database.settings.findOne({ where: { id: 'shop' } });
};
