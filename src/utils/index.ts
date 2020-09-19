import { ObjectType } from '../types';

export function pick(object: ObjectType, keys: Array<string>) {
  return keys.reduce((objectReduced, key: string) => {
    if (object && Object.prototype.hasOwnProperty.call(object, key)) {
      Object.assign(objectReduced, { key: object[key] });
    }
    return objectReduced;
  }, {});
}
