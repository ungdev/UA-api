// More info : https://stackoverflow.com/a/37511463

export default (string: string): string => string.normalize('NFD').replace(/[\u0300-\u036F]/g, '');
