import discord from 'discord.js';
import config from './botconfig.json';
import { TournamentId } from '.prisma/client';
import { fetchTournaments, fetchTournament } from './src/operations/tournament';
import { fetchTeams } from './src/operations/team';

const bot = new discord.Client();
const serverid = '885899085452816384';

function createChannel(cname: string, ctype: ChannelType, gameId: TournamentId) {
  const server = bot.guilds.cache.get(serverid);
  server.channels
    .create(cname, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: ctype as any,
    })
    .then(async (channel) => {
      const catID = (await fetchTournament(gameId)).id;
      await channel.setParent(catID);
      Promise.all([
        channel.createOverwrite(channel.guild.roles.everyone, {
          VIEW_CHANNEL: false,
        }),
        channel.createOverwrite(
          channel.guild.roles.cache.find((r) => r.name === cname),
          {
            VIEW_CHANNEL: true,
          },
        ),
      ]);
    });
}

function createRole(tname: string) {
  const server = bot.guilds.cache.get(serverid);
  server.roles.create({
    data: {
      name: tname,
      color: 'FFEBAB',
    },
  });
}

export function setupTeam(team: string, gameId: TournamentId) {
  Promise.all([
    createRole(team),
    createChannel(team, ('text' as unknown) as ChannelType, gameId),
    createChannel(team, ('voice' as unknown) as ChannelType, gameId),
  ]);
}

bot.on('ready', async () => {
  const server = bot.guilds.cache.get(serverid);
  for (const game of await fetchTournaments()) {
    const gamerole = server.roles.cache.find((role) => role.id === game.discordRoleId);
    for (const team of await fetchTeams(game.id)) {
      if (team.lockedAt !== null) {
        const teamrole = server.roles.cache.find((role) => role.name === team.name);
        for (const player of team.players) {
          // Do thing
          // fetch player on the discord server
          const member = server.members.fetch(player.discordId);
          // test if the player has roles
          // if not, give the roles to the player
          (await member).roles.add(gamerole);
          (await member).roles.add(teamrole);
        }
      }
    }
  }
});

export function syncRoles() {
  // Get locked teams
  // Loop all locked teams and loop all players in the teams
  // Test if player doesn't have roles
  // Give the player the team role and the game role
}

bot.login(config.token);
