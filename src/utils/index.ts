import { ObjectType } from '../types';

export function pick(object: ObjectType, keys: Array<string>) {
  return keys.reduce((obj, key: string) => {
    if (object && Object.prototype.hasOwnProperty.call(object, key)) {
      Object.assign(obj, { key: object[key] });
    }
    return obj;
  }, {});
}
