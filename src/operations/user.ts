import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query'],
});

export const fetchUsers = () => {
  return prisma.user.findMany();
};

export const fetchUser = (id: string) => {
  return prisma.user.findOne({ where: { id } });
};
