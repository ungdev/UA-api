import axios from 'axios';
import nock from 'nock';
import env from '../src/utils/env';

/**
 * The so-called "fake debug upload server" is a local representation of the upload server
 * using http interceptors to handle api requests. In order to add more features (ie. more
 * routes of the upload api, check the {@link listen} function below)
 */

const existingFiles = ['tournaments/lol-logo.png', 'tournaments/lol-background.jpg'];

const allowedPaths = ['tournaments', 'partners'];
const allowedFileTypes = ['image/png', 'image/jpeg', 'application/pdf'];
const allowedExtensions = ['png', 'jpg', 'pdf'];

const maxFileSize = 5000000;

/**
 * Adds interceptors to the axios adapter. This function is called by {@link enableFakeDiscordApi}
 * and enables/handles http requests to the 'fake discord api'.
 */
const listen = () => {
  axios.defaults.adapter = 'http';
  nock(`${env.front.website}/uploads/files`, { encodedQueryParams: true })
    .persist()

    // Upload file
    .post('/api')
    .reply((_, body) => {
      const encodedHexData = body;

      // Remove any whitespace or newline characters from the encoded data
      const sanitizedHexData = encodedHexData.replace(/\s/g, '');

      // Convert the sanitized hexadecimal string to a Buffer
      const binaryBuffer = Buffer.from(sanitizedHexData, 'hex');

      // Convert the binary Buffer to a string
      const formDataString = binaryBuffer.toString('utf-8');

      // Split the formData by the boundary
      
      // Split the formData by the boundary
        const boundary = '--axios-1.4.0-boundary-6CDbQBbdmiVQbGP_Uo86cJAnB';
        const parts = formDataString.split(boundary);

        // Initialize variables to store form fields and file data
        let fileBuffer;
        let path;
        let name;

        // Iterate through parts
        for (const part of parts) {
          if (part.includes('name="file"')) {
            // This part contains file data
            fileBuffer = part.split('\r\n\r\n')[1]; // Extract content after headers
          } else if (part.includes('name="path"')) {
            // This part contains the "path" field
            path = part.split('\r\n\r\n')[1].trim();
          } else if (part.includes('name="name"')) {
            // This part contains the "name" field
            name = part.split('\r\n\r\n')[1].trim();
          }
        }


      if (!name || !path || !fileBuffer) return [200, { status: 1, message: 'Paramètres manquants' }];
      if (file.size > maxFileSize) return [200, { status: 1, message: "La taille maximale d'un fichier est de 5MB" }];
      if (!allowedFileTypes.includes(file.type)) return [200, { status: 1, message: 'Type de fichier non autorisé' }];
      const extension = file.name.split('.').pop();
      if (!allowedExtensions.includes(extension!))
        return [200, { status: 1, message: 'Extension de fichier non autorisée' }];
      if (!allowedPaths.includes(path)) return [200, { status: 1, message: "Le chemin n'est pas autorisé" }];
      existingFiles.push(`${path}/${name}.${extension}`);
      return [200, { status: 0, message: 'Fichier téléversé avec succès' }];
    })

    // Delete file
    .delete('/api')
    .query({
      path: /.*/,
    })
    .reply((uri) => {
      const path = uri.split('?')[1].split('=')[1];
      if (!path) return [200, { status: 1, message: 'Paramètres manquants' }];

      const index = existingFiles.indexOf(decodeURIComponent(path));

      if (index > -1) {
        existingFiles.splice(index, 1);
        return [200, { status: 0, message: 'Fichier supprimé avec succès' }];
      }
      return [200, { status: 1, message: "Le fichier n'existe pas" }];
    });
};

/**
 * Starts the 'fake upload api'.
 */
export const enableFakeUploadApi = () => {
  listen();
};

/**
 * Stops the 'fake upload api'. Removes all interceptors.
 */
export const disableFakeUploadApi = () => {
  nock.cleanAll();
};
