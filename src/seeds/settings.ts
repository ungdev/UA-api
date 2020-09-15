import { getConnection, InsertResult } from 'typeorm';
import SettingModel from '../models/setting';

export default (): Promise<InsertResult> => {
  const settings = [
    {
      id: 'login',
      value: 'false',
    },
    {
      id: 'shop',
      value: 'false',
    },
  ];

  return getConnection().createQueryBuilder().insert().into(SettingModel).values(settings).execute();
};
