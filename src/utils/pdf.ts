import { readFileSync } from 'fs';
import QRCode from 'qrcode';
import PDFkit from 'pdfkit';
import { encrypt } from './helpers';
import { fetchTeam } from '../operations/team';
import { DetailedCartItem, EmailAttachement, TournamentId } from '../types';
import { Team } from '.prisma/client';

const loadImage = (tournamentId: string) =>
  `data:image/jpg;base64,${readFileSync(`assets/email/backgrounds/${tournamentId}.jpg`, 'base64')}`;

// Foreach tournament, load the image in the RAM
const tournamentBackgrounds = Object.keys(TournamentId).map((tournamentId) => ({
  // we need to cast as it is reconized as a string
  name: tournamentId as TournamentId,
  background: loadImage(tournamentId),
}));

const notInTeamBackground = loadImage('nonteam');

export const generateTicket = async (cartItem: DetailedCartItem): Promise<EmailAttachement> => {
  // Define the parameters for the function
  const fontFamily = 'assets/email/font.ttf';
  const fontSize = 140;
  const qrCodeSize = 600;
  const bottomLine = 1550;

  const user = cartItem.forUser;
  const fullName = `${user.firstname} ${user.lastname}`;

  let background: string;

  // If the user is in a team, use an appropriate background
  let team: Team;
  if (user.teamId) {
    team = await fetchTeam(user.teamId);
    background = tournamentBackgrounds.find((tournament) => tournament.name === team.tournamentId).background;
  }
  // Otherwise, use thenot in team background
  else {
    background = notInTeamBackground;
  }

  const encryptedUserId = encrypt(user.id);

  const qrcode = await QRCode.toDataURL([{ data: encryptedUserId, mode: 'byte' }], {
    width: qrCodeSize,
    margin: 1,
    color: { dark: '#212121ff', light: '#ffffffff' },
    errorCorrectionLevel: 'low',
  });

  const pdf = await new Promise<Buffer>((resolve, reject) => {
    // Create the document and the background
    const document = new PDFkit({ size: [3508, 2480], margin: 0 });
    document.image(background, 0, 0);

    // Define a text format
    const textFormat = document.font(fontFamily).fill('white').fontSize(fontSize);
    const textHeight = textFormat.heightOfString(user.username);

    // Place the name to the right
    let textWidth = textFormat.widthOfString(fullName);
    textFormat.text(fullName, document.page.width - textWidth - 100, bottomLine);

    // Place the username to the right
    textWidth = textFormat.widthOfString(user.username);
    textFormat.text(user.username, document.page.width - textWidth - 100, bottomLine - textHeight);

    // Place the teamName to the right if not solo-tournament
    if (team && team.name.search(/-solo-team$/) === -1) {
      textWidth = textFormat.widthOfString(team.name);
      textFormat.text(team.name, document.page.width - textWidth - 100, bottomLine - 2 * textHeight);
    }

    // Place the place if necessary
    let qrCodeY;
    if (user.place) {
      textFormat.text(user.place, 100, bottomLine);
      qrCodeY = bottomLine - qrCodeSize - 40;
    } else {
      qrCodeY = bottomLine - qrCodeSize + 150;
    }

    // Place the QR Code
    document.image(qrcode, 100, qrCodeY, { width: qrCodeSize });

    // Stop the document stream
    document.end();

    // Converts the document (readable stream) to a buffer by collecting all chunk of data and concating it at the end
    const buffers: Buffer[] = [];

    // Add the chunk to all the buffers
    document.on('data', (buffer) => buffers.push(buffer));

    // Concat all chunks in one buffer
    document.on('end', () => {
      const assembledPdf = Buffer.concat(buffers);
      resolve(assembledPdf);
    });

    document.on('error', reject);
  });

  return {
    filename: `UA_${user.id}.pdf`,
    content: pdf,
  };
};
