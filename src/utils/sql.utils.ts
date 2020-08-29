export const escapeSqlOrder = (str: string) => str.replace(/"/g, '""').replace(/\s/g, '')
