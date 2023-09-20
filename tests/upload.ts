import axios from 'axios';
import nock from 'nock';
import env from '../src/utils/env';

/**
 * The so-called "fake debug upload server" is a local representation of the upload server
 * using http interceptors to handle api requests. In order to add more features (ie. more
 * routes of the upload api, check the {@link listen} function below)
 */

const existingFiles = [
    'tournaments/lol-logo.png',
    'tournaments/lol-background.jpg',
]

const allowed_paths = ['tournaments', 'partners'];
const allowed_file_types = ['image/png', 'image/jpeg', 'application/pdf'];
const allowed_extensions = ['png', 'jpg', 'pdf'];

const max_file_size = 5000000;


/**
 * Adds interceptors to the axios adapter. This function is called by {@link enableFakeDiscordApi}
 * and enables/handles http requests to the 'fake discord api'.
 */
const listen = () => {
  axios.defaults.adapter = 'http';
  nock(`${env.front.website}/uploads/files/api`)
    .persist()

    // Upload file
    .post('/')
    .reply((_, body) => {
        const bearer = (this! as nock.ReplyFnContext).req.headers.authorization;
        if(bearer !== env.upload.token) return [200, { status: 1, message: 'Authentification échouée' }];

        const { name, path, file } = body as {
            name: string;
            path: string;
            file: File;
        };
        if(!name || !path || !file) return [200, { status: 1, message: 'Paramètres manquants' }];
        if(file.size > max_file_size) return [200, { status: 1, message: 'La taille maximale d\'un fichier est de 5MB' }];
        if(!allowed_file_types.includes(file.type)) return [200, { status: 1, message: 'Type de fichier non autorisé' }];
        const extension = file.name.split('.').pop();
        if(!allowed_extensions.includes(extension!)) return [200, { status: 1, message: 'Extension de fichier non autorisée' }];
        if(!allowed_paths.includes(path)) return [200, { status: 1, message: 'Le chemin n\'est pas autorisé' }];
        const index = existingFiles.indexOf(`${path}/${name}.${extension}`);
        existingFiles.push(`${path}/${name}.${extension}`);
        return [200, { status: 0, message: 'Fichier téléversé avec succès' }];
    })

    // Delete file
    .delete('/')
    .reply((uri) => {
        const bearer = (this! as nock.ReplyFnContext).req.headers.authorization;
        if(bearer !== env.upload.token) return [200, { status: 1, message: 'Authentification échouée' }];

        const path = uri.split('?')[1].split('=')[1];
        if(!path) return [200, { status: 1, message: 'Paramètres manquants' }];
        const index = existingFiles.indexOf(path);
        if (index > -1) {
            existingFiles.splice(index, 1);
            return [200, { status: 0, message: 'Fichier supprimé avec succès' }];
        }
        return [200, { status: 1, message: 'Le fichier n\'existe pas' }];
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
