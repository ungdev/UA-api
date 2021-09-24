import discord from 'discord.js';
import { TournamentId } from '.prisma/client';
import { fetchTournaments, fetchTournament } from '../operations/tournament';
import { fetchTeams } from '../operations/team';
import env from './env';

// Create bot as a discord client
const bot = new discord.Client();

async function createChannel(channelName: string, channelType: 'voice' | 'text', tournamentId: TournamentId) {
  // Get channel and create channels in it
  const server = bot.guilds.cache.get(env.discord.server);
  const channel = await server.channels.create(channelName, {
    type: channelType,
  });

  const categoryId = (await fetchTournament(tournamentId)).discordCategoryId;
  await channel.setParent(categoryId);

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
}

function createRole(teamName: string) {
  // Get the server and create a role in it
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
    createChannel(team, 'text', tournamentId),
    createChannel(team, 'voice', tournamentId),
  ]);
}

export async function syncRoles() {
  // Get the server, loop all tournaments, loop all teams in tournaments and loop all player in teams to give them the role
  const server = bot.guilds.cache.get(env.discord.server);

  for (const tournament of await fetchTournaments()) {
    const tournamentRole = server.roles.cache.find((role) => role.id === tournament.discordRoleId);

    for (const team of await fetchTeams(tournament.id)) {
      if (team.lockedAt !== null) {
        const teamRole = server.roles.cache.find((role) => role.name === team.name);

        for (const player of team.players) {
          const member = await server.members.fetch(player.discordId);
          if (member) {
            member.roles.add(tournamentRole);
            member.roles.add(teamRole);
          }
        }
      }
    }
  }
}

export async function clearRoles(playerId: string) {
  // Get the member and remove roles
  const member = await bot.guilds.cache.get(env.discord.server).members.fetch(playerId);
  member.roles.remove(member.roles.cache);
}

// Login the bot
bot.login(env.discord.token);
