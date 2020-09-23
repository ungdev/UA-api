import { NextFunction, Request, Response } from 'express';
import runToornacord from '../../utils/toornacord';
import { noContent } from '../../utils/responses';

export default [
  // Middlewares
  (request: Request, response: Response, next: NextFunction) => {
    let data = '';
    request.on('data', (chunk) => {
      data += chunk;
    });
    request.on('end', () => {
      request.body = JSON.parse(data);
      next();
    });
  },
  // Controller
  (request: Request, response: Response) => {
    noContent(response);
    runToornacord(request);
  },
];
