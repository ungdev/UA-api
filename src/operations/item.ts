import database from '../services/database';
import { filterItem } from '../utils/filters';

export const fetchItems = async () => {
  const items = await database.item.findMany();

  return items.map(filterItem);
};
