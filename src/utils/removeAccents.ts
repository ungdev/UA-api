// More info : https://stackoverflow.com/a/37511463

export default (str: string): string => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
