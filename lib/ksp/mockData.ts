export interface KspIncident {
  id: string
  case_number: string
  category: string
  description: string
  location: string
  district: string
  police_station: string
  latitude: number
  longitude: number
  date_time: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  modus_operandi: string
  socio_economic_factors: {
    urbanization: 'high' | 'medium' | 'low'
    density: 'dense' | 'moderate' | 'sparse'
    poverty_index: 'high' | 'medium' | 'low'
  }
  risk_score: number
}

export interface KspPerson {
  id: string
  name: string
  classification: 'suspect' | 'victim' | 'associate'
  demographics: {
    age: number
    gender: 'M' | 'F'
    occupation: string
  }
}

export interface KspConnection {
  id: string
  incident_id: string
  person_id: string
  role: 'primary_suspect' | 'accomplice' | 'victim' | 'witness'
}

export const MOCK_INCIDENTS: KspIncident[] = [
  {
    id: "inc-001",
    case_number: "KSP-2026-1001",
    category: "cybercrime",
    description: "Multi-crore phishing scheme targeting retired government employees with fake pension scheme links.",
    location: "Koramangala 3rd Block",
    district: "Bengaluru Urban",
    police_station: "Koramangala PS",
    latitude: 12.9344,
    longitude: 77.6192,
    date_time: "2026-06-10T14:30:00Z",
    priority: "high",
    modus_operandi: "Bulk SMS broadcast with suspicious links impersonating SBI and Treasury department.",
    socio_economic_factors: { urbanization: "high", density: "dense", poverty_index: "low" },
    risk_score: 82.5
  },
  {
    id: "inc-002",
    case_number: "KSP-2026-1002",
    category: "narcotics",
    description: "Seizure of MDMA pills and synthetic drugs from a private warehouse near educational hub.",
    location: "Manipal County Road",
    district: "Bengaluru Urban",
    police_station: "Electronic City PS",
    latitude: 12.8406,
    longitude: 77.6753,
    date_time: "2026-06-12T23:15:00Z",
    priority: "urgent",
    modus_operandi: "Inter-state supply chain via private logistics couriers, distributed through student networks.",
    socio_economic_factors: { urbanization: "high", density: "moderate", poverty_index: "low" },
    risk_score: 95.0
  },
  {
    id: "inc-003",
    case_number: "KSP-2026-1003",
    category: "theft",
    description: "Night-time burglary at gold jewelry store. Safe cracked using specialized gas cutters.",
    location: "Giri Nagar 2nd Stage",
    district: "Mysuru",
    police_station: "Lashkar PS",
    latitude: 12.3112,
    longitude: 76.6548,
    date_time: "2026-06-11T03:00:00Z",
    priority: "high",
    modus_operandi: "CCTV cameras spray-painted with black paint, alarms disconnected, gas cutters used on lock.",
    socio_economic_factors: { urbanization: "medium", density: "moderate", poverty_index: "medium" },
    risk_score: 74.0
  },
  {
    id: "inc-004",
    case_number: "KSP-2026-1004",
    category: "assault",
    description: "Clash between two local factions during a commercial vehicle parking dispute near APMC yard.",
    location: "APMC Market Outer Ring Road",
    district: "Hubballi-Dharwad",
    police_station: "Hubli Town PS",
    latitude: 15.3524,
    longitude: 75.1381,
    date_time: "2026-06-13T09:45:00Z",
    priority: "medium",
    modus_operandi: "Spontaneous gathering, use of wooden logs and iron rods, damage to public property.",
    socio_economic_factors: { urbanization: "medium", density: "dense", poverty_index: "high" },
    risk_score: 55.0
  },
  {
    id: "inc-005",
    case_number: "KSP-2026-1005",
    category: "robbery",
    description: "Armed highway robbery. Gang intercepted cargo truck carrying electronics, held driver at knife point.",
    location: "NH-48 Border Checkpost",
    district: "Belagavi",
    police_station: "Nippani PS",
    latitude: 16.3995,
    longitude: 74.3855,
    date_time: "2026-06-09T01:30:00Z",
    priority: "urgent",
    modus_operandi: "Interception using a mock breakdown car blocking the lane, physical coercion, cargo hijacking.",
    socio_economic_factors: { urbanization: "low", density: "sparse", poverty_index: "high" },
    risk_score: 88.0
  },
  {
    id: "inc-006",
    case_number: "KSP-2026-1006",
    category: "narcotics",
    description: "Inshore fishing vessel intercepted smuggling brown sugar/heroin near coastal waters.",
    location: "Old Port Jetty Area",
    district: "Mangaluru",
    police_station: "Pandeshwar PS",
    latitude: 12.8623,
    longitude: 74.8386,
    date_time: "2026-06-08T02:00:00Z",
    priority: "urgent",
    modus_operandi: "Transport disguised as deep sea fishing trip, transfer at sea to small speedboats.",
    socio_economic_factors: { urbanization: "medium", density: "moderate", poverty_index: "medium" },
    risk_score: 91.2
  },
  {
    id: "inc-007",
    case_number: "KSP-2026-1007",
    category: "murder",
    description: "Foul play suspected in land-owner's demise. Body found in irrigation canal with head injuries.",
    location: "Sugar Mill Canal Road",
    district: "Mandya",
    police_station: "Maddur PS",
    latitude: 12.5852,
    longitude: 77.0436,
    date_time: "2026-06-07T21:00:00Z",
    priority: "urgent",
    modus_operandi: "Victim lured out under pretext of checking water pump, hit with blunt object, thrown in canal.",
    socio_economic_factors: { urbanization: "low", density: "sparse", poverty_index: "medium" },
    risk_score: 89.0
  },
  {
    id: "inc-008",
    case_number: "KSP-2026-1008",
    category: "cybercrime",
    description: "Fake SIM swap scam where users lost OTP access, resulting in bank account drains.",
    location: "Indiranagar 80 Feet Road",
    district: "Bengaluru Urban",
    police_station: "Indiranagar PS",
    latitude: 12.9719,
    longitude: 77.6412,
    date_time: "2026-06-06T11:00:00Z",
    priority: "high",
    modus_operandi: "Acquiring personal details via phishing, lodging fake lost-SIM report to telecom operator.",
    socio_economic_factors: { urbanization: "high", density: "dense", poverty_index: "low" },
    risk_score: 78.5
  },
  {
    id: "inc-009",
    case_number: "KSP-2026-1009",
    category: "theft",
    description: "Series of high-end car thefts. Vehicles unlocked using signal grabbers/rekey tools.",
    location: "Sadashivanagar 4th Cross",
    district: "Bengaluru Urban",
    police_station: "Sadashivanagar PS",
    latitude: 13.0068,
    longitude: 77.5802,
    date_time: "2026-06-11T23:30:00Z",
    priority: "high",
    modus_operandi: "RF signal spoofers scanning key fob lock signals, quick driving off with duplicate programming.",
    socio_economic_factors: { urbanization: "high", density: "dense", poverty_index: "low" },
    risk_score: 80.0
  },
  {
    id: "inc-010",
    case_number: "KSP-2026-1010",
    category: "theft",
    description: "House break-in during afternoon. Locked villa raided of silver articles and liquid cash.",
    location: "Vidyaranyapuram",
    district: "Mysuru",
    police_station: "Vidyaranyapuram PS",
    latitude: 12.2855,
    longitude: 76.6578,
    date_time: "2026-06-10T13:30:00Z",
    priority: "medium",
    modus_operandi: "Knocking door to ensure vacancy, picking latch lock using custom toolsets.",
    socio_economic_factors: { urbanization: "medium", density: "moderate", poverty_index: "medium" },
    risk_score: 62.0
  }
]

export const MOCK_PEOPLE: KspPerson[] = [
  {
    id: "per-001",
    name: "Ramesh J. (alias 'Tech Ramesh')",
    classification: "suspect",
    demographics: { age: 29, gender: "M", occupation: "Suspended IT Technician" }
  },
  {
    id: "per-002",
    name: "Vikram K. (alias 'Gold Vikram')",
    classification: "suspect",
    demographics: { age: 38, gender: "M", occupation: "Fabrication Welder" }
  },
  {
    id: "per-003",
    name: "Lokesh Gowda",
    classification: "suspect",
    demographics: { age: 42, gender: "M", occupation: "Real Estate Broker" }
  },
  {
    id: "per-004",
    name: "Pratap 'Pills' Shetty",
    classification: "suspect",
    demographics: { age: 31, gender: "M", occupation: "Gym Instructor" }
  },
  {
    id: "per-005",
    name: "Deepa Hegde",
    classification: "victim",
    demographics: { age: 67, gender: "F", occupation: "Retired School Principal" }
  },
  {
    id: "per-006",
    name: "Nagaraj Shenoy",
    classification: "victim",
    demographics: { age: 52, gender: "M", occupation: "Jewelry Store Owner" }
  },
  {
    id: "per-007",
    name: "Anand Swami",
    classification: "associate",
    demographics: { age: 26, gender: "M", occupation: "SIM Card Retailer" }
  }
]

export const MOCK_CONNECTIONS: KspConnection[] = [
  {
    id: "con-001",
    incident_id: "inc-001",
    person_id: "per-001",
    role: "primary_suspect"
  },
  {
    id: "con-002",
    incident_id: "inc-001",
    person_id: "per-005",
    role: "victim"
  },
  {
    id: "con-003",
    incident_id: "inc-001",
    person_id: "per-007",
    role: "accomplice" // Ramesh used Anand's SIM cards
  },
  {
    id: "con-004",
    incident_id: "inc-003",
    person_id: "per-002",
    role: "primary_suspect"
  },
  {
    id: "con-005",
    incident_id: "inc-003",
    person_id: "per-006",
    role: "victim"
  },
  {
    id: "con-006",
    incident_id: "inc-005",
    person_id: "per-002",
    role: "primary_suspect" // Vikram connected to gold heist AND highway robbery
  },
  {
    id: "con-007",
    incident_id: "inc-002",
    person_id: "per-004",
    role: "primary_suspect"
  },
  {
    id: "con-008",
    incident_id: "inc-007",
    person_id: "per-003",
    role: "primary_suspect"
  },
  {
    id: "con-009",
    incident_id: "inc-008",
    person_id: "per-001",
    role: "primary_suspect" // Ramesh connected to both cyber scams
  },
  {
    id: "con-010",
    incident_id: "inc-009",
    person_id: "per-002",
    role: "accomplice" // Vikram helped break into high end cars using welding tools
  }
]
