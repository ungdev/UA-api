import http from 'http';
import { Request } from 'express';

export const getIp = (req: Request | http.IncomingMessage): string =>
  (req.headers['x-forwarded-for'] as string) || req.connection.remoteAddress || req.socket.remoteAddress;
