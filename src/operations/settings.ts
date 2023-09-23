import { PrismaPromise } from '@prisma/client';
import database from '../services/database';
import { Setting } from '../types';

export const fetchSettings = (): PrismaPromise<Setting[]> => database.setting.findMany();

export const fetchSetting = (id: 'login' | 'shop' | 'trombi'): PrismaPromise<Setting> =>
  database.setting.findUnique({ where: { id } });

const setSettingAllowed = (id: string, allowed: boolean): PrismaPromise<Setting> =>
  database.setting.update({
    where: {
      id,
    },
    data: {
      value: allowed,
    },
  });

export const setLoginAllowed = (allowed: boolean): PrismaPromise<Setting> => setSettingAllowed('login', allowed);
export const setShopAllowed = (allowed: boolean): PrismaPromise<Setting> => setSettingAllowed('shop', allowed);
export const setTrombiAllowed = (allowed: boolean): PrismaPromise<Setting> => setSettingAllowed('trombi', allowed);
