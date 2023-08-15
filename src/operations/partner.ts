import { nanoid } from 'nanoid';
import { Partner, PrismaPromise } from '@prisma/client';
import database from '../services/database';

export const fetchPartners = (): PrismaPromise<Partner[]> => database.partner.findMany();

export const addPartner = (partner: {
  name: string;
  logo: string;
  link: string;
  display?: boolean;
}): PrismaPromise<Partner> =>
  database.partner.create({
    data: {
      id: nanoid(),
      name: partner.name,
      logo: partner.logo,
      link: partner.link,
      display: partner.display,
    },
  });

export const updatePartner = (
  id: string,
  data: { name?: string; logo?: string; link?: string; display?: boolean },
): PrismaPromise<Partner> =>
  database.partner.update({
    where: { id },
    data,
  });

export const removePartner = (id: string): PrismaPromise<Partner> =>
  database.partner.delete({
    where: { id },
  });
