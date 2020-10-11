import database from '../utils/database';

export const fetchSetting = (id: 'login' | 'shop') => {
  return database.settings.findOne({ where: { id } });
};
