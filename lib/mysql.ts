import mysql from 'mysql2/promise'

const host = process.env.MYSQL_HOST || '127.0.0.1'
const port = parseInt(process.env.MYSQL_PORT || '3306')
const user = process.env.MYSQL_USER || 'root'
const password = process.env.MYSQL_PASSWORD || ''
const database = process.env.MYSQL_DATABASE || 'praja'

export const pool = mysql.createPool({
  host,
  port,
  user,
  password,
  database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

// Automatically initialize the AQI table when db helper is loaded
export async function initDb() {
  try {
    // Ensure database exists first
    const tempConn = await mysql.createConnection({
      host,
      port,
      user,
      password
    })
    await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``)
    await tempConn.end()

    const conn = await pool.getConnection()
    await conn.query(`
      CREATE TABLE IF NOT EXISTS aqi_readings (
        station_id VARCHAR(100) PRIMARY KEY,
        ward_name VARCHAR(100) NOT NULL,
        aqi INT NOT NULL,
        pm25 DOUBLE DEFAULT 0,
        pm10 DOUBLE DEFAULT 0,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `)

    await conn.query(`
      CREATE TABLE IF NOT EXISTS districts (
        name VARCHAR(100) PRIMARY KEY,
        latitude DOUBLE NOT NULL,
        longitude DOUBLE NOT NULL,
        temp DOUBLE DEFAULT 25.0,
        civic_complaints INT DEFAULT 0
      )
    `)

    const [rows]: any = await conn.query('SELECT COUNT(*) as cnt FROM districts')
    if (rows[0].cnt === 0) {
      console.log('Seeding districts table...')
      const DISTRICTS_SEED = [
        ['Bengaluru Urban', 12.9716, 77.5946, 24, 14],
        ['Mysuru', 12.2958, 76.6394, 26, 4],
        ['Belagavi', 15.8497, 74.4977, 23, 6],
        ['Mangaluru', 12.9141, 74.8560, 32, 3],
        ['Mandya', 12.5218, 76.8973, 29, 1],
        ['Kalaburagi', 17.3297, 76.8343, 36, 8],
        ['Bagalkot', 16.1817, 75.6958, 30, 2],
        ['Ramanagara', 12.7209, 77.2784, 28, 3],
        ['Ballari', 15.1394, 76.9214, 34, 5],
        ['Bidar', 17.9104, 77.5199, 33, 2],
        ['Vijayapura', 16.8302, 75.7100, 31, 4],
        ['Chamarajanagar', 11.9261, 76.9402, 27, 1],
        ['Chikkamagaluru', 13.3161, 75.7720, 22, 1],
        ['Chitradurga', 14.2251, 76.3980, 29, 3],
        ['Davanagere', 14.4644, 75.9218, 30, 4],
        ['Dharwad', 15.4589, 75.0078, 28, 5],
        ['Gadag', 15.4292, 75.6268, 29, 2],
        ['Hassan', 13.0072, 76.1026, 25, 3],
        ['Haveri', 14.7937, 75.4055, 28, 2],
        ['Kodagu', 12.3375, 75.8069, 21, 1],
        ['Chikkaballapura', 13.4354, 77.7277, 26, 3],
        ['Koppal', 15.3468, 76.1554, 32, 2],
        ['Raichur', 16.2120, 77.3556, 35, 6],
        ['Shivamogga', 13.9299, 75.5681, 27, 3],
        ['Tumakuru', 13.3379, 77.1173, 28, 4],
        ['Udupi', 13.3409, 74.7421, 31, 2],
        ['Uttara Kannada', 14.6219, 74.6738, 29, 2],
        ['Bengaluru Rural', 13.2284, 77.5794, 25, 3],
        ['Kolar', 13.1367, 78.1291, 27, 3],
        ['Yadgir', 16.7667, 77.1377, 34, 2]
      ]
      for (const d of DISTRICTS_SEED) {
        await conn.query(
          'INSERT INTO districts (name, latitude, longitude, temp, civic_complaints) VALUES (?, ?, ?, ?, ?)',
          d
        )
      }
    }

    conn.release()
    console.log('MySQL AQI and districts tables checked/initialized successfully.')
  } catch (err) {
    console.error('Failed to initialize MySQL AQI table:', err)
  }
}
