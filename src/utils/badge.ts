import { readFileSync } from 'fs';
import PDFkit from 'pdfkit';
import { User } from '../types';

const loadImageBadge = () => `data:image/png;base64,${readFileSync(`assets/badges/background.png`, 'base64')}`;

const badgeBackground = loadImageBadge();

// Generate a pdf used as a badge for the user that is meant to be printed
export const generateBadge = async (user: User) => {
  // Define the parameters for the function
  const fontFamily = 'assets/email/font.ttf';
  const fontSize = 16;
  const pictureSize = 170;
  const pictureX = 50;
  const pictureY = 20;
  const textX = 135;
  const textY = 505;

  const background = badgeBackground;

  const pdf = await new Promise<Buffer>(async (resolve, reject) => {
    // Create the document and the background
    const document = new PDFkit({ size: 'A4', margin: 0, layout: 'landscape' });
    const fetchImage = async (source: string) => {
      const response = await fetch(source);
      const image = await response.arrayBuffer();
      return image;
    };

    // For loop to do multiple pages
    // Page with 'RECTO' on it
    for (let col = 0; col < 2; col++) {
      // Constants for the columns and rows
      const columnsImage = 4;
      const rowsImage = 2;
      const columnOffsetImage = 190;
      const rowOffsetImage = 280;

      // 'for' because I dont like to repeat but I like chocolate and céréales après le lait
      for (let col = 0; col < columnsImage; col++) {
        for (let row = 0; row < rowsImage; row++) {
          // Informations about badge
          const image = await fetchImage(`https://picsum.photos/${pictureSize}`);
          // Coordonates
          const x = pictureX + col * columnOffsetImage;
          const y = pictureY + row * rowOffsetImage;
          // Image
          document.image(image, x, y, { width: pictureSize }); // Before the background so it's behind
          // Background
          document.image(background, x, y, { width: pictureSize }); // After the image because of... 42
        }
      }

      // Place the text containing the name is the bottom middle in bold and in uppercase
      // Define a text format
      const textFormat = document.font(fontFamily).fill([239, 220, 235]).fontSize(fontSize);

      // Constantes pour les colonnes et lignes
      const columnsText = 4;
      const rowsText = 2;
      const columnOffsetText = 190;
      const rowOffsetText = 280;

      // 'for' because I dont like to repeat but I like potatoes and pain au chocolat
      for (let col = 0; col < columnsText; col++) {
        for (let row = 0; row < rowsText; row++) {
          // Informations about badge
          const lastName = `${user.firstname}`;
          const firstName = `${user.firstname}`;
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
          const commission = 'Commission';
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

      // Page with 'VERSO' on it
      for (let row = 0; row < 1; row++) {
        // Constants for the columns and rows
        const columnsSecondImage = 4;
        const rowsSecondImage = 2;
        const columnOffsetSecondImage = 190;
        const rowOffsetSecondImage = 280;

        // 'for' because I dont like to repeat but I like chocolate and céréales après le lait
        for (let col = 0; col < columnsSecondImage; col++) {
          for (let row = 0; row < rowsSecondImage; row++) {
            // Coordonates
            const x = pictureX + col * columnOffsetSecondImage;
            const y = pictureY + row * rowOffsetSecondImage;
            // Background
            document.image(background, x, y, { width: pictureSize }); // After the image because of... 42
          }
        }

        // Add a new page
        document.addPage();
      }
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
    filename: `UA_${user.username}.pdf`,
    content: pdf,
  };
};
