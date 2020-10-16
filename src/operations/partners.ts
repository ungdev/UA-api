import database from '../utils/database';

export const fetchPartners = () => {
  return database.partner.findMany();
};
