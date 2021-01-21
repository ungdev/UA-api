import database from '../services/database';

export const fetchSettings = () => database.setting.findMany();

export const fetchSetting = (id: 'login' | 'shop') => {
  return database.setting.findUnique({ where: { id } });
};

const setSettingAllowed = (id: string, allowed: boolean) =>
  database.setting.update({
    where: {
      id,
    },
    data: {
      value: allowed,
    },
  });

export const setLoginAllowed = (allowed: boolean) => setSettingAllowed('login', allowed);
export const setShopAllowed = (allowed: boolean) => setSettingAllowed('shop', allowed);
