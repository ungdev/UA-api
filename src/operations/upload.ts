import axios from 'axios';
import env from '../utils/env';

// Operations for file upload
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const uploadFile = async (file: any, path: string, name: string) => {
  const fileBlob = new Blob([file.buffer], { type: file.mimetype });

  const formData = new FormData();
  formData.append('file', fileBlob, file.originalname);
  formData.append('path', path);
  formData.append('name', name);

  const result = await axios.post(`${env.front.website}/uploads/files/api`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Accept: 'application/json',
      Authorization: `Bearer ${env.upload.token}`,
    },
  });

  return result.data;
};

export const deleteFile = async (path: string) => {
  const result = await axios.delete(`${env.front.website}/uploads/files/api?path=${path}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${env.upload.token}`,
    },
  });

  return result.data;
};
