export function normalizeDistrictName(name: string): string {
  const normalized = name.toLowerCase().trim()
  if (normalized === 'bangalore' || normalized === 'bangalore urban' || normalized === 'bengaluru urban') return 'Bengaluru Urban'
  if (normalized === 'belgaum' || normalized === 'belagavi') return 'Belagavi'
  if (normalized === 'gulbarga' || normalized === 'kalaburagi') return 'Kalaburagi'
  if (normalized === 'mysore' || normalized === 'mysuru') return 'Mysuru'
  if (normalized === 'dharwad' || normalized === 'hubli-dharwad' || normalized === 'hubballi-dharwad') return 'Dharwad'
  if (normalized === 'dakshina kannada' || normalized === 'mangalore' || normalized === 'mangaluru') return 'Mangaluru'
  if (normalized === 'bellary' || normalized === 'ballari') return 'Ballari'
  if (normalized === 'bijapur' || normalized === 'vijayapura') return 'Vijayapura'
  if (normalized === 'chamrajnagar' || normalized === 'chamarajanagar') return 'Chamarajanagar'
  if (normalized === 'chikmagalur' || normalized === 'chikkamagaluru') return 'Chikkamagaluru'
  if (normalized === 'shimoga' || normalized === 'shivamogga') return 'Shivamogga'
  if (normalized === 'tumkur' || normalized === 'tumakuru') return 'Tumakuru'
  if (normalized === 'bangalore rural' || normalized === 'bengaluru rural') return 'Bengaluru Rural'
  if (normalized === 'chikkaballapura') return 'Chikkaballapura'
  if (normalized === 'bagalkot') return 'Bagalkot'
  if (normalized === 'ramanagara') return 'Ramanagara'
  if (normalized === 'bidar') return 'Bidar'
  if (normalized === 'chitradurga') return 'Chitradurga'
  if (normalized === 'davanagere') return 'Davanagere'
  if (normalized === 'gadag') return 'Gadag'
  if (normalized === 'hassan') return 'Hassan'
  if (normalized === 'haveri') return 'Haveri'
  if (normalized === 'kodagu') return 'Kodagu'
  if (normalized === 'koppal') return 'Koppal'
  if (normalized === 'mandya') return 'Mandya'
  if (normalized === 'raichur') return 'Raichur'
  if (normalized === 'udupi') return 'Udupi'
  if (normalized === 'uttara kannada') return 'Uttara Kannada'
  if (normalized === 'kolar') return 'Kolar'
  if (normalized === 'yadgir') return 'Yadgir'
  return name.charAt(0).toUpperCase() + name.slice(1)
}

export function getComplaintDistrict(location: string): string {
  const loc = (location || '').toLowerCase().trim()
  const districtNames = [
    'mysuru', 'mysore', 'belagavi', 'belgaum', 'mangaluru', 'mangalore', 'mandya', 
    'kalaburagi', 'gulbarga', 'bagalkot', 'ramanagara', 'bidar', 'chitradurga', 
    'davanagere', 'gadag', 'hassan', 'haveri', 'kodagu', 'koppal', 
    'raichur', 'udupi', 'uttara kannada', 'kolar', 'yadgir', 
    'bengaluru rural', 'bangalore rural', 'chikkaballapura', 'bellary', 'ballari', 
    'bijapur', 'vijayapura', 'chamrajnagar', 'chamarajanagar', 
    'chikmagalur', 'chikkamagaluru', 'shimoga', 'shivamogga', 
    'tumkur', 'tumakuru', 'dharwad'
  ]
  for (const name of districtNames) {
    if (loc.includes(name)) {
      return normalizeDistrictName(name)
    }
  }
  return 'Bengaluru Urban'
}
