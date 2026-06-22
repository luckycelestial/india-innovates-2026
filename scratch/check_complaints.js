const fs = require('fs');
const mysql = require('mysql2/promise');

async function check() {
  try {
    const envContent = fs.readFileSync('.env.local', 'utf-8');
    const env = {};
    envContent.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim();
      }
    });

    const conn = await mysql.createConnection({
      host: env.MYSQL_HOST || '127.0.0.1',
      port: parseInt(env.MYSQL_PORT || '3306'),
      user: env.MYSQL_USER || 'root',
      password: env.MYSQL_PASSWORD || '',
      database: env.MYSQL_DATABASE || 'praja'
    });

    const [rows] = await conn.query('SELECT DISTINCT department FROM complaints');
    console.log('Unique complaint departments:', rows.map(r => r.department));
    await conn.end();
  } catch (e) {
    console.error('Error:', e);
  }
}

check();
