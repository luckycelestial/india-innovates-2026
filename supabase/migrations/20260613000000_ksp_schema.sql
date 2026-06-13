-- Create KSP database schema
CREATE TABLE IF NOT EXISTS ksp_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number VARCHAR(50) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL, -- e.g., theft, assault, robbery, cybercrime, narcotics, murder, etc.
    description TEXT NOT NULL,
    location VARCHAR(255) NOT NULL,
    district VARCHAR(100) NOT NULL,
    police_station VARCHAR(100) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    date_time TIMESTAMP WITH TIME ZONE NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium', -- low, medium, high, urgent
    modus_operandi TEXT NOT NULL,
    socio_economic_factors JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g., {urbanization: 'high', population_density: 'dense', poverty_index: 'low'}
    risk_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ksp_people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    classification VARCHAR(50) NOT NULL, -- suspect, victim, associate
    demographics JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g., {age: 32, gender: 'M', occupation: 'Unemployed'}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ksp_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID REFERENCES ksp_incidents(id) ON DELETE CASCADE,
    person_id UUID REFERENCES ksp_people(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL, -- e.g., primary_suspect, accomplice, victim, witness
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices for fast geospatial and spatiotemporal analytics
CREATE INDEX IF NOT EXISTS idx_ksp_incidents_district ON ksp_incidents(district);
CREATE INDEX IF NOT EXISTS idx_ksp_incidents_category ON ksp_incidents(category);
CREATE INDEX IF NOT EXISTS idx_ksp_incidents_date_time ON ksp_incidents(date_time);
CREATE INDEX IF NOT EXISTS idx_ksp_incidents_coords ON ksp_incidents(latitude, longitude);
