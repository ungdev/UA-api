import database from '../services/database';

export const fetchCommissions = () =>
  database.commission.findMany({
    select: { id: true, name: true, color: true, masterCommissionId: true },
    orderBy: { position: 'asc' },
  });

export const fetchCommission = (id: string) => database.commission.findUnique({ where: { id } });
