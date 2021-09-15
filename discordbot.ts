import discord from 'discord.js';
import { TournamentId } from '.prisma/client';
import { fetchTournaments, fetchTournament } from './src/operations/tournament';
import { fetchTeams } from './src/operations/team';
import env from './src/utils/env';

const bot = new discord.Client();

async function createChannel(channelName: string, channelType: ChannelType, tournamentId: TournamentId) {
  const server = bot.guilds.cache.get(env.discord.server);
  const channel = await server.channels.create(channelName, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type: channelType as any,
  });

  const categoryId = (await fetchTournament(tournamentId)).discordCategoryId;
  await channel.setParent(categoryId);
  Promise.all([
    channel.createOverwrite(channel.guild.roles.everyone, {
      VIEW_CHANNEL: false,
    }),
    channel.createOverwrite(
      channel.guild.roles.cache.find((r) => r.name === channelName),
      {
        VIEW_CHANNEL: true,
      },
    ),
  ]);
}

function createRole(teamName: string) {
  const server = bot.guilds.cache.get(env.discord.server);
  server.roles.create({
    data: {
      name: teamName,
      color: 'FFEBAB',
    },
  });
}

export function setupTeam(team: string, tournamentId: TournamentId) {
  Promise.all([
    createRole(team),
    createChannel(team, ('text' as unknown) as ChannelType, tournamentId),
    createChannel(team, ('voice' as unknown) as ChannelType, tournamentId),
  ]);
}

export async function syncRoles() {
  const server = bot.guilds.cache.get(env.discord.server);

  for (const game of await fetchTournaments()) {
    const tournamentRole = server.roles.cache.find((role) => role.id === game.discordRoleId);

    for (const team of await fetchTeams(game.id)) {
      if (team.lockedAt !== null) {
        const teamRole = server.roles.cache.find((role) => role.name === team.name);

        for (const player of team.players) {
          const member = await server.members.fetch(player.discordId);
          member.roles.add(tournamentRole);
          member.roles.add(teamRole);
        }
      }
    }
  }
}

bot.login(env.discord.token);
