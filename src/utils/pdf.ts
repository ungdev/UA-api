import { readFileSync } from 'fs';
import QRCode from 'qrcode';
import PDFkit from 'pdfkit';
import { encrypt } from './helpers';
import { fetchTeamWithTournament } from '../operations/team';
import { DetailedCartItem, EmailAttachement, Team, UserType } from '../types';

const loadImage = () => `data:image/jpg;base64,${readFileSync(`assets/email/backgrounds/ticket.jpg`, 'base64')}`;

const tournamentBackground = loadImage();

export const generateTicket = async (cartItem: DetailedCartItem): Promise<EmailAttachement> => {
  // Define the parameters for the function
  const fontFamily = 'assets/email/font.ttf';
  const fontSize = 50;
  const qrCodeSize = 390;
  const qrCodeX = 265;
  const qrCodeY = 30;
  const bottomLine = 800 - 220; // sponsors height substracted to ticket height

  const user = cartItem.forUser;
  const fullName = `${user.firstname} ${user.lastname}`;

  const background = tournamentBackground;

  // If the user is in a team, use an appropriate background
  let tournoiText: string;
  if (user.teamId) {
    const team = await fetchTeamWithTournament(user.teamId);
    tournoiText = `Tournoi ${
      team.tournament.name.length > 20
        ? team.tournament.name
            .split(/[ -]/)
            .map((str) => str[0])
            .join('')
        : team.tournament.name
    }`;
  } else if (user.type === UserType.spectator) {
    tournoiText = 'Spectateur';
  } else {
    tournoiText = ' ';
  }

  const encryptedUserId = encrypt(user.id);

  const qrcode = await QRCode.toDataURL([{ data: encryptedUserId, mode: 'byte' }], {
    width: qrCodeSize,
    margin: 1,
    color: { dark: '#000', light: '#fff' },
    errorCorrectionLevel: 'low',
  });

  const pdf = await new Promise<Buffer>((resolve, reject) => {
    // Create the document and the background
    const document = new PDFkit({ size: [2560, 800], margin: 0 });
    document.image(background, 0, 0);

    // Define a text format
    const textFormat = document.font(fontFamily).fill([239, 220, 235]).fontSize(fontSize);

    // Place the tournament name under the qrCode with the same margin as the qrcode
    const textHeight = textFormat.heightOfString(tournoiText);
    textFormat.text(tournoiText, qrCodeY, bottomLine);

    // Place the full name of the user
    const nameHeight = textFormat.heightOfString(fullName);
    textFormat.text(fullName, qrCodeY, bottomLine - textHeight - nameHeight);

    // Place the text containing the seat
    if (user.place) textFormat.text(`Place ${user.place}`, qrCodeY, bottomLine - textHeight);

    // Place the QR Code
    document.image(qrcode, qrCodeX, qrCodeY, { width: qrCodeSize });

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
