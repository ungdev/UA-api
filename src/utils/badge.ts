import axios, { AxiosResponse } from 'axios';
import { readFileSync } from 'fs';
import PDFkit from 'pdfkit';
import sharp from 'sharp';
import { Badge } from '../types';

const getImage = (filename: string) => {
  try {
    return `data:image/png;base64,${readFileSync(`assets/badges/${filename}`, 'base64')}`;
  } catch {
    return `data:image/png;base64,${readFileSync(`assets/defaultbadge/blank.png`, 'base64')}`;
  }
};

const loadImageBadgeRestricted = () => getImage('badge-restricted.png');
const loadImageBadgeOrgaPrice = () => getImage('badge-orgaprice.png');
const loadImageBadgeFullAccess = () => getImage('badge-fullaccess.png');
const loadImageBadgeInvite = () => getImage('badge-invite.png');

const loadBackRestricted = () => getImage('back-restricted.png');
const loadBackOrgaPrice = () => getImage('back-orgaprice.png');
const loadBackFullAccess = () => getImage('back-fullaccess.png');
const loadBackInvite = () => getImage('back-invite.png');

type BadgePermission = 'restricted' | 'orgaprice' | 'fullaccess' | 'invite';

const getBack = (permission: BadgePermission): string => {
  switch (permission) {
    case 'restricted': {
      return loadBackRestricted();
    }

    case 'orgaprice': {
      return loadBackOrgaPrice();
    }

    case 'fullaccess': {
      return loadBackFullAccess();
    }

    case 'invite': {
      return loadBackInvite();
    }

    default: {
      return loadBackRestricted();
    }
  }
};

const getBadge = (permission: BadgePermission): string => {
  switch (permission) {
    case 'restricted': {
      return loadImageBadgeRestricted();
    }

    case 'orgaprice': {
      return loadImageBadgeOrgaPrice();
    }

    case 'fullaccess': {
      return loadImageBadgeFullAccess();
    }

    case 'invite': {
      return loadImageBadgeInvite();
    }

    default: {
      return loadImageBadgeRestricted();
    }
  }
};

// Generate a pdf used as a badge for the user that is meant to be printed
export const generateBadge = async (badges: Badge[]) => {
  // Define the parameters for the function
  const fontFamily = 'assets/email/font.ttf';
  const fontSize = 16;
  const pictureSize = 170;
  const pictureX = 50;
  const pictureY = 20;
  const textX = 135;
  const textY = 505;

  const pdf = await new Promise<Buffer>(async (resolve, reject) => {
    // Create the document and the background
    const document = new PDFkit({ size: 'A4', margin: 0, layout: 'landscape' });
    const fetchImage = async (source: string): Promise<ArrayBuffer> => {
      // If the source is empty, return a new image 300x300 in a solid color
      if (source === '')
        return sharp({
          create: {
            width: 300,
            height: 300,
            channels: 4,
            background: { r: 0, g: 45, b: 64, alpha: 1 },
          },
        })
          .png()
          .toBuffer();

      const response = await axios({
        method: 'GET',
        url: source,
        responseType: 'arraybuffer',
      }).catch(() => false);

      return response ? (response as AxiosResponse).data : fetchImage('');
    };

    // Constants for the columns and rows
    const columns = 4;
    const rows = 2;
    const columnOffset = 190;
    const rowOffset = 280;

    const pictureX2 = 841.89 - pictureX;

    // For loop to do multiple pages
    // Page with 'RECTO' on it
    for (let page = 0; page < Math.ceil(badges.length / (columns * rows)); page++) {
      // 'for' because I dont like to repeat but I like chocolate and céréales après le lait
      for (let col = 0; col < columns; col++) {
        for (let row = 0; row < rows; row++) {
          const index = page * columns * rows + col * rows + row;

          if (index >= badges.length) break;

          // Informations about badge
          const image = await fetchImage(badges[index].image);
          // Coordonates
          const x = pictureX + col * columnOffset;
          const y = pictureY + row * rowOffset;

          // if image is webp convert it to png using sharp
          if (badges[index].image.includes('.webp')) {
            const convertedImage = await sharp(image).toFormat('png').toBuffer();
            document.image(convertedImage, x + 45, y + 30, { width: pictureSize - 90 }); // Before the background so it's behind
          } else {
            document.image(image, x + 45, y + 30, { width: pictureSize - 90 }); // Before the background so it's behind
          }

          // Background
          document.image(await getBadge(badges[index].type), x, y, { width: pictureSize }); // After the image because of... 42
        }
      }

      // 'for' because I dont like to repeat but I like potatoes and pain au chocolat
      for (let col = 0; col < columns; col++) {
        for (let row = 0; row < rows; row++) {
          const index = page * columns * rows + col * rows + row;

          if (index >= badges.length) break;

          // Place the text containing the name is the bottom middle in bold and in uppercase
          // Define a text format
          const color: PDFKit.Mixins.ColorValue = badges[index].type === 'fullaccess' ? [239, 220, 235] : [23, 18, 74];

          const textFormat = document.font(fontFamily).fill(color).fontSize(fontSize);

          // Informations about badge
          const lastName = `${badges[index].lastName || ' '}`;
          const firstName = `${badges[index].firstName || ' '}`;
          // Offsets
          const offsetX = textX + col * columnOffset;
          const offsetY = textY + row * rowOffset;
          // Lastname
          const lastNameHeight = textFormat.heightOfString(lastName);
          textFormat.text(
            lastName.toUpperCase(),
            offsetX - textFormat.widthOfString(lastName.toUpperCase()) / 2,
            offsetY - 282 - lastNameHeight / 2,
          );
          // Firstname
          const firstNameHeight = textFormat.heightOfString(firstName);
          textFormat.text(
            firstName.toUpperCase(),
            offsetX - textFormat.widthOfString(firstName.toUpperCase()) / 2,
            offsetY - 273 - lastNameHeight - firstNameHeight / 2,
          );
          // Commission
          const commission = `${badges[index].commissionName.toUpperCase()}`;
          textFormat.text(
            commission,
            offsetX - textFormat.widthOfString(commission) / 2,
            offsetY - 280 - lastNameHeight - firstNameHeight - firstNameHeight / 2,
          );
        }
      }

      // Add a new page
      document.addPage();

      // 'for' because I dont like to repeat but I like chocolate and céréales après le lait
      for (let col = 0; col < columns; col++) {
        for (let row = 0; row < rows; row++) {
          const index = page * columns * rows + col * rows + row;

          if (index >= badges.length) break;

          // Coordonates
          const x = pictureX2 - pictureSize - col * columnOffset;
          const y = pictureY + row * rowOffset;

          // Background
          document.image(await getBack(badges[index].type), x, y, { width: pictureSize }); // After the image because of... 42
        }
      }

      // Add a new page if there is more badges
      if (page * columns * rows + columns * rows < badges.length) document.addPage();
    }

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

  // Download generated PDF
  return {
    filename: `UA_badges.pdf`,
    content: pdf,
  };
};
