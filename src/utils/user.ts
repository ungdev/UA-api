import { Request } from 'express';
import { fetchUser, fetchUsers } from '../operations/user';

export const getToken = (request: Request): string => {
  const authorization = request.get('Authorization');

  if (!authorization) {
    return '';
  }

  // Authorization header is of the form "Bearer {token}"
  const token = authorization.split(' ')[1];

  return token;
};

// Create a unique id for a new User
export const createNewUserId = async () => {
  const usersTab = await fetchUsers();
  let id = '';
  if (usersTab.length === 0) {
    id = '000001';
  } else {
    // Find the biggest id in the database, add 1, here is the id
    const idTab = [] as string[];
    usersTab.map((element) => {
      return idTab.push(element.id);
    });
    idTab.sort();
    const maxId = idTab[idTab.length - 1];
    id = (Number(maxId) + 1).toString();
    while (id.length < 6) {
      id = '0'.concat(id);
    }
  }
  return id;
};

export const getUser = (request: Request) => fetchUser(getToken(request));
