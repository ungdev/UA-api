import axios from 'axios';
import { readFileSync } from 'fs';
import PDFkit from 'pdfkit';
import sharp from 'sharp';
import { Badge } from '../types';

const loadImageBadgeRestricted = () =>
  `data:image/png;base64,${readFileSync(`assets/badges/badge-restricted.png`, 'base64')}`;
const loadImageBadgeOrgaPrice = () =>
  `data:image/png;base64,${readFileSync(`assets/badges/badge-orgaprice.png`, 'base64')}`;
const loadImageBadgeFullAccess = () =>
  `data:image/png;base64,${readFileSync(`assets/badges/badge-fullaccess.png`, 'base64')}`;

const loadBackRestricted = () => `data:image/png;base64,${readFileSync(`assets/badges/back-restricted.png`, 'base64')}`;
const loadBackOrgaPrice = () => `data:image/png;base64,${readFileSync(`assets/badges/back-orgaprice.png`, 'base64')}`;
const loadBackFullAccess = () => `data:image/png;base64,${readFileSync(`assets/badges/back-fullaccess.png`, 'base64')}`;

type BadgePermission = 'restricted' | 'orgaprice' | 'fullaccess';

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
    const fetchImage = async (source: string) => {
      const response = await axios({
        method: 'GET',
        url: source,
        responseType: 'arraybuffer',
      });
      return response.data;
    };

    // Constants for the columns and rows
    const columns = 4;
    const rows = 2;

    // For loop to do multiple pages
    // Page with 'RECTO' on it
    for (let page = 0; page < Math.ceil(badges.length / (columns * rows)); page++) {
      // Constants for the images
      const columnOffsetImage = 190;
      const rowOffsetImage = 280;

      // 'for' because I dont like to repeat but I like chocolate and céréales après le lait
      for (let col = 0; col < columns; col++) {
        for (let row = 0; row < rows; row++) {
          const index = page * columns * rows + col * rows + row;

          if (index >= badges.length) break;

          // Informations about badge
          const image = await fetchImage(badges[index].image);
          // Coordonates
          const x = pictureX + col * columnOffsetImage;
          const y = pictureY + row * rowOffsetImage;

          // if image is webp convert it to png using sharp
          if (badges[index].image.includes('.webp')) {
            const convertedImage = await sharp(image).toFormat('png').toBuffer();
            document.image(convertedImage, x + 45, y + 30, { width: pictureSize - 90 }); // Before the background so it's behind
          } else {
            document.image(image, x + 45, y + 30, { width: pictureSize - 90 }); // Before the background so it's behind
          }

          // Background
          document.image(getBadge(badges[index].type), x, y, { width: pictureSize }); // After the image because of... 42
        }
      }

      // Place the text containing the name is the bottom middle in bold and in uppercase
      // Define a text format
      const textFormat = document.font(fontFamily).fill([239, 220, 235]).fontSize(fontSize);

      // Constants for the columns and rows
      const columnOffsetText = 190;
      const rowOffsetText = 280;

      // 'for' because I dont like to repeat but I like potatoes and pain au chocolat
      for (let col = 0; col < columns; col++) {
        for (let row = 0; row < rows; row++) {
          const index = page * columns * rows + col * rows + row;

          if (index >= badges.length) break;

          // Informations about badge
          const lastName = `${badges[index].lastName}`;
          const firstName = `${badges[index].firstName}`;
          // Offsets
          const offsetX = textX + col * columnOffsetText;
          const offsetY = textY + row * rowOffsetText;
          // Lastname
          const lastNameHeight = textFormat.heightOfString(lastName);
          textFormat.text(
            lastName.toUpperCase(),
            offsetX - textFormat.widthOfString(lastName.toUpperCase()) / 2,
            offsetY - 260 - lastNameHeight / 2,
          );
          // Firstname
          const firstNameHeight = textFormat.heightOfString(firstName);
          textFormat.text(
            firstName.toUpperCase(),
            offsetX - textFormat.widthOfString(firstName.toUpperCase()) / 2,
            offsetY - 255 - lastNameHeight - firstNameHeight / 2,
          );
          // Commission
          const commission = `${badges[index].commissionName}`;
          const commissionHeight = textFormat.heightOfString(commission);
          textFormat.text(
            commission,
            offsetX - textFormat.widthOfString(commission) / 2,
            offsetY - 275 - lastNameHeight - firstNameHeight - commissionHeight / 2,
          );
        }
      }

      // Add a new page
      document.addPage();

      const columnOffsetSecondImage = 190;
      const rowOffsetSecondImage = 280;

      // 'for' because I dont like to repeat but I like chocolate and céréales après le lait
      for (let col = 0; col < columns; col++) {
        for (let row = 0; row < rows; row++) {
          const index = page * columns * rows + col * rows + row;

          if (index >= badges.length) break;

          // Coordonates
          const x = pictureX + col * columnOffsetSecondImage;
          const y = pictureY + row * rowOffsetSecondImage;

          // Background
          document.image(getBack(badges[index].type), x, y, { width: pictureSize }); // After the image because of... 42
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
