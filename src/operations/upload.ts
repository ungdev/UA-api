import axios from 'axios';
import sharp from 'sharp';
import env from '../utils/env';

// Operations for file upload
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const uploadFile = async (file: any, path: string, name: string) => {
  let compressedFile = file.buffer;

  let fileBlob = new Blob([file.buffer], { type: file.mimetype });

  // convert png or jpeg to webp
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
    compressedFile = await sharp(compressedFile).webp({ quality: 75 }).toBuffer();
    fileBlob = new Blob([compressedFile], { type: 'image/webp' });
  }

  const formData = new FormData();
  // replace in filename .png or .jpeg to .webp
  formData.append('file', fileBlob, file.originalname.replace(/\.(png|jpeg)/, '.webp'));
  formData.append('path', path);
  formData.append('name', name);

  const result = await axios.post(
    `${env.front.website}/uploads/files/api?authorization=${env.upload.token}`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
        Accept: 'application/json',
      },
    },
  );

  return result.data;
};

export const deleteFile = async (path: string) => {
  const result = await axios.delete(
    `${env.front.website}/uploads/files/api?authorization=${env.upload.token}&path=${encodeURIComponent(path)}`,
    {
      headers: {
        Accept: 'application/json',
      },
    },
  );

  return result.data;
};
