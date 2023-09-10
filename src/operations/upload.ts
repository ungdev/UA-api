import axios from 'axios';
import env from '../utils/env';
import sharp from 'sharp';

// Operations for file upload
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const uploadFile = async (file: any, path: string, name: string) => {

  let compressedFile = file.buffer;

  // compress file before upload
  if(file.mimetype === 'image/jpeg')
    compressedFile = await sharp(file.buffer).jpeg({quality: 80}).toBuffer();
  else if(file.mimetype === 'image/png')
    compressedFile = await sharp(file.buffer).resize(800).png({quality: 100}).toBuffer();

  // create blob
  const fileBlob = new Blob([compressedFile], { type: file.mimetype });

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
