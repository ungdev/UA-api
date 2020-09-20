import { Tournament } from '@prisma/client';
import { Request, Response } from 'express';
import { countTeamsWhere } from '../../operations/team';
import { fetchTournaments } from '../../operations/tournament';
import { success } from '../../utils/responses';

export default [
  // Middlewares

  // Controller
  async (request: Request, response: Response) => {
    const tournaments: Tournament[] = await fetchTournaments();
    const lockedTeamsPerTournaments = await Promise.all(
      tournaments.map((tournament) => {
        return countTeamsWhere({
          tournamentId: tournament.id,
          lockedAt: {
            lte: new Date(),
          },
        });
      }),
    );
    const result = tournaments.map((tournament, index) => ({
      ...tournament,
      lockedTeamsCount: lockedTeamsPerTournaments[index],
    }));

    return success(response, result);
  },
];
