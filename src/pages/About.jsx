import React from 'react';
import { useNavigate } from 'react-router-dom';
import './About.css';

export default function About() {
  const navigate = useNavigate();

  return (
    <div className="sov-page about-page">
      <header className="sov-header">
        <div className="sov-header-brand">
          <img src="/logo.png" alt="PRAJA Logo" className="header-logo" />
          <span>PRAJA</span>
        </div>
        <nav className="sov-header-nav" aria-label="Primary">
          <button type="button" className="sov-nav-link" onClick={() => navigate('/')}>
            Back to Dashboard
          </button>
        </nav>
      </header>

      <main className="about-main">
        <section className="about-hero">
          <h1 className="about-title-big">INDIA INNOVATES 2026</h1>
          <h2 className="about-subtitle">Finalist Product — Civic Tech Hackathon, Delhi</h2>
        </section>

        <section className="about-content">
          <div className="about-info">
            <h2>About PRAJA</h2>
            <p>
              PRAJA is an AI-powered Citizen Grievance & Constituency Intelligence Platform.
              It operates as a comprehensive GrievanceOS designed to streamline communication 
              between citizens and the government.
            </p>
          </div>

          <div className="about-features">
            <h2>Core Features</h2>
            <ul>
              <li><strong>Omnichannel Intake:</strong> Submit grievances via WhatsApp, SMS, or the Web portal seamlessly.</li>
              <li><strong>AI-Powered Processing:</strong> Automatic translation, sentiment analysis, and smart classification (Category, Urgency, SLA) using Groq LLaMA models.</li>
              <li><strong>Smart Routing:</strong> Auto-assignments directly mapped to relevant departments, wards, and respective nodal officers.</li>
              <li><strong>SentinelPulse Heatmap:</strong> Geographical hotspot tracking and public mood sentiment alerts in real time.</li>
              <li><strong>Automated Workflow:</strong> Built-in resolution trails and automatic updates sent out to citizen's WhatsApp numbers.</li>
            </ul>
          </div>
        </section>
      </main>

      <footer className="sov-footer">
        <p className="sov-footer-copy">
          © {new Date().getFullYear()} Government of India. All rights reserved. PRAJA is a conceptual interface demonstration.
        </p>
      </footer>
    </div>
  );
}
