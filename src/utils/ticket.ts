import { readFileSync } from 'fs';
import QRCode from 'qrcode';
import PDFkit from 'pdfkit';
import { encrypt } from './helpers';
import { fetchTeamWithTournament } from '../operations/team';
import { DetailedCartItem, EmailAttachement, UserType } from '../types';

const loadImage = () => `data:image/png;base64,${readFileSync(`assets/email/backgrounds/ticket.png`, 'base64')}`;

export const generateTicket = async (cartItem: DetailedCartItem): Promise<EmailAttachement> => {
  // Define the parameters for the function
  const fontFamily = 'assets/email/font.ttf';
  const fontSize = 75;
  const qrCodeSize = 751;
  const qrCodeX = 100;
  const qrCodeY = 197;
  const width = 3949;
  const height = 1604;
  const textX = qrCodeX + qrCodeSize / 2;
  const lineSpaceCorrection = 22;

  const user = cartItem.forUser;

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
    const document = new PDFkit({ size: [width, height], margin: 0, layout: 'portrait' });
    document.rect(0, 0, width, height).fillColor('#17124A').fill();

    document.image(background, 0, 0, { width, height });

    // Define a text format
    const textFormat = document.font(fontFamily).fill([0, 0, 0]).fontSize(fontSize);

    // Place the tournament name under the qrCode with the same margin as the qrcode
    const tournamentNameWidth = document.widthOfString(tournoiText);
    textFormat.text(tournoiText, textX - tournamentNameWidth / 2, qrCodeY + qrCodeSize + lineSpaceCorrection);

    // Place the first name of the user
    const firstName = user.firstname;
    const firstNameWidth = document.widthOfString(firstName);
    textFormat.text(firstName, textX - firstNameWidth / 2, 0);

    // Place the last name of the user
    const lastName = user.lastname;
    const lastNameWidth = document.widthOfString(lastName);
    textFormat.text(lastName, textX - lastNameWidth / 2, fontSize + lineSpaceCorrection - 10);

    // Place the text containing the seat
    if (user.place) {
      const place = `Place ${user.place}`;
      const placeWidth = document.widthOfString(place);
      textFormat.text(place, textX - placeWidth / 2, height - fontSize - lineSpaceCorrection * 4);
    }
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
