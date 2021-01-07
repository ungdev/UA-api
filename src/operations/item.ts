import database from '../services/database';

export const fetchItems = () => {
  return database.item.findMany();
};
