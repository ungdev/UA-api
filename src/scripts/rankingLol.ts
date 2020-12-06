// import Sentry from '@sentry/node';
import axios from 'axios';
import cheerio from 'cheerio';
import { createObjectCsvWriter } from 'csv-writer';
import { fetchTournament } from '../operations/tournament';

import { toornamentInit, fetchParticipantsSummonersName } from '../utils/toornament';
import logger from '../utils/log';
// import { initSentryNode } from '../utils/sentry';
import { SummonersParticipants } from '../types';

const csvWriter = createObjectCsvWriter({
  path: 'out.csv',
  header: [
    { id: 'name', title: 'Name' },
    { id: 'summonersName', title: 'ToornamentName' },
    { id: 'validNames', title: 'ValidNames' },
    { id: 'ranks', title: 'Ranks' },
    { id: 'scorePlayers', title: 'ScorePlayers' },
    { id: 'teamScore', title: 'TeamScore' },
    { id: 'complete', title: 'Complete' },
    { id: 'opGG', title: 'opGG' },
  ],
});

const scorePalier: Record<string, number[]> = {
  Unranked: [0, 0],
  Iron: [0, 1],
  Bronze: [0, 1],
  Silver: [10, 1],
  Gold: [20, 2],
  Platinum: [40, 3],
  Diamond: [70, 4],
  Master: [100, 0],
  Grandmaster: [150, 0],
  Challenger: [300, 0],
  Level: [0, 0],
};

const scorePlayer = (rank: string) => {
  const splitRank: string[] = rank.split(' ');
  if (scorePalier[splitRank[0]][1] === 0) {
    return scorePalier[splitRank[0]][0];
  }
  return scorePalier[splitRank[0]][0] + scorePalier[splitRank[0]][1] * (4 - Number.parseInt(splitRank[1], 10));
};

const rankTeam = async (team: SummonersParticipants) => {
  const query = team.summonersName.join(',');
  const opGG = `https://euw.op.gg/multi/query=${encodeURIComponent(query)}`;
  const result = await axios.get(opGG);
  const $ = cheerio.load(result.data);
  const ranks: string[] = [];
  $('div .lp').each((_, element) => {
    ranks.push($(element).text());
  });
  const validNames: string[] = [];
  $('div .name').each((_, element) => {
    validNames.push($(element).text().trim());
  });
  const scorePlayers = ranks.map((rank) => scorePlayer(rank));
  return {
    ...team,
    ranks,
    validNames,
    scorePlayers,
    opGG,
    teamScore: scorePlayers.reduce((a, b) => {
      return a + b;
    }),
    complete: validNames.length === team.summonersName.length,
  };
};

(async () => {
  // initSentryNode();
  await toornamentInit();

  const tournament = await fetchTournament('lol');
  const toornamentParticipants = await fetchParticipantsSummonersName(tournament.toornamentId);
  let invalidParticipants = toornamentParticipants.filter((team) => team.summonersName.some((name) => name === ''));
  invalidParticipants = invalidParticipants.map((team) => ({ ...team, complete: false }));
  let validParticipants = toornamentParticipants.filter((team) => team.summonersName.every((name) => name !== ''));
  validParticipants = await Promise.all(validParticipants.map((team) => rankTeam(team)));
  await csvWriter.writeRecords([...validParticipants, ...invalidParticipants]);
  process.exit(0);
})().catch((error) => {
  logger.error(error);
  // Sentry.captureException(error);
  process.exit(1);
});
