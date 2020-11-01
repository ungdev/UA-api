import database from '../utils/database';

export const fetchSetting = (id: 'login' | 'shop') => {
  return database.setting.findOne({ where: { id } });
};
