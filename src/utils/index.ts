import { ObjectType } from '../types';

export function pick(object: ObjectType, keys: Array<string>) {
  return keys.reduce((object_, key: string) => {
    if (object && Object.prototype.hasOwnProperty.call(object, key)) {
      Object.assign(object_, { key: object[key] });
    }
    return object_;
  }, {});
}
