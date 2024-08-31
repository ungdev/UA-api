import { RateLimiterMemory } from 'rate-limiter-flexible';
import type { Request, Response, NextFunction } from 'express';

const options = {
  points: 120,
  duration: 1,
};

const rateLimiter = new RateLimiterMemory(options);

export default [
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      await rateLimiter.consume(request.ip);
      next();
    } catch {
      response.status(429).send('Too Many Requests');
    }
  },
];
