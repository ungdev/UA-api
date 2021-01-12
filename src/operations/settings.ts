import database from '../services/database';

export const fetchSetting = (id: 'login' | 'shop') => {
  return database.setting.findUnique({ where: { id } });
};

export const setLoginAllowed = (allowed: boolean) => {
  return database.setting.update({
    where: {
      id: 'login',
    },
    data: {
      value: allowed,
    },
  });
};
