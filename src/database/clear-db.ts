import { DataSource } from 'typeorm';

const clearDB = async (dataSource: DataSource) => {
  // Fetch all table names from the database
  const tables = await dataSource.query(`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename != 'migrations';
  `);

  // Generate TRUNCATE statements dynamically
  const tableNames = tables
    .map((row: { tablename: string }) => `"${row.tablename}"`)
    .join(', ');

  if (tableNames) {
    // Truncate all tables
    await dataSource.query(`TRUNCATE ${tableNames} CASCADE;`);
  }
};

export default clearDB;
