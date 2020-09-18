// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function pick(object: any, keys: Array<string>) {
  return keys.reduce((obj, key: string) => {
    if (object && Object.prototype.hasOwnProperty.call(object, key)) {
      Object.assign(obj, { key: object[key] });
    }
    return obj;
  }, {});
}
