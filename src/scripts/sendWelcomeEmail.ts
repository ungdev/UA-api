import Sentry from '@sentry/node';
import PDFkit from 'pdfkit';
import { readFileSync, writeFileSync } from 'fs';
import { fetchTournaments } from '../operations/tournament';
import * as toornament from '../utils/toornament';
import logger from '../utils/log';
import { initSentryNode } from '../utils/sentry';
import { sendMail, sendWelcomeEmail } from '../utils/mail';
import { EmailAttachment, PlayerInformations } from '../types';

const backgrounds = {
  lol: `data:image/jpg;base64,${readFileSync(`assets/email/welcome/images/lol.jpg`, 'base64')}`,
  valorant: `data:image/jpg;base64,${readFileSync(`assets/email/welcome/images/valorant.jpg`, 'base64')}`,
  csgo: `data:image/jpg;base64,${readFileSync(`assets/email/welcome/images/csgo.jpg`, 'base64')}`,
  ssbu: `data:image/jpg;base64,${readFileSync(`assets/email/welcome/images/ssbu.jpg`, 'base64')}`,
  rl: `data:image/jpg;base64,${readFileSync(`assets/email/welcome/images/rl.jpg`, 'base64')}`,
  tft: `data:image/jpg;base64,${readFileSync(`assets/email/welcome/images/tft.jpg`, 'base64')}`,
};

// Generate the ticket to send in the attachements
const generateTicket = async (background: string, player: PlayerInformations): Promise<EmailAttachment> => {
  const chaine = `${player.firstname} ${player.lastname}`;
  const pdfBuffer = await new Promise((resolve) => {
    const document = new PDFkit({ size: [3508, 2480], margin: 0 });
    document.image(background, 0, 0);
    const fontSize = 140;
    const textWidth = document
      .font('assets/email/PreussischeVI9Ag2.ttf')
      .fill('white')
      .fontSize(fontSize)
      .widthOfString(chaine);
    document
      .font('assets/email/PreussischeVI9Ag2.ttf')
      .fill('white')
      .fontSize(fontSize)
      .text(chaine, document.page.width - textWidth - 100, 1665);
    document.end();
    // Finalize document and convert to buffer array
    const buffers: Uint8Array[] = [];
    document.on('data', buffers.push.bind(buffers));
    document.on('end', () => {
      const pdfData = new Uint8Array(Buffer.concat(buffers));
      resolve(pdfData);
    });
  });
  return {
    filename: 'Billet.pdf',
    content: Buffer.from(pdfBuffer),
  };
};

/**
 * fetch a code from a CSV file and remove it to assert it won't be sent twice
 * @param filename the name of the CSV file containing the reduction codes
 * @returns the first code of the file
 */
const fetchAndRemoveCode = (filename: string): string => {
  const filePath = `assets/email/welcome/reductionCodes/${filename}`;
  const codeList = readFileSync(filePath).toString();
  const commaIndex = codeList.search(',');

  // Get first code
  const code = codeList.slice(0, commaIndex);

  if (code === '') {
    throw new Error(`The file ${filename} is empty`);
  }

  // Remove first code
  const newCodeList = codeList.slice(commaIndex + 1);
  writeFileSync(filePath, newCodeList);
  return code;
};

(async () => {
  initSentryNode();
  await toornament.init();

  let tournaments = await fetchTournaments();

  // If no argument is provided
  if (!process.argv[2]) {
    logger.error(
      'Please provide an argument for filtering tournaments ("*" for all tournaments or a specific tournament id)',
    );
    process.exit(1);
  } else if (process.argv[2] !== '*') {
    // Filter tournaments for this tournament only
    tournaments = tournaments.filter((tournament) => tournament.id === process.argv[2]);
  }

  // Check if the toornament has a toornamentid and a discordCategory (therefore its a team tournament)
  await Promise.all(
    tournaments
      .filter((tournament) => tournament.toornamentId)
      .map(async (tournament) => {
        const isSoloTournament = tournament.playersPerTeam === 1;
        let tournamentParticipants;

        // Prepare the background to not load it for each player
        // @ts-ignore
        const background = backgrounds[tournament.id];

        if (isSoloTournament) {
          tournamentParticipants = await toornament.fetchPlayerInfosForTickets(tournament.toornamentId, tournament.id);
          await Promise.all(
            // Generates ticket and send it to each player of the tournament
            tournamentParticipants.map(async (player, index, tab, max = tab.length - 1) => {
              const ticket = await generateTicket(background, player);
              await sendMail(
                sendWelcomeEmail,
                player.email,
                {
                  username: player.username,
                  gunnarCode: fetchAndRemoveCode('gunnarCodes.csv'),
                  compumsaCode: fetchAndRemoveCode('compumsaCodes.csv'),
                },
                [ticket],
              );

              logger.debug(`↳ Joueur ${index}/${max} du tournoi ${tournament.name}`);
              // Index goes from 0/35 to 35/35 and NOT from 1/36 to 5/36 by exemple
            }),
          );
        } else {
          // TeamTournament
          tournamentParticipants = await toornament.fetchTeamsInfosForTickets(tournament.toornamentId, tournament.id);

          await Promise.all(
            tournamentParticipants.map(async (team, index, tournamentParticipants) => {
              await Promise.all(
                team.map(
                  async (
                    player,
                    playerIndex,
                    team,
                    playerMax = team.length - 1,
                    teamIndex = index,
                    teamMax = tournamentParticipants.length - 1,
                  ) => {
                    const ticket = await generateTicket(background, player);
                    await sendMail(
                      sendWelcomeEmail,
                      player.email,
                      {
                        username: player.username,
                        gunnarCode: fetchAndRemoveCode('gunnarCodes.csv'),
                        compumsaCode: fetchAndRemoveCode('compumsaCodes.csv'),
                      },
                      [ticket],
                    );
                    logger.debug(
                      `↳ Joueur ${playerIndex}/${playerMax} de l'équipe ${teamIndex}/${teamMax} du tournoi ${
                        tournament.name.split(' ')[0]
                      } >>> ${player.username}`,
                      // Indexes go from 0/4 to 4/4 and NOT from 1/5 to 5/5 by exemple
                    );
                    return 0;
                  },
                ),
              );
              return 0;
            }),
          );
        }
      }),
  );
  process.exit(0);
})().catch((error) => {
  logger.error(error);
  Sentry.captureException(error);
  process.exit(1);
});
