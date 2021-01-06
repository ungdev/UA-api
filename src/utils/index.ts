export function pick(object: object, keys: Array<string>) {
  return keys.reduce((reducedObject, key: string) => {
    if (object && Object.prototype.hasOwnProperty.call(object, key)) {
      Object.assign(reducedObject, { key: object[key] });
    }
    return reducedObject;
  }, {});
}
