function uuid() {
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
		let r = (Math.random()*16)|0;
		return (c === "x" ? r : (r&0x3)|0x8).toString(16);
	});
}

function isString(val) {
	let type = typeof val;
	return type === "string";
}

function isArray(arr) {
	return Array.isArray(arr);
}

function isObject(obj) {
	let type = typeof obj;
	return (type === "function" || type === "object") && !!obj;
}

function keys(obj) {
	if (!isObject(obj)) {
		return [];
	}
	return Object.keys(obj);
}

function allKeys(obj) {
	if (!isObject(obj)) {
		return [];
	}
	let keys = [];
	for (let key in obj) {
		keys.push(key);
	}
	return keys;
}

function isEmpty(obj) {
	if (obj === null || obj === undefined) {
		return true;
	}
	if (isArray(obj) || isString(obj)) {
		return obj.length === 0;
	}
	return keys(obj).length === 0;
}

function extend(obj) {
	let length = arguments.length;
	if (length < 2 || obj === null || obj === undefined) {
		return obj;
	}
	for (let index = 1; index < length; index++) {
		let source = arguments[index],
			keys = allKeys(source),
			l = keys.length;
		for (let i = 0; i < l; i++) {
			let key = keys[i];
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