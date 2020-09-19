import { Response } from 'express';
import { Error as ErrorType } from '../types';
import log from './log';

const errorHandler = (response: Response, error: Error): void => {
  switch (error.name) {
    case 'TokenExpiredError':
      return response.status(401).json({ error: ErrorType.ExpiredToken }).end();

    case 'JsonWebTokenError':
      return response.status(401).json({ error: ErrorType.InvalidToken }).end();

    default:
      log.error(error);
      return response.status(500).json({ error: ErrorType.Unknown }).end();
  }
};

export default errorHandler;
