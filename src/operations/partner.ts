import { nanoid } from 'nanoid';
import { Partner, PrismaPromise } from '@prisma/client';
import database from '../services/database';

export const fetchPartners = (): PrismaPromise<Partner[]> =>
  database.partner.findMany({
    orderBy: {
      position: 'asc',
    },
  });

export const addPartner = (partner: { name: string; link: string; display?: boolean }): PrismaPromise<Partner> =>
  database.partner.create({
    data: {
      id: nanoid(),
      name: partner.name,
      link: partner.link,
      display: partner.display,
    },
  });

export const updatePartner = (
  id: string,
  data: { name?: string; link?: string; display?: boolean },
): PrismaPromise<Partner> =>
  database.partner.update({
    where: { id },
    data,
  });

export const updatePartnersPosition = async (partners: { id: string; position: number }[]) => {
  for (const partner of partners) {
    await database.partner.update({
      where: {
        id: partner.id,
      },
      data: {
        position: partner.position,
      },
    });
  }
};

export const removePartner = (id: string): PrismaPromise<Partner> =>
  database.partner.delete({
    where: { id },
  });
