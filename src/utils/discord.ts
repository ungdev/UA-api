/* eslint-disable default-case */
/* eslint-disable import/no-unresolved */
import axios from 'axios';
import { fetchTournaments, fetchTournament } from '../operations/tournament';
import { fetchTeam, fetchTeams } from '../operations/team';
import {
  createDiscordChannel,
  createDiscordRole,
  fetchGuildMembers,
  addMemberRole,
  fetchGuildMember,
  removeMemberRole,
  deleteDiscordChannel,
  deleteDiscordRole,
  callWebhook,
} from '../services/discord';
import {
  DiscordChannelPermission,
  DiscordChannelPermissionType,
  DiscordChannelType,
  DiscordRole,
  Snowflake,
} from '../controllers/discord/discordApi';
import database from '../services/database';
import { Team, Tournament, User, Contact } from '../types';
import env from './env';
import logger from './logger';

const createDiscordTeamChannel = async (
  channelName: string,
  channelType: DiscordChannelType,
  tournamentId: string,
  teamRole: DiscordRole,
  parentId: Snowflake,
) => {
  const tournament = await fetchTournament(tournamentId);

  return createDiscordChannel({
    name: channelName,
    type: channelType,
    parent_id: parentId,
    permission_overwrites: [
      {
        // The discord server id corresponds to @everyone role id
        // https://discord.com/developers/docs/topics/permissions#role-object
        id: env.discord.server,
        type: DiscordChannelPermissionType.ROLE,
        allow: DiscordChannelPermission.DEFAULT,
        deny: DiscordChannelPermission.VIEW_CHANNEL,
      },
      {
        id: tournament.discordRespoRoleId,
        type: DiscordChannelPermissionType.ROLE,
        allow: DiscordChannelPermission.VIEW_CHANNEL,
        deny: DiscordChannelPermission.DEFAULT,
      },
      {
        id: teamRole.id,
        type: DiscordChannelPermissionType.ROLE,
        allow: DiscordChannelPermission.VIEW_CHANNEL,
        deny: DiscordChannelPermission.DEFAULT,
      },
    ],
  });
};

export const setupDiscordTeam = async (team: Team, tournament: Tournament) => {
  if (!env.discord.token) {
    logger.warn('Discord token missing. It will skip discord calls');
    return;
  }

  // Only create channel if there are more than 1 player per team
  if (tournament.playersPerTeam !== 1) {
    const role = await createDiscordRole({ name: team.name, color: env.discord.teamRoleColor });

    logger.debug(`Create discord channels for ${team.name}`);
    // Create the channels and update in the database the role.
    const [textChannel, voiceChannel] = await Promise.all([
      createDiscordTeamChannel(
        team.name,
        DiscordChannelType.GUILD_TEXT,
        tournament.id,
        role,
        tournament.discordTextCategoryId,
      ),
      createDiscordTeamChannel(
        team.name,
        DiscordChannelType.GUILD_VOICE,
        tournament.id,
        role,
        tournament.discordVocalCategoryId,
      ),
    ]);
    database.team.update({
      data: { discordRoleId: role.id, discordTextChannelId: textChannel.id, discordVoiceChannelId: voiceChannel.id },
      where: { id: team.id },
    });
  }
};

export const syncRoles = async () => {
  if (!env.discord.token) {
    logger.warn('Discord token missing. It will skip discord calls');
    return;
  }

  // First step: download the entire guild member list from discord
  const guildMembers = await fetchGuildMembers();

  // Get the server, loop all tournaments, loop all teams in tournaments and loop all player in teams to give them the role
  for (const tournament of await fetchTournaments()) {
    for (const team of await fetchTeams(tournament.id)) {
      // Do not care about the non-locked teams
      if (team.lockedAt === null) {
        continue;
      }

      const users = [...team.players, ...team.coaches];

      // Using a for loop not to parallelize too much requests to the discord api
      for (const user of users) {
        // Retrieve the guildmember corresponding to the user (if it exists)
        const member = guildMembers.find((guildMember) => guildMember.user.id === user.discordId);
        // Jump to next member if member does not exist
        if (!member) continue;

        // If the member doesn't have the tournament role, add it
        if (!member.roles.includes(tournament.discordRoleId)) {
          logger.debug(`Add ${tournament.id} tournament role to ${user.username}`);
          await addMemberRole(member.user.id, tournament.discordRoleId);
        }

        // If the team has a role id (not for discord roles) and the member doesn't have it, add it
        if (team.discordRoleId && !member.roles.includes(team.discordRoleId)) {
          logger.debug(`Add ${team.name} team (${tournament.id}) role to ${user.username}`);
          await addMemberRole(member.user.id, team.discordRoleId);
        }
      }
    }
  }
};

/**
 * Removes {@link Team#discordRoleId} and {@link Tournament#discordRoleId}
 * from a given {@link User}
 * @param fromUser the user to remove discord roles from
 */
export const removeDiscordRoles = async (fromUser: User) => {
  if (!env.discord.token) {
    logger.warn('Discord token missing. It will skip discord calls');
    return;
  }

  // Abort while the user has neither linked discord account nor team
  if (!fromUser.discordId || !fromUser.teamId) return;
  const team = await fetchTeam(fromUser.teamId);
  // Abort while the team is unlocked or detached from any tournament
  if (!team.tournamentId || !team.lockedAt) return;
  const tournament = await fetchTournament(team.tournamentId);

  // We have all roles here. Fetch the roles of the DiscordGuildMember
  // before trying to remove them (as it is a different route, we won't
  // increase the role rate limits)
  try {
    const discordGuildMember = await fetchGuildMember(fromUser.discordId);
    if (team.discordRoleId && discordGuildMember.roles && discordGuildMember.roles.includes(team.discordRoleId))
      await removeMemberRole(fromUser.discordId, team.discordRoleId);
    if (
      tournament.discordRoleId &&
      discordGuildMember.roles &&
      discordGuildMember.roles.includes(tournament.discordRoleId)
    )
      await removeMemberRole(fromUser.discordId, tournament.discordRoleId);
  } catch (error) {
    if (!error.response || error.response.status !== 404) throw error;
    // Uh uh... It seems the discord member doesn't exist
    // Or the role has been deleted - but don't care as we wanted to remove it
    // You have left the server. How dare you ?!
  }
};

export const deleteDiscordTeam = async (team: Team) => {
  if (!env.discord.token) {
    logger.warn('Discord token missing. It will skip discord calls');
    return;
  }
  await deleteDiscordRole(team.discordRoleId);
  await deleteDiscordChannel(team.discordTextChannelId);
  await deleteDiscordChannel(team.discordVoiceChannelId);
};

export const getWebhookEnvFromString = (name: string) => {
  let envValue = env.discord.webhooks.channel_other;
  switch (name) {
    case 'lol': {
      envValue = env.discord.webhooks.channel_lol;
      break;
    }
    case 'ssbu': {
      envValue = env.discord.webhooks.channel_ssbu;
      break;
    }
    case 'cs2': {
      envValue = env.discord.webhooks.channel_cs2;
      break;
    }
    case 'pokemon': {
      envValue = env.discord.webhooks.channel_pokemon;
      break;
    }
    case 'rl': {
      envValue = env.discord.webhooks.channel_rl;
      break;
    }
    case 'osu': {
      envValue = env.discord.webhooks.channel_osu;
      break;
    }
    case 'tft': {
      envValue = env.discord.webhooks.channel_tft;
      break;
    }
    case 'open': {
      envValue = env.discord.webhooks.channel_open;
      break;
    }
  }
  return envValue;
};

export const sendDiscordTeamLockout = async (team: Team, tournament: Tournament) => {
  // Get the webhook of the tournament
  const webhook = getWebhookEnvFromString(tournament.id.toString());

  if (!webhook || webhook === undefined || webhook === '') {
    logger.warn(
      `Discord webhook for team ${tournament.name} is missing. It will skip discord messages for team locking`,
    );
    logger.warn(`Team ${team.name} (id : ${team.id}) is now locked but no discord messages could be sent)`);
  } else {
    // Get the list of players in this team
    const playersList = [];
    for (const p of team.players) {
      playersList.push({ name: `${p.username}`, value: `<@${p.discordId}>` });
    }

    const nbPlaces = tournament.maxPlayers / tournament.playersPerTeam;
    const nbParticipants = tournament.lockedTeamsCount;

    let coachsList = [{ name: 'Les coachs de cette équipe sont : ', value: '' }];
    for (const c of team.coaches) {
      coachsList.push({ name: `${c.username} - [coach]`, value: `<@${c.discordId}>` });
    }
    if (coachsList.length === 1) {
      coachsList = [];
    }

    // An array of Discord Embeds.
    const embeds = [
      {
        title: `L'équipe **${team.name}** est maintenant verrouillée ! 🚀\n\nCette équipe contient les joueurs : `,
        color: 5174599,
        footer: {
          text: `Equipe pour ${tournament.name} complète, billets payés\n\n${nbParticipants} / ${nbPlaces} places occupées - ${tournament.name}`,
        },
        fields: [...playersList, ...coachsList],
      },
    ];
    callWebhook(webhook, embeds);
  }
};

export const sendDiscordTeamUnlock = async (team: Team, tournament: Tournament) => {
  // Get the webhook of the tournament
  const webhook = getWebhookEnvFromString(tournament.id.toString());
  if (!webhook || webhook === undefined || webhook === '') {
    logger.warn(
      `Discord webhook for team ${tournament.name} is missing. It will skip discord messages for team unlocking`,
    );
    logger.warn(`Team ${team.name} (id : ${team.id}) is now unlocked but no discord messages could be sent)`);
  } else {
    const nbPlaces = tournament.maxPlayers / tournament.playersPerTeam;
    const nbParticipants = tournament.lockedTeamsCount;

    // An array of Discord Embeds.
    const embeds = [
      {
        title: `L'équipe **${team.name}** n'est plus verrouillée ! ❌\n`,
        color: 14177041,
        footer: {
          text: `Equipe pour ${tournament.name}. Après modification, cette équipe n'est plus verrouillée\n\n${nbParticipants} / ${nbPlaces} places occupées - ${tournament.name}`,
        },
      },
    ];
    await callWebhook(webhook, embeds);
  }
};

export const sendDiscordContact = async ({name, email, subject, message}: Contact) => {
  const webhook = env.discord.webhooks.contact;
  if (!webhook) {
    logger.warn('Discord webhook for contact is missing. It will skip discord messages for contacts.');
    logger.warn(`User ${name} (${email}) tried sending a message with subject ${subject} and the following content : ${message}. The message could not be sent to Discord.`);
    return;
  }
  const embeds = [
    {
      title: `Nouveau message de ${name} (${email})`,
      fields: [{name: 'Sujet', value: subject}, {name: 'Message', value: message}],
    }
  ]
  await callWebhook(webhook, embeds);
};
