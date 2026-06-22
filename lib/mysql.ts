import mysql from 'mysql2/promise'
import { MOCK_INCIDENTS, MOCK_PEOPLE, MOCK_CONNECTIONS } from './ksp/mockData'

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
  queueLimit: 0,
  ssl: host !== '127.0.0.1' && host !== 'localhost' ? { rejectUnauthorized: false } : undefined
})

// Automatically initialize the AQI table when db helper is loaded
// Automatically initialize the database when db helper is loaded
export async function initDb() {
  try {
    // Ensure database exists first
    const tempConn = await mysql.createConnection({
      host,
      port,
      user,
      password,
      ssl: host !== '127.0.0.1' && host !== 'localhost' ? { rejectUnauthorized: false } : undefined
    })
    await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``)
    await tempConn.end()
  } catch (err) {
    console.error('Failed to create database:', err)
  }

  let conn;
  try {
    conn = await pool.getConnection()
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
      CREATE TABLE IF NOT EXISTS traffic_readings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fetch_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        district_name VARCHAR(100) NOT NULL,
        current_speed INT DEFAULT 0,
        free_flow_speed INT DEFAULT 0,
        current_travel_time INT DEFAULT 0,
        free_flow_travel_time INT DEFAULT 0,
        congestion_score INT DEFAULT 0,
        confidence DOUBLE DEFAULT 1.0,
        road_name VARCHAR(255) DEFAULT ''
      )
    `)

    await conn.query(`
      CREATE TABLE IF NOT EXISTS opencity_documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        sector VARCHAR(100) NOT NULL,
        file_type VARCHAR(10) NOT NULL,
        source_url VARCHAR(512) NOT NULL,
        row_count INT DEFAULT 0,
        parsed_data JSON NULL,
        raw_text LONGTEXT NULL,
        fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await conn.query(`
      CREATE TABLE IF NOT EXISTS weather_readings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        district_name VARCHAR(100) NOT NULL,
        latitude DOUBLE NOT NULL,
        longitude DOUBLE NOT NULL,
        temperature DOUBLE NOT NULL,
        humidity INT NOT NULL,
        precipitation DOUBLE DEFAULT 0,
        weather_code INT NOT NULL,
        wind_speed DOUBLE DEFAULT 0,
        condition_label VARCHAR(100) NOT NULL,
        fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_district (district_name)
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

    await conn.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        officer_count INT DEFAULT 0,
        escalation_target VARCHAR(255) NULL,
        status VARCHAR(50) DEFAULT 'active'
      )
    `)

    await conn.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT NULL,
        department_name VARCHAR(255) NULL,
        secondary_department_name VARCHAR(255) NULL,
        escalation_target VARCHAR(255) NULL,
        priority_weight INT DEFAULT 2,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `)

    await conn.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50) NULL,
        role VARCHAR(50) NOT NULL,
        ward VARCHAR(100) NULL,
        department VARCHAR(255) NULL,
        status VARCHAR(50) DEFAULT 'active',
        last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await conn.query(`
      CREATE TABLE IF NOT EXISTS complaints (
        id VARCHAR(100) PRIMARY KEY,
        complaint_number VARCHAR(50) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        description TEXT NULL,
        location VARCHAR(255) NOT NULL,
        landmark VARCHAR(255) NULL,
        priority VARCHAR(50) DEFAULT 'medium',
        status VARCHAR(50) DEFAULT 'Pending',
        is_anonymous BOOLEAN DEFAULT FALSE,
        submitted_by VARCHAR(100) NULL,
        department VARCHAR(255) NULL,
        assigned_to VARCHAR(100) NULL,
        notes TEXT NULL,
        escalated BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `)

    try {
      const [cols]: any = await conn.query("SHOW COLUMNS FROM complaints LIKE 'notes'")
      if (cols.length === 0) {
        const [resNotesCol]: any = await conn.query("SHOW COLUMNS FROM complaints LIKE 'resolution_notes'")
        if (resNotesCol.length > 0) {
          await conn.query("ALTER TABLE complaints CHANGE COLUMN resolution_notes notes TEXT NULL")
        } else {
          await conn.query("ALTER TABLE complaints ADD COLUMN notes TEXT NULL")
        }
      }
    } catch (colErr) {
      console.error("Migration error:", colErr)
    }

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

    const [deptRows]: any = await conn.query('SELECT COUNT(*) as cnt FROM departments')
    if (deptRows[0].cnt === 0) {
      await conn.query(`
        INSERT INTO departments (id, name, officer_count, escalation_target, status) VALUES
        ('dept-1', 'Road & Pavement', 12, 'Chief Engineer (Roads)', 'active'),
        ('dept-2', 'Water Supply', 8, 'Superintendent (Water)', 'active'),
        ('dept-3', 'Electricity', 6, 'Assistant Executive Engineer', 'active'),
        ('dept-4', 'Sanitation & Cleanliness', 15, 'Health Inspector', 'active'),
        ('dept-5', 'Street Lighting', 5, 'Assistant Executive Engineer', 'active'),
        ('dept-6', 'Drainage & Waterlogging', 7, 'Chief Engineer (Roads)', 'active'),
        ('dept-7', 'Solid Waste Management', 10, 'Health Inspector', 'active'),
        ('dept-8', 'Parks & Public Spaces', 4, 'Chief Engineer (Roads)', 'active'),
        ('dept-9', 'Noise Pollution', 3, 'Health Inspector', 'active'),
        ('dept-10', 'Other', 5, 'Chief Engineer (Roads)', 'active')
      `)
    }

    const [catRows]: any = await conn.query('SELECT COUNT(*) as cnt FROM categories')
    if (catRows[0].cnt === 0) {
      await conn.query(`
        INSERT INTO categories (id, name, description, department_name, secondary_department_name, escalation_target, priority_weight, status) VALUES
        ('cat-road', 'road', 'Road and pavement defects, potholes', 'Road & Pavement', NULL, 'Chief Engineer (Roads)', 2, 'active'),
        ('cat-water', 'water', 'Water supply leakages, low pressure', 'Water Supply', NULL, 'Superintendent (Water)', 2, 'active'),
        ('cat-electricity', 'electricity', 'Power outages, hanging high-voltage cables', 'Electricity', NULL, 'Assistant Executive Engineer', 2, 'active'),
        ('cat-sanitation', 'sanitation', 'Garbage accumulation, public sweeping', 'Sanitation & Cleanliness', NULL, 'Health Inspector', 2, 'active'),
        ('cat-streetlight', 'streetlight', 'Street lighting non-functional or dim', 'Street Lighting', NULL, 'Assistant Executive Engineer', 1, 'active'),
        ('cat-drainage', 'drainage', 'Blocked storm drains, sewage overflow', 'Drainage & Waterlogging', NULL, 'Chief Engineer (Roads)', 3, 'active'),
        ('cat-waste', 'waste', 'Solid waste management issues', 'Solid Waste Management', NULL, 'Health Inspector', 2, 'active'),
        ('cat-parks', 'parks', 'Parks maintenance, tree cutting', 'Parks & Public Spaces', NULL, 'Chief Engineer (Roads)', 1, 'active'),
        ('cat-noise', 'noise', 'Loudspeaker disturbance, noise pollution', 'Noise Pollution', NULL, 'Health Inspector', 2, 'active'),
        ('cat-other', 'other', 'General public grievances', 'Other', NULL, 'Chief Engineer (Roads)', 2, 'active')
      `)
    }

    const [profileRows]: any = await conn.query('SELECT COUNT(*) as cnt FROM profiles')
    if (profileRows[0].cnt === 0) {
      await conn.query(`
        INSERT INTO profiles (id, name, email, phone, role, ward, department, status) VALUES
        ('admin-id-123', 'Ramesh Babu', 'admin@nagaragupta.gov', '9876543210', 'admin', 'Ward 42', 'General Administration', 'active'),
        ('officer-id-123', 'Priya Nair', 'officer@nagaragupta.gov', '9876543211', 'admin', 'Ward 42', 'Road & Pavement', 'active'),
        ('citizen-id-123', 'Citizen User', 'citizen@nagaragupta.gov', '9876543212', 'citizen', 'Ward 42', NULL, 'active')
      `)
    }

    const [complaintRows]: any = await conn.query('SELECT COUNT(*) as cnt FROM complaints')
    if (complaintRows[0].cnt === 0) {
      await conn.query(`
        INSERT INTO complaints (id, complaint_number, title, category, description, location, landmark, priority, status, is_anonymous, submitted_by, department, assigned_to, notes, escalated, created_at) VALUES
        ('c-1', 'PRJ-837482', 'Potholes on Ring Road', 'road', 'Multiple deep potholes near Central Mall junction causing severe traffic slowdowns.', 'Ward 12, Main Cross', 'Central Mall Gate', 'high', 'In Progress', 0, 'citizen-id-123', 'Road & Pavement', 'officer-id-123', NULL, 0, DATE_SUB(NOW(), INTERVAL 2 DAY)),
        ('c-2', 'PRJ-192842', 'Low water pressure', 'water', 'Water pressure has been extremely low for the past 4 days, barely reaching first floor.', 'Ward 2, Gandhi Nagar School Road', 'Govt High School', 'medium', 'Pending', 0, 'citizen-id-123', 'Water Supply', NULL, NULL, 0, DATE_SUB(NOW(), INTERVAL 1 DAY)),
        ('c-3', 'PRJ-472910', 'Streetlights not working', 'streetlight', 'Entire stretch of streetlights from crossroad to park is dark, unsafe for pedestrians.', 'Ward 9, Block C Metro Layout', 'Metro Pillar 140', 'medium', 'resolved', 0, 'citizen-id-123', 'Street Lighting', 'officer-id-123', 'Replaced blown fuses and restored connection.', 0, DATE_SUB(NOW(), INTERVAL 5 DAY))
      `)
    }

    await conn.query(`
      CREATE TABLE IF NOT EXISTS ksp_incidents (
        id VARCHAR(100) PRIMARY KEY,
        case_number VARCHAR(100) UNIQUE NOT NULL,
        category VARCHAR(100) NOT NULL,
        description TEXT NULL,
        location VARCHAR(255) NOT NULL,
        district VARCHAR(100) NOT NULL,
        police_station VARCHAR(100) NOT NULL,
        latitude DOUBLE NOT NULL,
        longitude DOUBLE NOT NULL,
        date_time VARCHAR(100) NOT NULL,
        priority VARCHAR(50) NOT NULL,
        modus_operandi TEXT NULL,
        socio_economic_factors JSON NULL,
        risk_score DOUBLE NOT NULL
      )
    `)

    await conn.query(`
      CREATE TABLE IF NOT EXISTS ksp_people (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        classification VARCHAR(50) NOT NULL,
        demographics JSON NULL
      )
    `)

    await conn.query(`
      CREATE TABLE IF NOT EXISTS ksp_connections (
        id VARCHAR(100) PRIMARY KEY,
        incident_id VARCHAR(100) NOT NULL,
        person_id VARCHAR(100) NOT NULL,
        role VARCHAR(50) NOT NULL
      )
    `)

    const [kspIncidentRows]: any = await conn.query('SELECT COUNT(*) as cnt FROM ksp_incidents')
    if (kspIncidentRows[0].cnt !== MOCK_INCIDENTS.length) {
      console.log('Seeding/updating ksp_incidents table...')
      await conn.query('DELETE FROM ksp_incidents')
      for (const inc of MOCK_INCIDENTS) {
        await conn.query(
          'INSERT INTO ksp_incidents (id, case_number, category, description, location, district, police_station, latitude, longitude, date_time, priority, modus_operandi, socio_economic_factors, risk_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            inc.id,
            inc.case_number,
            inc.category,
            inc.description,
            inc.location,
            inc.district,
            inc.police_station,
            inc.latitude,
            inc.longitude,
            inc.date_time,
            inc.priority,
            inc.modus_operandi,
            JSON.stringify(inc.socio_economic_factors),
            inc.risk_score
          ]
        )
      }
    }

    const [kspPeopleRows]: any = await conn.query('SELECT COUNT(*) as cnt FROM ksp_people')
    if (kspPeopleRows[0].cnt === 0) {
      console.log('Seeding ksp_people table...')
      for (const p of MOCK_PEOPLE) {
        await conn.query(
          'INSERT INTO ksp_people (id, name, classification, demographics) VALUES (?, ?, ?, ?)',
          [
            p.id,
            p.name,
            p.classification,
            JSON.stringify(p.demographics)
          ]
        )
      }
    }

    const [kspConnectionRows]: any = await conn.query('SELECT COUNT(*) as cnt FROM ksp_connections')
    if (kspConnectionRows[0].cnt === 0) {
      console.log('Seeding ksp_connections table...')
      for (const c of MOCK_CONNECTIONS) {
        await conn.query(
          'INSERT INTO ksp_connections (id, incident_id, person_id, role) VALUES (?, ?, ?, ?)',
          [
            c.id,
            c.incident_id,
            c.person_id,
            c.role
          ]
        )
      }
    }

    console.log('MySQL databases and tables initialized successfully.')
  } catch (err) {
    console.error('Failed to initialize MySQL:', err)
  } finally {
    if (conn) conn.release()
  }
}
