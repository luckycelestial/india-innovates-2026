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

const DISTRICTS = [
  'Bengaluru Urban', 'Mysuru', 'Belagavi', 'Mangaluru', 'Mandya',
  'Kalaburagi', 'Bagalkot', 'Ramanagara', 'Ballari', 'Bidar',
  'Vijayapura', 'Chamarajanagar', 'Chikkamagaluru', 'Chitradurga', 'Davanagere',
  'Dharwad', 'Gadag', 'Hassan', 'Haveri', 'Kodagu',
  'Chikkaballapura', 'Koppal', 'Raichur', 'Shivamogga', 'Tumakuru',
  'Udupi', 'Uttara Kannada', 'Bengaluru Rural', 'Kolar', 'Yadgir'
];

const CATEGORIES = [
  { id: 'road', name: 'road', dept: 'Road & Pavement', officer: 'officer-id-123' },
  { id: 'water', name: 'water', dept: 'Water Supply', officer: 'officer-water' },
  { id: 'electricity', name: 'electricity', dept: 'Electricity', officer: 'officer-elec' },
  { id: 'sanitation', name: 'sanitation', dept: 'Sanitation & Cleanliness', officer: 'officer-san' },
  { id: 'streetlight', name: 'streetlight', dept: 'Street Lighting', officer: 'officer-light' },
  { id: 'drainage', name: 'drainage', dept: 'Drainage & Waterlogging', officer: 'officer-drain' },
  { id: 'waste', name: 'waste', dept: 'Solid Waste Management', officer: 'officer-waste' },
  { id: 'parks', name: 'parks', dept: 'Parks & Public Spaces', officer: 'officer-parks' },
  { id: 'noise', name: 'noise', dept: 'Noise Pollution', officer: 'officer-noise' },
  { id: 'other', name: 'other', dept: 'Other', officer: 'officer-other' }
];

const TEMPLATES = {
  road: [
    { title: 'Dangerous Potholes on Main Road', desc: 'Several deep potholes have formed on the main road, causing vehicle damage and traffic hazards.' },
    { title: 'Broken Footpath Tiles', desc: 'The pedestrian walkway tiles are completely broken, making it unsafe for senior citizens and children.' },
    { title: 'Unpaved Road Causing Severe Dust', desc: 'The secondary road was dug up for utility work and left unpaved. Wind spreads thick dust into houses.' }
  ],
  water: [
    { title: 'Major Water Pipeline Leakage', desc: 'Drinking water is leaking heavily from the main underground pipe, flooding the road and causing low pressure.' },
    { title: 'No Water Supply for 3 Days', desc: 'Water has not been supplied for three consecutive days. Residents are dependent on private water tankers.' },
    { title: 'Contaminated Muddy Water Supply', desc: 'The tap water supplied today is muddy and smells bad. Unusable for drinking or cooking.' }
  ],
  electricity: [
    { title: 'Hanging High Voltage Electric Cables', desc: 'A high voltage power cable is hanging dangerously low near a public park, risking electrocution.' },
    { title: 'Frequent Unannounced Power Cuts', desc: 'Power cuts occur 5-6 times daily without notice, severely affecting work and home appliances.' },
    { title: 'Sparking Electric Transformer', desc: 'The local transformer sparks loudly during peak hours. Neighbors fear a fire hazard.' }
  ],
  sanitation: [
    { title: 'Overflowing Public Dustbins', desc: 'Public garbage bins have not been cleared for a week. Strays are scattering trash onto the street.' },
    { title: 'Clogged Open Drainage System', desc: 'Plastic bags and debris have completely blocked the open drain, causing a horrible odor and mosquito breeding.' },
    { title: 'Public Toilet Maintenance Issue', desc: 'The community toilet facility lacks running water and is extremely unhygienic.' }
  ],
  streetlight: [
    { title: 'Entire Streetlight Row Out of Service', desc: 'All streetlights on this block have been non-functional for 5 days. Dark and unsafe at night.' },
    { title: 'Flickering Streetlight Near Junction', desc: 'Streetlight keeps flickering continuously, causing distraction and leaving the corner mostly dark.' },
    { title: 'Request for New Streetlight Installation', desc: 'The blind curve has no lighting, causing multiple minor accidents. Request a new streetlight.' }
  ],
  drainage: [
    { title: 'Sewage Overflowing on Road', desc: 'A blocked sewer line is causing raw sewage to bubble up and flow onto the pedestrian pathway.' },
    { title: 'Waterlogging During Light Rain', desc: 'The storm drain inlet is choked. Even minimal rainfall causes water to accumulate up to 1 foot.' },
    { title: 'Broken Drain Cover Slab', desc: 'A concrete slab covering the storm drain is broken, leaving a dangerous gap on the roadside.' }
  ],
  waste: [
    { title: 'Garbage Truck Not Visiting for Door-to-Door Pickup', desc: 'The waste collection vehicle has skipped our lane for 4 days, forcing residents to store garbage at home.' },
    { title: 'Illegal Construction Waste Dumping', desc: 'Someone has dumped a large pile of concrete debris and bricks on the vacant public plot.' },
    { title: 'Commercial Waste Dumped Near Residential Area', desc: 'Local shops are dumping cardboard boxes and organic waste on the roadside corner instead of proper disposal.' }
  ],
  parks: [
    { title: 'Overgrown Grass and Weeds in Public Park', desc: 'The park is neglected. Grass is waist-high and residents are afraid to enter due to snakes.' },
    { title: 'Broken Children Swing and Slides', desc: 'The children play area equipment is rusted and broken. Extremely unsafe for kids.' },
    { title: 'Dead Trees Risking Collapse', desc: 'A dry, dead tree is leaning towards the walking track, posing a threat to morning walkers.' }
  ],
  noise: [
    { title: 'Loudspeaker Use Past Permitted Hours', desc: 'A local event is playing music through high-decibel speakers well past midnight, disrupting sleep.' },
    { title: 'Commercial Workshop Noise in Residential Zone', desc: 'A metal welding workshop is operating in a residential lane, producing loud grinding noise all day.' },
    { title: 'Heavy Vehicle Honking and Noise', desc: 'Trucks frequently block the lane and honk continuously during early morning hours.' }
  ],
  other: [
    { title: 'Encroachment of Footpath by Vendor Shops', desc: 'Shop owners have extended their displays onto the entire footpath, forcing pedestrians to walk on the busy road.' },
    { title: 'Stray Dog Menace Near School', desc: 'A pack of aggressive stray dogs has gathered near the school gate, barking at and chasing children.' },
    { title: 'Vandalism of Public Benches', desc: 'Recently installed public benches at the bus stop have been spray-painted and damaged.' }
  ]
};

const STATUSES = ['Pending', 'Assigned', 'In Progress', 'resolved', 'closed', 'escalated'];
const PRIORITIES = ['low', 'medium', 'high'];

const OFFICERS_TO_SEED = [
  { id: 'officer-water', name: 'Suresh Kumar', email: 'suresh.water@nagaragupta.gov', phone: '9876543220', department: 'Water Supply' },
  { id: 'officer-elec', name: 'Anil K.', email: 'anil.elec@nagaragupta.gov', phone: '9876543221', department: 'Electricity' },
  { id: 'officer-san', name: 'Meena R.', email: 'meena.san@nagaragupta.gov', phone: '9876543222', department: 'Sanitation & Cleanliness' },
  { id: 'officer-light', name: 'Karthik S.', email: 'karthik.light@nagaragupta.gov', phone: '9876543223', department: 'Street Lighting' },
  { id: 'officer-drain', name: 'Vijay M.', email: 'vijay.drain@nagaragupta.gov', phone: '9876543224', department: 'Drainage & Waterlogging' },
  { id: 'officer-waste', name: 'Sunitha P.', email: 'sunitha.waste@nagaragupta.gov', phone: '9876543225', department: 'Solid Waste Management' },
  { id: 'officer-parks', name: 'Ravi Shankar', email: 'ravi.parks@nagaragupta.gov', phone: '9876543226', department: 'Parks & Public Spaces' },
  { id: 'officer-noise', name: 'Geetha J.', email: 'geetha.noise@nagaragupta.gov', phone: '9876543227', department: 'Noise Pollution' },
  { id: 'officer-other', name: 'Devendra B.', email: 'devendra.other@nagaragupta.gov', phone: '9876543228', department: 'Other' }
];

async function run() {
  console.log('Connecting to MySQL database...');
  const pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database
  });

  try {
    // 1. Seed extra officer profiles
    console.log('Seeding profiles/officers...');
    for (const off of OFFICERS_TO_SEED) {
      await pool.query(
        `INSERT IGNORE INTO profiles (id, name, email, phone, role, ward, department, status) 
         VALUES (?, ?, ?, ?, 'admin', 'Ward 42', ?, 'active')`,
        [off.id, off.name, off.email, off.phone, off.department]
      );
    }

    // 2. Clear existing complaints
    console.log('Clearing complaints table...');
    await pool.query('DELETE FROM complaints');

    // 3. Generate complaints
    const complaints = [];
    let count = 1;

    for (const district of DISTRICTS) {
      // 4 complaints per district = 120 total
      for (let i = 0; i < 4; i++) {
        const catObj = CATEGORIES[(count - 1) % CATEGORIES.length];
        const templates = TEMPLATES[catObj.id];
        const template = templates[i % templates.length];

        const id = `c-${count}`;
        const complaint_number = `PRJ-${Math.floor(100000 + Math.random() * 900000)}`;
        const title = template.title;
        const description = `${template.desc} Location needs immediate attention.`;
        
        // Ensure location matches getComplaintDistrict extraction
        const streetNo = Math.floor(10 + Math.random() * 90);
        const location = `${streetNo}th Cross Road, Gandhi Nagar, ${district}`;
        const landmark = `Near Old Post Office`;
        
        const priority = PRIORITIES[Math.floor(Math.random() * PRIORITIES.length)];
        const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
        const is_anonymous = Math.random() > 0.7 ? 1 : 0;
        const submitted_by = is_anonymous ? null : 'citizen-id-123';
        
        const department = catObj.dept;
        const assigned_to = status === 'Pending' ? null : catObj.officer;
        
        let notes = null;
        if (status === 'resolved' || status === 'closed') {
          notes = `Inspected site. Issue has been addressed and fixed by the department team.`;
        }

        const escalated = status === 'escalated' ? 1 : 0;

        // Spread dates over past 30 days
        const daysAgo = Math.floor(Math.random() * 30);
        const created_at = new Date();
        created_at.setDate(created_at.getDate() - daysAgo);

        complaints.push([
          id, complaint_number, title, catObj.id, description, location, landmark,
          priority, status, is_anonymous, submitted_by, department, assigned_to,
          notes, escalated, created_at
        ]);

        count++;
      }
    }

    console.log(`Inserting ${complaints.length} complaints into the database...`);
    const insertQuery = `
      INSERT INTO complaints (
        id, complaint_number, title, category, description, location, landmark,
        priority, status, is_anonymous, submitted_by, department, assigned_to,
        notes, escalated, created_at
      ) VALUES ?
    `;

    await pool.query(insertQuery, [complaints]);
    console.log('Seeding finished successfully.');

    // 4. Update civic_complaints in districts table to match the actual counts
    console.log('Updating districts table complaint counts...');
    for (const district of DISTRICTS) {
      const [rows] = await pool.query(
        `SELECT COUNT(*) as count FROM complaints WHERE location LIKE ?`,
        [`%${district}%`]
      );
      const actualCount = rows[0].count;
      await pool.query(
        `UPDATE districts SET civic_complaints = ? WHERE name = ?`,
        [actualCount, district]
      );
    }
    console.log('Districts complaints count updated.');

  } catch (err) {
    console.error('Error seeding complaints:', err);
  } finally {
    await pool.end();
  }
}

run();
