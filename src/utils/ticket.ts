import { readFileSync } from 'fs';
import QRCode from 'qrcode';
import PDFkit from 'pdfkit';
import { encrypt } from './helpers';
import { fetchTeamWithTournament } from '../operations/team';
import { DetailedCartItem, EmailAttachement, UserType } from '../types';
import logger from './logger';

const ticketsDesignAmount = 3;

const loadImage = () => {
  const random = Math.floor(Math.random() * ticketsDesignAmount) + 1;
  return `data:image/jpg;base64,${readFileSync(`assets/email/backgrounds/ticket_${random}.jpg`, 'base64')}`;
};

export const generateTicket = async (cartItem: DetailedCartItem): Promise<EmailAttachement> => {
  // Define the parameters for the function
  const fontFamily = 'assets/email/font.ttf';
  const fontSize = 24;
  const qrCodeSize = 182;
  const qrCodeX = 35;
  const qrCodeY = 567;
  const bottomLine = 842 - 150; // sponsors height substracted to ticket height
  const lineSpaceCorrection = 22;

  const user = cartItem.forUser;
  const fullName = `${user.firstname} ${user.lastname}`;

  const background = loadImage();

  // If the user is in a team, use an appropriate background
  let tournoiText: string;
  if (user.teamId) {
    const team = await fetchTeamWithTournament(user.teamId);
    tournoiText = `${
      team.tournament.name.length > 20
        ? team.tournament.name
            .split(/[ -]/)
            .map((word) => word[0])
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
    const document = new PDFkit({ size: 'A4', margin: 0, layout: 'portrait' });
    document.image(background, 0, 0, { width: 595, height: 842 });

    // Define a text format
    const textFormat = document.font(fontFamily).fill([255, 255, 255]).fontSize(fontSize);

    // Place the tournament name under the qrCode with the same margin as the qrcode
    textFormat.text(tournoiText, qrCodeX + qrCodeSize + lineSpaceCorrection, bottomLine);

    // Place the full name of the user
    textFormat.text(fullName, qrCodeX + qrCodeSize + lineSpaceCorrection, bottomLine - lineSpaceCorrection * 4 - 15);

    // Place the text containing the seat
    if (user.place)
      textFormat.text(
        `Place ${user.place}`,
        qrCodeX + qrCodeSize + lineSpaceCorrection,
        bottomLine - lineSpaceCorrection * 2 - 7,
      );

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
    filename: `UA_${user.username}.pdf`,
    content: pdf,
  };
};
