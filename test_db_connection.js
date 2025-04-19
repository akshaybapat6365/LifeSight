// Script to test database connection
const { Pool } = require('pg');

// Connection details for our local PostgreSQL database
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'lifesight',
  password: 'password',
  port: 5432,
});

async function testConnection() {
  try {
    // Connect to the database
    const client = await pool.connect();
    console.log('Successfully connected to PostgreSQL database!');

    // Run a test query
    const res = await client.query('SELECT COUNT(*) FROM "User"');
    console.log(`Database contains ${res.rows[0].count} users.`);

    // Check tables
    const tableRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('\nDatabase tables:');
    tableRes.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });

    // Release the client
    client.release();
  } catch (err) {
    console.error('Error connecting to the database:', err);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the test
testConnection(); 