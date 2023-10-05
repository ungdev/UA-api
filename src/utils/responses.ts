import { Response } from 'express';
import { Error } from '../types';
import logger from './logger';

export const success = (response: Response, body: unknown): void => {
  response.status(200).json(body).end();
};

export const created = (response: Response, body?: unknown): void => {
  if (body) {
    response.status(201).json(body).end();
    return;
  }
  response.status(201).end();
};

export const noContent = (response: Response): void => {
  response.status(204).end();
};

const respondError = (response: Response, error: Error, code: number) => {
  const message = `[${code}] ${error}`;

  // We use logger.debug to not display the error in production as it will be used in dev and test
  logger.http(message);

  response.status(code).json({ error }).end();
};

export const badRequest = (response: Response, error: Error): void => respondError(response, error, 400);

export const unauthenticated = (response: Response, error?: Error): void =>
  respondError(response, error || Error.Unauthenticated, 401);

export const forbidden = (response: Response, error: Error): void => respondError(response, error, 403);

export const notFound = (response: Response, error: Error): void => respondError(response, error, 404);

export const methodNotSupported = (response: Response, error: Error): void => respondError(response, error, 405);

export const conflict = (response: Response, error: Error): void => respondError(response, error, 409);

export const gone = (response: Response, error: Error): void => respondError(response, error, 410);

export const unsupportedMediaType = (response: Response, error: Error): void => respondError(response, error, 415);

export const internalServerError = (response: Response, error?: Error): void =>
  respondError(response, error || Error.InternalServerError, 500);
