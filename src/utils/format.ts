// Converte um objeto de camelCase para snake_case
export const camelToSnake = (obj: Record<string, any>): Record<string, any> => {
    const newObj: Record<string, any> = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            newObj[snakeKey] = obj[key];
        }
    }
    return newObj;
};

// Converte um objeto (ou array de objetos) de snake_case para camelCase
export const snakeToCamel = (data: any): any => {
    if (data === null || typeof data !== 'object') {
        return data;
    }

    if (Array.isArray(data)) {
        return data.map(item => snakeToCamel(item));
    }

    const newObj: Record<string, any> = {};
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            const camelKey = key.replace(/_([a-z])/g, (group) => group[1].toUpperCase());
            newObj[camelKey] = snakeToCamel(data[key]); // Recursivo para objetos aninhados
        }
    }
    return newObj;
};