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
  },
  {
    id: "inc-011",
    case_number: "KSP-2026-1011",
    category: "cybercrime",
    description: "Ransomware attack on local healthcare hospital system. Patient records locked.",
    location: "Malleshwaram 5th Temple Road",
    district: "Bengaluru Urban",
    police_station: "Malleshwaram PS",
    latitude: 12.9961,
    longitude: 77.5701,
    date_time: "2026-06-14T08:00:00Z",
    priority: "urgent",
    modus_operandi: "Phishing mail attachment executing script to encrypt local servers, demanding BTC.",
    socio_economic_factors: { urbanization: "high", density: "dense", poverty_index: "low" },
    risk_score: 92.0
  },
  {
    id: "inc-012",
    case_number: "KSP-2026-1012",
    category: "narcotics",
    description: "Marijuana farm raid in rural outskirts. Seizure of 120kg cultivated cannabis.",
    location: "Devanahalli Border Farm",
    district: "Bengaluru Rural",
    police_station: "Devanahalli PS",
    latitude: 13.2483,
    longitude: 77.7136,
    date_time: "2026-06-15T06:00:00Z",
    priority: "high",
    modus_operandi: "Disguising commercial farm area inside eucalyptus plantation, local distribution.",
    socio_economic_factors: { urbanization: "low", density: "sparse", poverty_index: "medium" },
    risk_score: 85.0
  },
  {
    id: "inc-013",
    case_number: "KSP-2026-1013",
    category: "theft",
    description: "Bank ATM cash loading chest theft. Security guards drugged.",
    location: "Yelahanka New Town",
    district: "Bengaluru Urban",
    police_station: "Yelahanka PS",
    latitude: 13.0984,
    longitude: 77.5962,
    date_time: "2026-06-16T02:30:00Z",
    priority: "urgent",
    modus_operandi: "Lacing night guard tea with sleeping sedatives, duplicate key to unlock safe drawer.",
    socio_economic_factors: { urbanization: "high", density: "dense", poverty_index: "low" },
    risk_score: 89.5
  },
  {
    id: "inc-014",
    case_number: "KSP-2026-1014",
    category: "assault",
    description: "Tavern brawl leading to severe injuries. Local gang members involved.",
    location: "Gandhi Bazaar Road",
    district: "Bengaluru Urban",
    police_station: "Basavanagudi PS",
    latitude: 12.9423,
    longitude: 77.5731,
    date_time: "2026-06-17T22:30:00Z",
    priority: "medium",
    modus_operandi: "Argument over billing escalate, broken bottles and weapons used in public layout.",
    socio_economic_factors: { urbanization: "high", density: "moderate", poverty_index: "medium" },
    risk_score: 68.0
  },
  {
    id: "inc-015",
    case_number: "KSP-2026-1015",
    category: "robbery",
    description: "Chain snatching spree in morning. Two perpetrators on motorbikes target joggers.",
    location: "Jayanagar 4th T Block",
    district: "Bengaluru Urban",
    police_station: "Jayanagar PS",
    latitude: 12.9254,
    longitude: 77.5913,
    date_time: "2026-06-18T06:45:00Z",
    priority: "high",
    modus_operandi: "Stolen motorcycle with obscured number plates, speed up behind victims on quiet street.",
    socio_economic_factors: { urbanization: "high", density: "dense", poverty_index: "low" },
    risk_score: 75.2
  },
  {
    id: "inc-016",
    case_number: "KSP-2026-1016",
    category: "theft",
    description: "Illegal sand mining and transport operations raided near river bed.",
    location: "Krishna River Basin Area",
    district: "Kalaburagi",
    police_station: "Afzalpur PS",
    latitude: 17.3297,
    longitude: 76.8343,
    date_time: "2026-06-19T04:00:00Z",
    priority: "high",
    modus_operandi: "Nocturnal extraction using heavy excavators, transport using unregistered tipper trucks.",
    socio_economic_factors: { urbanization: "low", density: "sparse", poverty_index: "high" },
    risk_score: 72.0
  },
  {
    id: "inc-017",
    case_number: "KSP-2026-1017",
    category: "assault",
    description: "Group clash over water sharing from irrigation canal in agricultural fields.",
    location: "Mudhol Taluk Fields",
    district: "Bagalkot",
    police_station: "Mudhol PS",
    latitude: 16.1817,
    longitude: 75.6958,
    date_time: "2026-06-19T10:30:00Z",
    priority: "medium",
    modus_operandi: "Heated argument escalating to physical assault with farming tools.",
    socio_economic_factors: { urbanization: "low", density: "sparse", poverty_index: "medium" },
    risk_score: 58.0
  },
  {
    id: "inc-018",
    case_number: "KSP-2026-1018",
    category: "robbery",
    description: "Pilgrims robbed of gold chain and cash near hill temple pathway.",
    location: "Ramadevara Betta Trail",
    district: "Ramanagara",
    police_station: "Ramanagara Town PS",
    latitude: 12.7209,
    longitude: 77.2784,
    date_time: "2026-06-18T16:00:00Z",
    priority: "high",
    modus_operandi: "Threatening victims with pocket knives in isolated forest stretch.",
    socio_economic_factors: { urbanization: "low", density: "sparse", poverty_index: "medium" },
    risk_score: 76.0
  },
  {
    id: "inc-019",
    case_number: "KSP-2026-1019",
    category: "theft",
    description: "Iron ore consignment theft from railway siding loading yard.",
    location: "Hospet Siding Junction",
    district: "Ballari",
    police_station: "Hospet Town PS",
    latitude: 15.1394,
    longitude: 76.9214,
    date_time: "2026-06-17T01:45:00Z",
    priority: "high",
    modus_operandi: "Bypassing security gate during shift change, loading trucks with pre-weighed ore.",
    socio_economic_factors: { urbanization: "medium", density: "moderate", poverty_index: "medium" },
    risk_score: 79.2
  },
  {
    id: "inc-020",
    case_number: "KSP-2026-1020",
    category: "assault",
    description: "Altercation at historical fort site between local vendors and tourists.",
    location: "Bidar Fort Entrance",
    district: "Bidar",
    police_station: "Bidar Town PS",
    latitude: 17.9104,
    longitude: 77.5199,
    date_time: "2026-06-16T15:30:00Z",
    priority: "low",
    modus_operandi: "Verbal dispute over parking charges leading to minor scuffle.",
    socio_economic_factors: { urbanization: "medium", density: "moderate", poverty_index: "medium" },
    risk_score: 42.0
  },
  {
    id: "inc-021",
    case_number: "KSP-2026-1021",
    category: "theft",
    description: "Ancient idol theft attempt at historical temple monument.",
    location: "Gol Gumbaz Outer Ring",
    district: "Vijayapura",
    police_station: "Gol Gumbaz PS",
    latitude: 16.8302,
    longitude: 75.7100,
    date_time: "2026-06-15T02:00:00Z",
    priority: "urgent",
    modus_operandi: "Sneaking in past perimeter wall during power cut, attempting to detach bronze sculpture.",
    socio_economic_factors: { urbanization: "medium", density: "moderate", poverty_index: "high" },
    risk_score: 87.0
  },
  {
    id: "inc-022",
    case_number: "KSP-2026-1022",
    category: "narcotics",
    description: "Illicit forest liquor distillery raided in tiger reserve buffer zone.",
    location: "Bandipur Forest Fringe",
    district: "Chamarajanagar",
    police_station: "Gundlupet PS",
    latitude: 11.9261,
    longitude: 76.9402,
    date_time: "2026-06-14T05:00:00Z",
    priority: "high",
    modus_operandi: "Setting up barrels and brewing equipment near water stream hidden by dense bamboo.",
    socio_economic_factors: { urbanization: "low", density: "sparse", poverty_index: "high" },
    risk_score: 80.5
  },
  {
    id: "inc-023",
    case_number: "KSP-2026-1023",
    category: "theft",
    description: "High-quality coffee bean bags stolen from estate warehouse storage.",
    location: "Mullinagiri Estate Road",
    district: "Chikkamagaluru",
    police_station: "Chikkamagalur Rural PS",
    latitude: 13.3161,
    longitude: 75.7720,
    date_time: "2026-06-13T03:30:00Z",
    priority: "medium",
    modus_operandi: "Cutting window grill of estate storage room, loading bags onto pick-up vehicle.",
    socio_economic_factors: { urbanization: "low", density: "sparse", poverty_index: "low" },
    risk_score: 63.0
  },
  {
    id: "inc-024",
    case_number: "KSP-2026-1024",
    category: "robbery",
    description: "Highway robbery targeting gold merchant transit vehicle.",
    location: "National Highway 48 Bypass",
    district: "Chitradurga",
    police_station: "Chitradurga Town PS",
    latitude: 14.2251,
    longitude: 76.3980,
    date_time: "2026-06-12T22:00:00Z",
    priority: "urgent",
    modus_operandi: "Overtaking merchant car, forcing it to stop, threatening with weapons and looting trunk.",
    socio_economic_factors: { urbanization: "medium", density: "moderate", poverty_index: "medium" },
    risk_score: 91.0
  },
  {
    id: "inc-025",
    case_number: "KSP-2026-1025",
    category: "cybercrime",
    description: "Online investment portal fraud targeting cotton farmers with fake high-yield schemes.",
    location: "Harihar Road Cotton Market",
    district: "Davanagere",
    police_station: "Harihar PS",
    latitude: 14.4644,
    longitude: 75.9218,
    date_time: "2026-06-11T11:00:00Z",
    priority: "high",
    modus_operandi: "Creating fake WhatsApp groups and mobile applications promising 50% weekly return on crop trade.",
    socio_economic_factors: { urbanization: "medium", density: "moderate", poverty_index: "medium" },
    risk_score: 77.8
  },
  {
    id: "inc-026",
    case_number: "KSP-2026-1026",
    category: "theft",
    description: "Wind turbine copper cable theft at clean energy farm wind site.",
    location: "Kappatagudda Hills Wind Zone" ,
    district: "Gadag",
    police_station: "Gadag Rural PS",
    latitude: 15.4292,
    longitude: 75.6268,
    date_time: "2026-06-10T02:30:00Z",
    priority: "high",
    modus_operandi: "Climbing windmill towers, cutting earthing copper tapes and heavy cables using insulated shears.",
    socio_economic_factors: { urbanization: "low", density: "sparse", poverty_index: "medium" },
    risk_score: 73.5
  },
  {
    id: "inc-027",
    case_number: "KSP-2026-1027",
    category: "assault",
    description: "Violent clash between two neighboring farmer families over border fence placement.",
    location: "Alur Taluk Village Road",
    district: "Hassan",
    police_station: "Alur PS",
    latitude: 13.0072,
    longitude: 76.1026,
    date_time: "2026-06-09T08:30:00Z",
    priority: "medium",
    modus_operandi: "Removing boundary stones, escalating to physical assault with wooden staves.",
    socio_economic_factors: { urbanization: "low", density: "sparse", poverty_index: "medium" },
    risk_score: 61.2
  },
  {
    id: "inc-028",
    case_number: "KSP-2026-1028",
    category: "theft",
    description: "Warehouse theft of pesticide and high-grade seed bags during weekly market day.",
    location: "Ranebennur APMC Road",
    district: "Haveri",
    police_station: "Ranebennur Town PS",
    latitude: 14.7937,
    longitude: 75.4055,
    date_time: "2026-06-08T18:15:00Z",
    priority: "medium",
    modus_operandi: "Breaking lock using iron crowbars while estate security was away at market.",
    socio_economic_factors: { urbanization: "medium", density: "moderate", poverty_index: "high" },
    risk_score: 66.0
  },
  {
    id: "inc-029",
    case_number: "KSP-2026-1029",
    category: "theft",
    description: "Sandalwood tree poaching in private coffee estate plantation.",
    location: "Madikeri Estate Fringe",
    district: "Kodagu",
    police_station: "Madikeri Town PS",
    latitude: 12.3375,
    longitude: 75.8069,
    date_time: "2026-06-07T00:45:00Z",
    priority: "high",
    modus_operandi: "Cutting mature sandalwood trees with silent electric chainsaws, transporting in customized SUV.",
    socio_economic_factors: { urbanization: "low", density: "sparse", poverty_index: "low" },
    risk_score: 75.0
  },
  {
    id: "inc-030",
    case_number: "KSP-2026-1030",
    category: "robbery",
    description: "Robbery of gold ornaments from remote farmhouse occupants.",
    location: "Nandi Hills Foothills Road",
    district: "Chikkaballapura",
    police_station: "Chikkaballapur PS",
    latitude: 13.4354,
    longitude: 77.7277,
    date_time: "2026-06-06T23:00:00Z",
    priority: "urgent",
    modus_operandi: "Forcing entry through back door, binding residents, ransacking cabinets for jewelry.",
    socio_economic_factors: { urbanization: "low", density: "sparse", poverty_index: "medium" },
    risk_score: 89.2
  },
  {
    id: "inc-031",
    case_number: "KSP-2026-1031",
    category: "theft",
    description: "Ancient artifacts and antique temple bells stolen from village temple shrine.",
    location: "Kanakagiri Temple Compound",
    district: "Koppal",
    police_station: "Kanakagiri PS",
    latitude: 15.3468,
    longitude: 76.1554,
    date_time: "2026-06-05T01:30:00Z",
    priority: "high",
    modus_operandi: "Scaling low temple walls, breaking door lock with heavy hammers, loading idols onto truck.",
    socio_economic_factors: { urbanization: "low", density: "sparse", poverty_index: "high" },
    risk_score: 78.0
  },
  {
    id: "inc-032",
    case_number: "KSP-2026-1032",
    category: "assault",
    description: "Clash between two commercial transport groups over interstate route permits.",
    location: "Raichur Bus Stand Outer",
    district: "Raichur",
    police_station: "Raichur Central PS",
    latitude: 16.2120,
    longitude: 77.3556,
    date_time: "2026-06-04T12:00:00Z",
    priority: "medium",
    modus_operandi: "Fist fight and stone pelting at ticket counters over timing overlaps.",
    socio_economic_factors: { urbanization: "medium", density: "dense", poverty_index: "high" },
    risk_score: 64.5
  },
  {
    id: "inc-033",
    case_number: "KSP-2026-1033",
    category: "theft",
    description: "Heavy earthmover spare parts stolen from government warehouse depot.",
    location: "Sagar Road PWD Yard",
    district: "Shivamogga",
    police_station: "Shimoga Town PS",
    latitude: 13.9299,
    longitude: 75.5681,
    date_time: "2026-06-03T23:45:00Z",
    priority: "medium",
    modus_operandi: "Lurking in dark spots of yard, detaching expensive hydraulic pumps and batteries.",
    socio_economic_factors: { urbanization: "medium", density: "moderate", poverty_index: "medium" },
    risk_score: 62.2
  },
  {
    id: "inc-034",
    case_number: "KSP-2026-1034",
    category: "cybercrime",
    description: "Identity theft and OTP fraud targeting rural cooperative bank customers.",
    location: "Tiptur Road Market Area",
    district: "Tumakuru",
    police_station: "Tiptur PS",
    latitude: 13.3379,
    longitude: 77.1173,
    date_time: "2026-06-02T10:00:00Z",
    priority: "high",
    modus_operandi: "Impersonating bank managers over phone, gathering personal credentials and triggering transfers.",
    socio_economic_factors: { urbanization: "medium", density: "moderate", poverty_index: "medium" },
    risk_score: 79.5
  },
  {
    id: "inc-035",
    case_number: "KSP-2026-1035",
    category: "narcotics",
    description: "Seizure of banned drugs and illegal pharmaceutical products from a chemist warehouse.",
    location: "Manipal University Zone",
    district: "Udupi",
    police_station: "Manipal PS",
    latitude: 13.3409,
    longitude: 74.7421,
    date_time: "2026-06-01T21:30:00Z",
    priority: "high",
    modus_operandi: "Under-the-counter sales of prescription drugs to local student groups without valid licenses.",
    socio_economic_factors: { urbanization: "high", density: "dense", poverty_index: "low" },
    risk_score: 86.8
  },
  {
    id: "inc-036",
    case_number: "KSP-2026-1036",
    category: "theft",
    description: "Illegal forest timber cutting and smuggling operation intercepted by forest guards.",
    location: "Dandeli Forest Buffer",
    district: "Uttara Kannada",
    police_station: "Dandeli PS",
    latitude: 14.6219,
    longitude: 74.6738,
    date_time: "2026-05-31T03:00:00Z",
    priority: "high",
    modus_operandi: "Logging teak trees under forest cover, loading onto trucks disguised as firewood consignments.",
    socio_economic_factors: { urbanization: "low", density: "sparse", poverty_index: "medium" },
    risk_score: 82.0
  },
  {
    id: "inc-037",
    case_number: "KSP-2026-1037",
    category: "theft",
    description: "Theft of gold-bearing ore dust from closed mining dump site perimeter.",
    location: "KGF Mine Dump Area",
    district: "Kolar",
    police_station: "KGF PS",
    latitude: 13.1367,
    longitude: 78.1291,
    date_time: "2026-05-30T01:00:00Z",
    priority: "medium",
    modus_operandi: "Sneaking in with plastic sacks to dig dump material, transport to local illegal gold extractor.",
    socio_economic_factors: { urbanization: "medium", density: "moderate", poverty_index: "high" },
    risk_score: 65.0
  },
  {
    id: "inc-038",
    case_number: "KSP-2026-1038",
    category: "assault",
    description: "Clash between village groups during local temple festival procession.",
    location: "Shahpur Road Festival Grounds",
    district: "Yadgir",
    police_station: "Shahpur PS",
    latitude: 16.7667,
    longitude: 77.1377,
    date_time: "2026-05-29T19:30:00Z",
    priority: "medium",
    modus_operandi: "Argument over drum beat order escalating to stone pelting and physical fight.",
    socio_economic_factors: { urbanization: "low", density: "sparse", poverty_index: "high" },
    risk_score: 60.5
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
  },
  {
    id: "per-008",
    name: "Sanjay Kumar (alias 'Dealer Sanjay')",
    classification: "suspect",
    demographics: { age: 34, gender: "M", occupation: "Logistics Manager" }
  },
  {
    id: "per-009",
    name: "Kiran R. (alias 'Key Kiran')",
    classification: "suspect",
    demographics: { age: 27, gender: "M", occupation: "Automobile Locksmith" }
  },
  {
    id: "per-010",
    name: "Sunil 'Cyber' Reddy",
    classification: "suspect",
    demographics: { age: 33, gender: "M", occupation: "Software Developer" }
  },
  {
    id: "per-011",
    name: "Guru Murthy (alias 'Don Guru')",
    classification: "suspect",
    demographics: { age: 49, gender: "M", occupation: "Scrap Dealer" }
  },
  {
    id: "per-012",
    name: "Anitha K.",
    classification: "suspect",
    demographics: { age: 28, gender: "F", occupation: "Data Entry Operator" }
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
    role: "accomplice"
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
    role: "primary_suspect"
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
    role: "primary_suspect"
  },
  {
    id: "con-010",
    incident_id: "inc-009",
    person_id: "per-002",
    role: "accomplice"
  },
  {
    id: "con-011",
    incident_id: "inc-002",
    person_id: "per-008",
    role: "accomplice"
  },
  {
    id: "con-012",
    incident_id: "inc-012",
    person_id: "per-008",
    role: "primary_suspect"
  },
  {
    id: "con-013",
    incident_id: "inc-009",
    person_id: "per-009",
    role: "primary_suspect"
  },
  {
    id: "con-014",
    incident_id: "inc-013",
    person_id: "per-009",
    role: "primary_suspect"
  },
  {
    id: "con-015",
    incident_id: "inc-011",
    person_id: "per-010",
    role: "primary_suspect"
  },
  {
    id: "con-016",
    incident_id: "inc-003",
    person_id: "per-011",
    role: "accomplice"
  },
  {
    id: "con-017",
    incident_id: "inc-001",
    person_id: "per-012",
    role: "accomplice"
  },
  {
    id: "con-018",
    incident_id: "inc-011",
    person_id: "per-012",
    role: "accomplice"
  }
]
