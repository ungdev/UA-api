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
      const { name, path, file } = body as {
        name: string;
        path: string;
        file: File;
      };
      if (!name || !path || !file) return [200, { status: 1, message: 'Paramètres manquants' }];
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
