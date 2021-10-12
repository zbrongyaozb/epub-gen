function uuid () {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function isString (val) {
  const type = typeof val;
  return type === 'string';
}

function isArray (arr) {
  return Array.isArray(arr);
}

function isObject (obj) {
  const type = typeof obj;
  return (type === 'function' || type === 'object') && !!obj;
}

function keys (obj) {
  if (!isObject(obj)) {
    return [];
  }
  return Object.keys(obj);
}

function allKeys (obj) {
  if (!isObject(obj)) {
    return [];
  }
  const keys = [];
  for (const key in obj) {
    keys.push(key);
  }
  return keys;
}

function isEmpty (obj) {
  if (obj === null || obj === undefined) {
    return true;
  }
  if (isArray(obj) || isString(obj)) {
    return obj.length === 0;
  }
  return keys(obj).length === 0;
}

function extend (obj) {
  const length = arguments.length;
  if (length < 2 || obj === null || obj === undefined) {
    return obj;
  }
  for (let index = 1; index < length; index++) {
    const source = arguments[index];
    const keys = allKeys(source);
    const l = keys.length;
    for (let i = 0; i < l; i++) {
      const key = keys[i];
      obj[key] = source[key];
    }
  }
  return obj;
}

module.exports = {
  uuid: uuid,
  isString: isString,
  isArray: isArray,
  isObject: isObject,
  isEmpty: isEmpty,
  extend: extend
};
