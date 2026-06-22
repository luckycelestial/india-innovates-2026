const mysql = require('mysql2/promise');

const host = 'mysql-1f87a940-pavithran-923b.j.aivencloud.com';
const port = 25047;
const user = 'avnadmin';
const password = 'AVNS_GmA7jP1Zo63cjT637Mc';
const database = 'defaultdb';

async function test() {
  console.log("Connecting...");
  try {
    const conn = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      ssl: { rejectUnauthorized: false }
    });
    console.log("Connected successfully!");
    const [rows] = await conn.query("SHOW TABLES");
    console.log("Tables:", rows);
    await conn.end();
  } catch (err) {
    console.error("Connection failed:", err);
  }
}

test();
