import { UserType, TransactionState, UserAge } from '@prisma/client';
import database from '../database';
import { fetchGuildMembers } from '../discord';

export const getNotOnDiscordServerUsers = async () => {
  const [members, users] = await Promise.all([
    fetchGuildMembers().then((list) => list.map((member) => member.user.id)),
    database.user.findMany({
      where: {
        discordId: {
          not: null,
        },
        email: {
          not: null,
        },
        OR: [
          {
            team: {
              lockedAt: {
                not: null,
              },
            },
          },
          {
            type: UserType.spectator,
          },
        ],
        cartItems: {
          some: {
            itemId: {
              startsWith: 'ticket-',
            },
            cart: {
              paidAt: {
                not: null,
              },
              transactionState: TransactionState.paid,
            },
          },
        },
      },
    }),
  ]);
  return users.filter((user) => !members.includes(user.discordId));
};

export const getNotPaidUsers = () =>
  database.user.findMany({
    distinct: ['id'],
    where: {
      AND: [
        {
          OR: [
            {
              cartItems: {
                some: {
                  AND: [
                    {
                      itemId: {
                        startsWith: 'ticket-',
                      },
                      forcePaid: false,
                    },
                    {
                      cart: {
                        transactionState: {
                          not: 'paid',
                        },
                      },
                    },
                  ],
                },
              },
            },
            {
              cartItems: {
                none: {},
              },
            },
          ],
        },
        {
          team: {
            lockedAt: null,
          },
        },
      ],
    },
  });

export const getNotPaidSsbuUsers = () =>
  database.user.findMany({
    distinct: ['id'],
    where: {
      AND: [
        {
          OR: [
            {
              cartItems: {
                some: {
                  AND: [
                    {
                      itemId: {
                        startsWith: 'ticket-',
                      },
                      forcePaid: false,
                    },
                    {
                      cart: {
                        transactionState: {
                          not: 'paid',
                        },
                      },
                    },
                  ],
                },
              },
            },
            {
              cartItems: {
                none: {},
              },
            },
          ],
        },
        {
          team: {
            tournament: {
              id: 'ssbu',
            },
          },
        },
        {
          team: {
            lockedAt: null,
          },
        },
      ],
    },
  });

export const getMinorUsers = () =>
  database.user.findMany({
    where: {
      discordId: {
        not: null,
      },
      email: {
        not: null,
      },
      age: UserAge.child,
      cartItems: {
        some: {
          itemId: {
            startsWith: 'ticket-',
          },
          cart: {
            paidAt: {
              not: null,
            },
            transactionState: TransactionState.paid,
          },
        },
      },
    },
  });
