import database from '../services/database';

export const fetchCommission = (id: string) => database.commission.findUnique({where: {id}});
