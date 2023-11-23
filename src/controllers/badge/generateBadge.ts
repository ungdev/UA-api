import { NextFunction, Request, Response } from 'express';
import { generateBadge } from '../../utils/badge';
import { fetchUsers } from '../../operations/user';
import { User, UserSearchQuery } from '../../types';

export default [
  // Middlewares

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      // get first user in DB and generate a badge for him
      const result = (await fetchUsers({} as UserSearchQuery, 0))[0];


      const pdf: {
        content: Buffer;
        filename: string;
      } = await generateBadge(result as unknown as User);

      // display the pdf in the browser
      response.contentType('application/pdf');
      response.send(pdf.content);
    } catch (error) {
      return next(error);
    }
  },
];
