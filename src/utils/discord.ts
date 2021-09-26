import discord from 'discord.js';
import { TournamentId } from '.prisma/client';
import { fetchTournaments, fetchTournament } from '../operations/tournament';
import { fetchTeams } from '../operations/team';
import env from './env';

// Create bot as a discord client
const bot = new discord.Client();

const createChannel = async (channelName: string, channelType: 'voice' | 'text', tournamentId: TournamentId) => {
  // Get channel and create channels in it
  const server = bot.guilds.cache.get(env.discord.server);
  const channel = await server.channels.create(channelName, {
    type: channelType,
  });

  const tournament = await fetchTournament(tournamentId);
  await channel.setParent(tournament.discordCategoryId);

  // Configure channel's permissions
  await channel.createOverwrite(channel.guild.roles.everyone, {
    VIEW_CHANNEL: false,
  });

  await channel.createOverwrite(
    channel.guild.roles.cache.find((r) => r.name === channelName),
    {
      VIEW_CHANNEL: true,
    },
  );

  await channel.createOverwrite(
    channel.guild.roles.cache.find((r) => r.id === tournament.discordRespRoleId),
    {
      VIEW_CHANNEL: true,
    },
  );
};

const createRole = (teamName: string) => {
  // Get the server and create a role in it
  const server = bot.guilds.cache.get(env.discord.server);
  server.roles.create({
    data: {
      name: teamName,
      color: 'FFEBAB',
    },
  });
};

// eslint-disable-next-line arrow-body-style
export const setupTeam = (team: string, tournamentId: TournamentId) => {
  return Promise.all([
    createRole(team),
    createChannel(team, 'text', tournamentId),
    createChannel(team, 'voice', tournamentId),
  ]);
};

export const syncRoles = async () => {
  // Get the server, loop all tournaments, loop all teams in tournaments and loop all player in teams to give them the role
  const server = bot.guilds.cache.get(env.discord.server);

  for (const tournament of await fetchTournaments()) {
    if (tournament.playersPerTeam === 1) {
      // eslint-disable-next-line no-continue
      continue;
    }
    const tournamentRole = server.roles.cache.find((role) => role.id === tournament.discordRoleId);

    for (const team of await fetchTeams(tournament.id)) {
      if (team.lockedAt === null) {
        // eslint-disable-next-line no-continue
        continue;
      }

      const teamRole = server.roles.cache.find((role) => role.name === team.name);

      for (const player of team.players) {
        const member = await server.members.fetch(player.discordId);
        if (member) {
          member.roles.add(tournamentRole);
          member.roles.add(teamRole);
        }
      }
      for (const coach of team.coaches) {
        const member = await server.members.fetch(coach.discordId);
        if (member) {
          member.roles.add(tournamentRole);
          member.roles.add(teamRole);
        }
      }
    }
  }
};

export const clearRoles = async (playerId: string) => {
  // Get the member and remove roles
  const member = await bot.guilds.cache.get(env.discord.server).members.fetch(playerId);
  member.roles.remove(member.roles.cache);
};

// Login the bot
bot.login(env.discord.token);
