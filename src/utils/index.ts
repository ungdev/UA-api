import { ObjectType } from '../types';

export function pick(object: ObjectType, keys: Array<string>) {
  return keys.reduce((reducedObject, key: string) => {
    if (object && Object.prototype.hasOwnProperty.call(object, key)) {
      Object.assign(reducedObject, { key: object[key] });
    }
    return reducedObject;
  }, {});
}
