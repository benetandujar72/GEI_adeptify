// Archivo de base de datos simple para resolver importaciones
export const db = {
  // Placeholder para la base de datos
  query: async (sql: string, params?: any[]) => {
    console.log('Database query:', sql, params);
    return { rows: [] };
  },
  // Otros métodos de base de datos que puedan necesitar los servicios
}; 