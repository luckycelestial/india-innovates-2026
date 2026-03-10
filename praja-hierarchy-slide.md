---
marp: true
theme: uncover
paginate: false
size: 16:9
backgroundColor: #ffffff
color: #111111
---

<style>
section {
  padding: 10px 18px 6px;
  font-family: 'Segoe UI', system-ui, sans-serif;
  background: #fff;
  color: #111;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
}
.slide-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 7px;
  border-bottom: 2px solid #111;
  width: 100%;
  padding-bottom: 5px;
}
.slide-header .htitle {
  font-size: 18px;
  font-weight: 800;
  color: #111;
}
.slide-header .hsub {
  font-size: 9px;
  color: #555;
  margin-left: 6px;
  align-self: flex-end;
  padding-bottom: 2px;
}
.hier {
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
}
.h-row {
  display: flex;
  align-items: stretch;
  gap: 0;
  width: 100%;
}
.arr {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #333;
  flex-shrink: 0;
  width: 18px;
}
.row-connector {
  display: flex;
  width: 100%;
  height: 8px;
  position: relative;
}
.row-connector::before {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  width: 10px;
  height: 100%;
  border-right: 2px solid #555;
  border-bottom: 2px solid #555;
  border-bottom-right-radius: 4px;
}
.row-connector-l {
  display: flex;
  width: 100%;
  height: 8px;
  position: relative;
}
.row-connector-l::before {
  content: '';
  position: absolute;
  left: 0;
  top: -8px;
  width: 10px;
  height: 100%;
  border-left: 2px solid #555;
  border-bottom: 2px solid #555;
  border-bottom-left-radius: 4px;
}
.cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.blk {
  border: 1.5px solid #333;
  border-radius: 5px;
  padding: 4px 7px;
  background: #fff;
  flex: 1;
}
.blk .tl {
  font-size: 6px;
  font-weight: 700;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: #666;
  margin-bottom: 1px;
}
.blk .tt {
  font-size: 10px;
  font-weight: 700;
  color: #111;
  margin-bottom: 1px;
  line-height: 1.2;
}
.blk .ts {
  font-size: 6.5px;
  color: #555;
  margin-bottom: 2px;
  line-height: 1.2;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}
.t {
  font-size: 5.5px;
  font-weight: 600;
  padding: 1px 4px;
  border-radius: 3px;
  border: 1px solid #888;
  color: #333;
  background: #efefef;
  white-space: nowrap;
}
.b1  { border-top: 3px solid #111; }
.b2  { border-top: 3px solid #222; }
.b3  { border-top: 3px solid #333; }
.b4  { border-top: 3px solid #444; }
.b5  { border-top: 3px solid #555; }
.b6  { border-top: 3px solid #666; }
.b7  { border-top: 3px solid #777; }
.b8  { border-top: 3px solid #888; }
.b9  { border-top: 3px solid #999; }
.b10 { border-top: 3px solid #aaa; }
.b11 { border-top: 3px solid #222; }
.bcit {
  border: 2px solid #111;
  border-top: 4px solid #111;
  background: #f5f5f5;
}
.bcit .tt { font-size: 11px; }
.legend-bar {
  margin-top: 5px;
  display: flex;
  gap: 14px;
  border-top: 1px solid #ccc;
  padding-top: 4px;
  width: 100%;
  justify-content: center;
}
.legend-bar .li {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 7px;
  color: #444;
}
.legend-bar .ld {
  width: 8px; height: 8px; border-radius: 2px;
  border: 1px solid #555;
  background: #e0e0e0;
  flex-shrink: 0;
}
</style>

<div class="slide-header">
  <span style="font-size:20px">🪷</span>
  <span class="htitle">PRAJA — Indian Political User Hierarchy</span>
  <span class="hsub">Every person who will interact with PRAJA — from the President to the Citizen</span>
</div>

<div class="hier">

  <!-- ROW 1: Tiers 1 → 6 (left to right) -->
  <div class="h-row">

    <div class="cell">
      <div class="blk b1">
        <div class="tl">Tier 1 · Head of State</div>
        <div class="tt">🏛️ President of India</div>
        <div class="ts">Rashtrapati Bhavan</div>
        <div class="tags"><span class="t">SentinelPulse</span> <span class="t">NayakAI</span></div>
      </div>
    </div>
    <div class="arr">→</div>

    <div class="cell">
      <div class="blk b2">
        <div class="tl">Tier 2 · Head of Govt</div>
        <div class="tt">🇮🇳 Prime Minister</div>
        <div class="ts">PMO, New Delhi</div>
        <div class="tags"><span class="t">NayakAI — Policy</span> <span class="t">SentinelPulse</span> <span class="t">NayakAI — Speech</span></div>
      </div>
    </div>
    <div class="arr">→</div>

    <div class="cell">
      <div class="blk b3">
        <div class="tl">Tier 3 · Union Council</div>
        <div class="tt">⚖️ Cabinet Ministers</div>
        <div class="ts">Finance, Home, Health…</div>
        <div class="tags"><span class="t">NayakAI — Docs</span> <span class="t">NayakAI — Schemes</span> <span class="t">SentinelPulse</span></div>
      </div>
    </div>
    <div class="arr">→</div>

    <div class="cell">
      <div class="blk b4" style="margin-bottom:2px">
        <div class="tl">Tier 4a · Rajya Sabha</div>
        <div class="tt">🏠 RS Members</div>
        <div class="ts">States & UTs Reps</div>
        <div class="tags"><span class="t">NayakAI</span> <span class="t">SentinelPulse</span></div>
      </div>
      <div class="blk b4">
        <div class="tl">Tier 4b · Lok Sabha</div>
        <div class="tt">🏛️ LS Members</div>
        <div class="ts">Constituency Reps</div>
        <div class="tags"><span class="t">NayakAI</span> <span class="t">GrievanceOS</span></div>
      </div>
    </div>
    <div class="arr">→</div>

    <div class="cell">
      <div class="blk b5">
        <div class="tl">Tier 5 · State Head</div>
        <div class="tt">🏰 Governor</div>
        <div class="ts">Raj Bhavan</div>
        <div class="tags"><span class="t">SentinelPulse</span> <span class="t">NayakAI</span></div>
      </div>
    </div>
    <div class="arr">→</div>

    <div class="cell">
      <div class="blk b6">
        <div class="tl">Tier 6 · State Govt Head</div>
        <div class="tt">🌟 Chief Minister</div>
        <div class="ts">Primary NayakAI User</div>
        <div class="tags"><span class="t">NayakAI — Brief</span> <span class="t">NayakAI — Speech</span> <span class="t">SentinelPulse</span> <span class="t">GrievanceOS</span></div>
      </div>
    </div>

  </div>

  <!-- U-turn connector -->
  <div class="row-connector"></div>
  <div class="row-connector-l"></div>

  <!-- ROW 2: Tiers 7 → Citizens (left to right) -->
  <div class="h-row">

    <div class="cell">
      <div class="blk b7" style="margin-bottom:2px">
        <div class="tl">Tier 7a · State Cabinet</div>
        <div class="tt">📋 State Ministers</div>
        <div class="ts">PWD, Health, Education</div>
        <div class="tags"><span class="t">NayakAI</span> <span class="t">GrievanceOS — Dept</span></div>
      </div>
      <div class="blk b7">
        <div class="tl">Tier 7b · Legislature</div>
        <div class="tt">🗳️ MLA / MLC</div>
        <div class="ts">Vidhan Sabha / Parishad</div>
        <div class="tags"><span class="t">NayakAI</span> <span class="t">GrievanceOS</span></div>
      </div>
    </div>
    <div class="arr">→</div>

    <div class="cell">
      <div class="blk b8" style="margin-bottom:2px">
        <div class="tl">Tier 8a · District Admin</div>
        <div class="tt">🏢 Collector / DM</div>
        <div class="ts">IAS — District Executive</div>
        <div class="tags"><span class="t">GrievanceOS — Officer</span> <span class="t">SentinelPulse</span></div>
      </div>
      <div class="blk b8" style="margin-bottom:2px">
        <div class="tl">Tier 8b · Urban Body</div>
        <div class="tt">🏙️ Mayor</div>
        <div class="ts">Municipal Corp Head</div>
        <div class="tags"><span class="t">NayakAI</span> <span class="t">GrievanceOS — City</span></div>
      </div>
      <div class="blk b8">
        <div class="tl">Tier 8c · Rural Body</div>
        <div class="tt">🌾 Zila Parishad Chair</div>
        <div class="ts">District Rural Head</div>
        <div class="tags"><span class="t">GrievanceOS</span> <span class="t">SentinelPulse</span></div>
      </div>
    </div>
    <div class="arr">→</div>

    <div class="cell">
      <div class="blk b9" style="margin-bottom:2px">
        <div class="tl">Tier 9a · Urban Admin</div>
        <div class="tt">🗂️ Municipal Commissioner</div>
        <div class="ts">ULB Executive Officer</div>
        <div class="tags"><span class="t">GrievanceOS — Officer</span></div>
      </div>
      <div class="blk b9" style="margin-bottom:2px">
        <div class="tl">Tier 9b · Deputy Mayor</div>
        <div class="tt">🏛️ Deputy Mayor</div>
        <div class="ts">Urban City Governance</div>
        <div class="tags"><span class="t">NayakAI</span> <span class="t">GrievanceOS</span></div>
      </div>
      <div class="blk b9">
        <div class="tl">Tier 9c · Rural Block</div>
        <div class="tt">🌻 Panchayat Samiti</div>
        <div class="ts">Intermediate Panchayat</div>
        <div class="tags"><span class="t">GrievanceOS</span></div>
      </div>
    </div>
    <div class="arr">→</div>

    <div class="cell">
      <div class="blk b10" style="margin-bottom:2px">
        <div class="tl">Tier 10a · Dept Officers</div>
        <div class="tt">👔 Govt Officers</div>
        <div class="ts">PWD / Health / Revenue</div>
        <div class="tags"><span class="t">GrievanceOS — Resolve</span></div>
      </div>
      <div class="blk b10">
        <div class="tl">Tier 10b · Village Level</div>
        <div class="tt">🌿 Sarpanch</div>
        <div class="ts">Village Pradhan / Mukhiya</div>
        <div class="tags"><span class="t">GrievanceOS</span> <span class="t">SentinelPulse</span></div>
      </div>
    </div>
    <div class="arr">→</div>

    <div class="cell">
      <div class="blk b11">
        <div class="tl">Tier 11 · Lowest Elected</div>
        <div class="tt">🪑 Ward Councillor / Panch</div>
        <div class="ts">Closest rep to citizens</div>
        <div class="tags"><span class="t">GrievanceOS — Ward</span> <span class="t">SentinelPulse</span> <span class="t">NayakAI</span></div>
      </div>
    </div>
    <div class="arr">→</div>

    <div class="cell">
      <div class="blk bcit">
        <div class="tl">All Indian Citizens — Ultimate Stakeholder</div>
        <div class="tt">🇮🇳 Citizens (Nagarik)</div>
        <div class="ts">Farmers · Students · Workers · Business · Women · Youth</div>
        <div class="tags"><span class="t">GrievanceOS — File</span> <span class="t">WhatsApp Bot</span> <span class="t">Track Status</span></div>
      </div>
    </div>

  </div>

</div>

<div class="legend-bar">
  <div class="li"><div class="ld"></div> GrievanceOS — Complaints & Resolution</div>
  <div class="li"><div class="ld"></div> NayakAI — AI Governance Assistant</div>
  <div class="li"><div class="ld"></div> SentinelPulse — Sentiment Heatmap</div>
  <div class="li"><div class="ld"></div> Officer Panel — Grievance Management</div>
</div>

