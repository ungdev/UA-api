import { Response } from 'express';
import { Error } from '../types';

export const success = (res: Response, body: unknown): void => res.status(200).json(body).end();

export const created = (res: Response, body?: unknown): void => {
  if (body) {
    return res.status(201).json(body).end();
  }

  return res.status(201).end();
};

export const noContent = (res: Response): void => res.status(204).end();

export const badRequest = (res: Response, type?: Error): void =>
  res
    .status(400)
    .json({ error: type || Error.BadRequest })
    .end();

export const unauthenticated = (res: Response, type?: Error): void =>
  res
    .status(401)
    .json({ error: type || Error.Unauthenticated })
    .end();

export const unauthorized = (res: Response, type?: Error): void =>
  res
    .status(403)
    .json({ error: type || Error.Unauthorized })
    .end();

export const notFound = (res: Response, type?: Error): void =>
  res
    .status(404)
    .json({ error: type || Error.NotFound })
    .end();

export const notAcceptable = (res: Response, type?: Error): void =>
  res
    .status(406)
    .json({ error: type || Error.NotAcceptable })
    .end();

export const unknown = (res: Response, type?: Error): void =>
  res
    .status(500)
    .json({ error: type || Error.Unknown })
    .end();
