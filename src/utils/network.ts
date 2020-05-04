import { Request } from 'express';

export const getIp = (req: Request) =>
  req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;
