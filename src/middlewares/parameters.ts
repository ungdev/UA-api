import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { unauthenticated, unauthorized } from '../utils/responses';
import { getToken } from '../utils/user';
import { jwtSecret } from '../utils/environment';
import { Token, UserRequest } from '../types';
import { fetchTeam } from '../operations/team';
import { fetchUser } from '../operations/user';

// Checks the user is the captain of the team. If not, it will return an error
export const isCaptainOfTeamId = async (
  request: UserRequest,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  const token = getToken(request);
  if (token) {
    // Question : Où prendre userId ?
    // Soit dans le jeton : redondant
    // Soit dans la request.user.id mais alors la vérification doit être faite :
    //  Soit dans chaque route qui utilise isCaptainOfTeamId
    //  Soit il faut exporter un tableau contenant [isUserId, cette fonction] à la place de isCaptainOfTeamId
    const decoded = jwt.verify(token, jwtSecret()) as Token;
    const { userId } = decoded;

    const { teamId } = request.user;
    const team = await fetchTeam(teamId);
    const { captainId } = team;

    // Question : y'a pas moyen d'homogénéiser le type de userId, entre la db, les requêtes, etc... ?
    // Parce que ça fait utiliser toString() dans tous les sens... Ou alors je fais mal les choses
    if (userId.toString() === captainId) {
      return next();
    }
    return unauthorized(response);
  }
  return unauthenticated(response);
};

// Checks the user is who he pretends to be. If not, it will return an error
export const isUserId = (request: UserRequest, response: Response, next: NextFunction): void => {
  const token = getToken(request);
  if (token) {
    const decoded = jwt.verify(token, jwtSecret()) as Token;
    if (decoded.userId.toString() === request.user.id) {
      return next();
    }
    // Question : Je retourne les bonnes erreurs, là ?
    return unauthorized(response);
  }
  return unauthenticated(response);
};

// Checks the user is the captain of the team. If not, it will return an error
export const isInTeamId = async (request: UserRequest, response: Response, next: NextFunction): Promise<void> => {
  const token = getToken(request);
  if (token) {
    const decoded = jwt.verify(token, jwtSecret()) as Token;
    const { userId } = decoded;
    const user = await fetchUser(userId);
    if (typeof user === User) {
        const { teamId } = user;
        if (request.user.teamId === user.teamId) {
          return next();
        }
    }
    return unauthorized(response);
    const { teamId } = user;

    if (request.user.teamId === user.teamId) {
      return next();
    }
    return unauthorized(response);
  }
  return unauthenticated(response);
};
