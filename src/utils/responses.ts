import { Response } from 'express';
import { Error } from '../types';

export const success = (response: Response, body: unknown): void => response.status(200).json(body).end();

export const created = (response: Response, body?: unknown): void => {
  if (body) {
    return response.status(201).json(body).end();
  }

  return response.status(201).end();
};

export const noContent = (response: Response): void => response.status(204).end();

export const badRequest = (response: Response, type: Error): void => response.status(400).json({ error: type }).end();

export const unauthenticated = (response: Response, type?: Error): void =>
  response
    .status(401)
    .json({ error: type || Error.Unauthenticated })
    .end();

export const unauthorized = (response: Response, type?: Error): void =>
  response
    .status(403)
    .json({ error: type || Error.Unauthorized })
    .end();

export const notFound = (response: Response, type: Error): void =>
  response
    .status(404)
    .json({ error: type || Error.NotFound })
    .end();

export const notAcceptable = (response: Response, type?: Error): void =>
  response
    .status(406)
    .json({ error: type || Error.NotAcceptable })
    .end();

export const internalServerError = (response: Response, type?: Error): void =>
  response
    .status(500)
    .json({ error: type || Error.Unknown })
    .end();
