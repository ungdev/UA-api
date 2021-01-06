import database from '../services/database';

export const fetchSetting = (id: 'login' | 'shop') => {
  return database.setting.findOne({ where: { id } });
};
