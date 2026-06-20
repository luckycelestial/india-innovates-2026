const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts[1].trim();
  }
});

const host = env.MYSQL_HOST || '127.0.0.1';
const port = parseInt(env.MYSQL_PORT || '3306');
const user = env.MYSQL_USER || 'root';
const password = env.MYSQL_PASSWORD || 'root';
const database = env.MYSQL_DATABASE || 'praja';

const MOCK_AQI = [
  { stationId: 'AQI-BLR', name: 'Bengaluru Urban', aqi: 142, pm25: 42, pm10: 84 },
  { stationId: 'AQI-MYS', name: 'Mysuru', aqi: 58, pm25: 18, pm10: 35 },
  { stationId: 'AQI-MLR', name: 'Mangaluru', aqi: 35, pm25: 10, pm10: 22 },
  { stationId: 'AQI-BEL', name: 'Belagavi', aqi: 110, pm25: 31, pm10: 62 },
  { stationId: 'AQI-KLB', name: 'Kalaburagi', aqi: 165, pm25: 55, pm10: 110 },
  { stationId: 'AQI-BGK', name: 'Bagalkot', aqi: 75, pm25: 22, pm10: 45 },
  { stationId: 'AQI-RAM', name: 'Ramanagara', aqi: 82, pm25: 25, pm10: 50 },
  { stationId: 'AQI-BLY', name: 'Ballari', aqi: 155, pm25: 52, pm10: 105 },
  { stationId: 'AQI-BDR', name: 'Bidar', aqi: 62, pm25: 19, pm10: 38 },
  { stationId: 'AQI-VJP', name: 'Vijayapura', aqi: 88, pm25: 28, pm10: 56 },
  { stationId: 'AQI-CHM', name: 'Chamarajanagar', aqi: 48, pm25: 14, pm10: 28 },
  { stationId: 'AQI-CKM', name: 'Chikkamagaluru', aqi: 42, pm25: 12, pm10: 24 },
  { stationId: 'AQI-CTA', name: 'Chitradurga', aqi: 95, pm25: 30, pm10: 60 },
  { stationId: 'AQI-DVG', name: 'Davanagere', aqi: 102, pm25: 32, pm10: 64 },
  { stationId: 'AQI-DWD', name: 'Dharwad', aqi: 88, pm25: 27, pm10: 54 },
  { stationId: 'AQI-GDG', name: 'Gadag', aqi: 70, pm25: 21, pm10: 42 },
  { stationId: 'AQI-HSN', name: 'Hassan', aqi: 52, pm25: 15, pm10: 30 },
  { stationId: 'AQI-HVR', name: 'Haveri', aqi: 66, pm25: 20, pm10: 40 },
  { stationId: 'AQI-KDG', name: 'Kodagu', aqi: 30, pm25: 9, pm10: 18 },
  { stationId: 'AQI-CBP', name: 'Chikkaballapura', aqi: 78, pm25: 23, pm10: 46 },
  { stationId: 'AQI-KPL', name: 'Koppal', aqi: 85, pm25: 26, pm10: 52 },
  { stationId: 'AQI-MDY', name: 'Mandya', aqi: 50, pm25: 15, pm10: 30 },
  { stationId: 'AQI-RCR', name: 'Raichur', aqi: 120, pm25: 38, pm10: 76 },
  { stationId: 'AQI-SMG', name: 'Shivamogga', aqi: 55, pm25: 16, pm10: 32 },
  { stationId: 'AQI-TMK', name: 'Tumakuru', aqi: 92, pm25: 29, pm10: 58 },
  { stationId: 'AQI-UDP', name: 'Udupi', aqi: 38, pm25: 11, pm10: 22 },
  { stationId: 'AQI-UKN', name: 'Uttara Kannada', aqi: 32, pm25: 9, pm10: 20 },
  { stationId: 'AQI-BLR-R', name: 'Bengaluru Rural', aqi: 80, pm25: 24, pm10: 48 },
  { stationId: 'AQI-KLR', name: 'Kolar', aqi: 98, pm25: 30, pm10: 60 },
  { stationId: 'AQI-YDG', name: 'Yadgir', aqi: 72, pm25: 21, pm10: 43 }
];

async function run() {
  console.log('Seeding all 30 districts to MySQL aqi_readings table...');
  const pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database
  });

  try {
    await pool.query('TRUNCATE TABLE aqi_readings');
    console.log('Table truncated.');
    for (const item of MOCK_AQI) {
      await pool.query(
        'INSERT INTO aqi_readings (station_id, ward_name, aqi, pm25, pm10) VALUES (?, ?, ?, ?, ?)',
        [item.stationId, item.name, item.aqi, item.pm25, item.pm10]
      );
    }
    console.log('Successfully seeded 30 districts.');
  } catch (err) {
    console.error('Error during seeding:', err);
  } finally {
    await pool.end();
  }
}

run();
