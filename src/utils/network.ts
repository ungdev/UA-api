import http from 'http';
import { Request } from 'express';

export const getIp = (request: Request | http.IncomingMessage): string =>
  (request.headers['x-forwarded-for'] as string) || request.connection.remoteAddress || request.socket.remoteAddress;
