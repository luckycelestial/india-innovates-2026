const mysql = require('mysql2/promise');

async function main() {
  const host = process.env.MYSQL_HOST || '127.0.0.1'
  const port = parseInt(process.env.MYSQL_PORT || '3306')
  const user = process.env.MYSQL_USER || 'root'
  const password = process.env.MYSQL_PASSWORD || ''
  const database = process.env.MYSQL_DATABASE || 'praja'

  const pool = mysql.createPool({
    host, port, user, password, database
  });

  try {
    const cardId = 'c-1';
    const targetStatus = 'assigned';
    const timestamp = new Date().toISOString();

    console.log('Testing raw update...');
    const query = 'UPDATE `complaints` SET `status` = ?, `updated_at` = ? WHERE `id` = ?';
    const params = [targetStatus, new Date(timestamp), cardId];
    
    const [result] = await pool.query(query, params);
    console.log('Success!', result);
  } catch (err) {
    console.error('Error occurred:', err);
  } finally {
    await pool.end();
  }
}

main();
