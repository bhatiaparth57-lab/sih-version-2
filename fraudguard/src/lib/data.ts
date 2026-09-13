// =====================================================================
// FRAUDGUARD — Synthetic MPLADS demo data
// ⚠️ DEMO ENVIRONMENT — All data below is synthetic / fabricated for
// demonstration purposes only. It does NOT represent real government data.
// =====================================================================

export type Risk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type VerifyStatus = 'Verified' | 'Pending' | 'Field Visit' | 'Failed';

export interface Project {
  id: string;
  name: string;
  state: string;
  district: string;
  constituency: string;
  type: string;
  vendor: string;
  allocated: number; // in lakhs
  spent: number;
  risk: Risk;
  riskScore: number;
  finding: string;
  verify: VerifyStatus;
  year: string;
  x: number; // map coordinates (0-100)
  y: number;
  lon?: number; // for real projections
  lat?: number;
  landmarks?: string[];
}

export const COORDS: Record<string, [number, number]> = {
  'MP-DEL-2026-0142': [77.2, 28.7],
  'MP-UP-2026-0821': [80.95, 26.84],
  'MP-MH-2026-0331': [79.08, 21.15],
  'MP-RJ-2026-0455': [75.79, 26.91],
  'MP-DL-2026-0090': [77.19, 28.5],
  'MP-TN-2026-1120': [79.13, 12.92],
  'MP-GJ-2026-0712': [72.57, 23.02],
  'MP-WB-2026-0603': [88.39, 22.91],
  'MP-KA-2026-0551': [74.5, 15.85],
  'MP-BR-2026-0904': [85.14, 25.59],
  'MP-MP-2026-0310': [77.41, 23.26],
  'MP-AS-2026-1027': [91.73, 26.14],
  'MP-TG-2026-0642': [78.49, 17.38],
};

export interface Finding {
  title: string;
  detail: string;
  severity: Risk;
  confidence: number;
  weight: number;
  evidence: string[];
}

const V = {
  abc: 'ABC Infra Pvt Ltd',
  sharma: 'Sharma Constructions',
  rk: 'R.K. Enterprises',
  gvk: 'GVK Builders',
  nandu: 'Nandu Infra & Electricals',
  skm: 'SKM Contracts',
  orbit: 'Orbit Civil Works',
  shree: 'Shree Sai Engineers',
  ms: 'M.S. Traders',
  jmd: 'JMD Constructions',
};

function findFor(p: Project): string {
  return p.finding;
}

// --- The flagship demo project ---
export const DEMO_PROJECT: Project = {
  id: 'MP-DEL-2026-0142',
  name: 'Community Health Centre',
  state: 'Delhi',
  district: 'North Delhi',
  constituency: 'North West Delhi',
  type: 'Health',
  vendor: V.abc,
  allocated: 48,
  spent: 61,
  risk: 'CRITICAL',
  riskScore: 92,
  finding: 'Overbilling + duplicate invoice',
  verify: 'Failed',
  year: '2025-26',
  x: 36,
  y: 32,
  landmarks: ['Satellite ground-truth @28.72N,77.18E', 'Geo-tagged photo set: 3/14 passing'],
};

export const PROJECTS: Project[] = [
  DEMO_PROJECT,
  { id: 'MP-UP-2026-0821', name: 'Rural Road Upgrade', state: 'Uttar Pradesh', district: 'Lucknow', constituency: 'Lucknow', type: 'Roads', vendor: V.sharma, allocated: 35, spent: 34, risk: 'HIGH', riskScore: 74, finding: 'Vendor anomaly', verify: 'Pending', year: '2025-26', x: 55, y: 40 },
  { id: 'MP-MH-2026-0331', name: 'Anganwadi Centre Block', state: 'Maharashtra', district: 'Nagpur', constituency: 'Nagpur', type: 'Education', vendor: V.gvk, allocated: 22, spent: 29, risk: 'CRITICAL', riskScore: 89, finding: 'Cost deviation +24%', verify: 'Failed', year: '2025-26', x: 47, y: 60 },
  { id: 'MP-RJ-2026-0455', name: 'School Toilet & Water Unit', state: 'Rajasthan', district: 'Jaipur', constituency: 'Jaipur', type: 'Education', vendor: V.rk, allocated: 18, spent: 17, risk: 'MEDIUM', riskScore: 53, finding: 'Verification gap', verify: 'Field Visit', year: '2025-26', x: 40, y: 46 },
  { id: 'MP-DL-2026-0090', name: 'Public Library Upgradation', state: 'Delhi', district: 'South Delhi', constituency: 'South Delhi', type: 'Education', vendor: V.skm, allocated: 14, spent: 19, risk: 'HIGH', riskScore: 68, finding: 'Spending acceleration', verify: 'Pending', year: '2025-26', x: 34, y: 33 },
  { id: 'MP-TN-2026-1120', name: 'Panchayat Road Drainage', state: 'Tamil Nadu', district: 'Vellore', constituency: 'Vellore', type: 'Roads', vendor: V.orbit, allocated: 26, spent: 26, risk: 'LOW', riskScore: 18, finding: 'No anomaly', verify: 'Verified', year: '2025-26', x: 52, y: 82 },
  { id: 'MP-GJ-2026-0712', name: 'Primary Health Sub-Centre', state: 'Gujarat', district: 'Ahmedabad', constituency: 'Ahmedabad East', type: 'Health', vendor: V.shree, allocated: 30, spent: 28, risk: 'MEDIUM', riskScore: 44, finding: 'Asset verification', verify: 'Pending', year: '2025-26', x: 36, y: 58 },
  { id: 'MP-WB-2026-0603', name: 'Community Water Points', state: 'West Bengal', district: 'Hooghly', constituency: 'Hooghly', type: 'Water', vendor: V.ms, allocated: 20, spent: 22, risk: 'HIGH', riskScore: 71, finding: 'Vendor concentration', verify: 'Pending', year: '2025-26', x: 64, y: 52 },
  { id: 'MP-KA-2026-0551', name: 'Sub-Minor Irrigation Canal', state: 'Karnataka', district: 'Belagavi', constituency: 'Belagavi', type: 'Irrigation', vendor: V.jmd, allocated: 55, spent: 57, risk: 'MEDIUM', riskScore: 39, finding: 'Timeline slippage', verify: 'Verified', year: '2025-26', x: 43, y: 68 },
  { id: 'MP-BR-2026-0904', name: 'Panchayat Bhawan Phase 2', state: 'Bihar', district: 'Patna', constituency: 'Patna Sahib', type: 'Infrastructure', vendor: V.abc, allocated: 32, spent: 38, risk: 'HIGH', riskScore: 77, finding: 'Duplicate invoice', verify: 'Failed', year: '2025-26', x: 62, y: 45 },
  { id: 'MP-MP-2026-0310', name: 'Rural Hand Pump Cluster', state: 'Madhya Pradesh', district: 'Bhopal', constituency: 'Bhopal', type: 'Water', vendor: V.rk, allocated: 16, spent: 15, risk: 'LOW', riskScore: 22, finding: 'No anomaly', verify: 'Verified', year: '2025-26', x: 47, y: 49 },
  { id: 'MP-AS-2026-1027', name: 'Anganwadi Centre (Ward 6)', state: 'Assam', district: 'Kamrup', constituency: 'Guwahati', type: 'Education', vendor: V.shree, allocated: 19, spent: 18, risk: 'MEDIUM', riskScore: 47, finding: 'Verification gap', verify: 'Field Visit', year: '2025-26', x: 72, y: 36 },
  { id: 'MP-TG-2026-0642', name: 'Community Health Centre', state: 'Telangana', district: 'Hyderabad', constituency: 'Hyderabad', type: 'Health', vendor: V.gvk, allocated: 44, spent: 52, risk: 'HIGH', riskScore: 65, finding: 'Cost deviation +18%', verify: 'Pending', year: '2025-26', x: 49, y: 61 },
];

export const projectById = (id: string) => PROJECTS.find((p) => p.id === id);

// ---------- AI EXPLAINABILITY ----------
export const DEMO_FINDINGS: Finding[] = [
  {
    title: 'Claimed expenditure 27% above comparable projects',
    detail: 'Pattern-matching against 4,210 completed projects of the same type shows spent/allocated ratio of 1.27 versus a state norm of 0.86 (±6%).',
    severity: 'CRITICAL',
    confidence: 96,
    weight: 21,
    evidence: ['Cost matrix vs. peers', 'Invoice INV-8841 vs. norm', 'Sanction order SAN-2210'],
  },
  {
    title: 'Same invoice number appears in another project',
    detail: 'Invoice INV-8841 was also attached to project MP-BR-2026-0904 (Vendor: ABC Infra Pvt Ltd) with a different amount.',
    severity: 'CRITICAL',
    confidence: 98,
    weight: 24,
    evidence: ['Duplicate invoice pair', 'OCR fingerprint match 0.97', 'Link to MP-BR-2026-0904'],
  },
  {
    title: 'Vendor has unusually high concentration of projects in this district',
    detail: 'ABC Infra Pvt Ltd holds 12 active MPLADS contracts, 9 of them within North & North West Delhi (75% concentration vs. 18% peer median).',
    severity: 'HIGH',
    confidence: 91,
    weight: 18,
    evidence: ['Contract distribution map', 'District concentration 75%', 'Shared PAN cluster'],
  },
  {
    title: 'Physical asset verification confidence is low',
    detail: 'Only 3 of 14 geo-tagged photos passed spatial validation; claimed coordinates 2.1 km from reported landmark.',
    severity: 'HIGH',
    confidence: 84,
    weight: 17,
    evidence: ['Satellite scene comparison', 'GPS drift 2.1 km', 'Photo timestamp anomalies'],
  },
  {
    title: 'Spending acceleration detected immediately before project closure',
    detail: '84% of claimed expenditure was booked in the final 20% of the project window, against a 41% peer average.',
    severity: 'MEDIUM',
    confidence: 88,
    weight: 12,
    evidence: ['Monthly disbursement series', 'Temporal deviation chart'],
  },
];

// ---------- FIVE LAYERS ----------
export const LAYERS = [
  {
    id: 'L1',
    title: 'Image & GPS Anomaly Detection',
    desc: 'Photographic evidence validation, EXIF metadata, GPS drift, dHash similarity, and cross-project reuse.',
    detect: ['Metadata anomalies', 'GPS drift (>500m)', 'Perceptual near-duplicates', 'Cross-project reuse'],
    status: 'Risk detected',
    confidence: 92,
    signal: { analyzed: 24, risk: 92, evidence: 14 },
  },
  {
    id: 'L2',
    title: 'Financial Intelligence',
    desc: 'Sanctioned vs released vs expenditure, invoices, payment patterns, and overbilling checks.',
    detect: ['Overbilling', 'Price deviation', 'Duplicate invoices'],
    status: 'Analyzing',
    confidence: 94,
    signal: { analyzed: 12482, risk: 76, evidence: 214 },
  },
  {
    id: 'L3',
    title: 'Vendor Intelligence',
    desc: 'Vendor history, project relationships, repeated awards, geography.',
    detect: ['Suspicious networks', 'Repeated contracts', 'Possible collusion'],
    status: 'Risk detected',
    confidence: 89,
    signal: { analyzed: 1893, risk: 84, evidence: 38 },
  },
  {
    id: 'L4',
    title: 'Idle-Fund & Geospatial Tracking',
    desc: 'Satellite imagery, GPS, project sites, physical progress divergence, and idle fund monitoring.',
    detect: ['Physical divergence', 'GPS drift', 'Dormant funds (>180d)'],
    status: 'Risk detected',
    confidence: 91,
    signal: { analyzed: 5027, risk: 88, evidence: 44 },
  },
  {
    id: 'L5',
    title: 'Citizen QR & Ground-Truth Verification',
    desc: 'Crowdsourced site observations via public QR posters, coarse proximity verification, and advisory physical discrepancy analysis (demo prototype).',
    detect: ['Status divergence', 'Quality defect signals', 'Field verification recommendations'],
    status: 'Monitoring',
    confidence: 88,
    signal: { analyzed: 14, risk: 95, evidence: 3 },
  },
];

export const DETECTION_LAYERS = LAYERS;

// ---------- VENDORS ----------
export interface Vendor {
  name: string;
  pan: string;
  gstin: string;
  projects: number;
  total: number; // crore
  risk: Risk;
  riskScore: number;
  concentration: number; // %
  alerts: number;
  districts: number;
  highRisk: number;
  established: string;
  relation: string;
}

export const VENDORS: Vendor[] = [
  { name: V.abc, pan: 'AAFCA2341B', gstin: '07AAFCA2341B1Z5', projects: 12, total: 8.4, risk: 'CRITICAL', riskScore: 91, concentration: 75, alerts: 7, districts: 4, highRisk: 7, established: '2014', relation: 'Shared director with SKM Contracts' },
  { name: V.sharma, pan: 'AAECS5540K', gstin: '09AAECS5540K1ZL', projects: 9, total: 6.1, risk: 'HIGH', riskScore: 74, concentration: 58, alerts: 4, districts: 3, highRisk: 3, established: '2012', relation: 'Common address with Orbit Civil Works' },
  { name: V.gvk, pan: 'AABCG1133M', gstin: '27AABCG1133M1ZT', projects: 7, total: 5.2, risk: 'HIGH', riskScore: 69, concentration: 41, alerts: 3, districts: 2, highRisk: 2, established: '2016', relation: 'Beneficiary bank pair with R.K. Enterprises' },
  { name: V.rk, pan: 'AABCR8821Q', gstin: '08AABCR8821Q1Z8', projects: 6, total: 3.9, risk: 'MEDIUM', riskScore: 53, concentration: 34, alerts: 2, districts: 2, highRisk: 1, established: '2015', relation: '—' },
  { name: V.skm, pan: 'AABCS3390L', gstin: '07AABCS3390L1Z9', projects: 4, total: 2.6, risk: 'MEDIUM', riskScore: 48, concentration: 28, alerts: 1, districts: 1, highRisk: 1, established: '2018', relation: '—' },
  { name: V.orbit, pan: 'AABCO7711R', gstin: '33AABCO7711R1Z2', projects: 3, total: 1.8, risk: 'LOW', riskScore: 22, concentration: 15, alerts: 0, districts: 1, highRisk: 0, established: '2019', relation: '—' },
  { name: V.shree, pan: 'AABCS9922G', gstin: '24AABCS9922G1Z5', projects: 3, total: 1.6, risk: 'LOW', riskScore: 19, concentration: 12, alerts: 0, districts: 2, highRisk: 0, established: '2020', relation: '—' },
];

export const vendorByName = (n: string) => VENDORS.find((v) => v.name === n);

// ---------- ALERTS ----------
export interface Alert {
  id: string;
  level: Risk;
  title: string;
  detail: string;
  project?: string;
  vendor?: string;
  time: string;
}

export const ALERTS: Alert[] = [
  { id: 'AL-8841', level: 'CRITICAL', title: 'Duplicate invoice detected', detail: 'Invoice INV-8841 attached to two projects.', project: 'MP-DEL-2026-0142', vendor: 'ABC Infra Pvt Ltd', time: '4 min ago' },
  { id: 'AL-8842', level: 'HIGH', title: 'Unusual expenditure detected', detail: 'Spent exceeds allocated by 24% in final window.', project: 'MP-UP-2026-0821', vendor: 'Sharma Constructions', time: '18 min ago' },
  { id: 'AL-8843', level: 'MEDIUM', title: 'Vendor concentration anomaly', detail: '75% project concentration within one district.', vendor: 'ABC Infra Pvt Ltd', time: '41 min ago' },
  { id: 'AL-8844', level: 'HIGH', title: 'Asset verification failed', detail: 'Geo-tagged photo spatial validation failed.', project: 'MP-MH-2026-0331', vendor: 'GVK Builders', time: '1 hr ago' },
  { id: 'AL-8845', level: 'CRITICAL', title: 'Overbilling pattern detected', detail: 'Cost deviation +24% vs peer cluster.', project: 'MP-MH-2026-0331', vendor: 'GVK Builders', time: '2 hrs ago' },
  { id: 'AL-8846', level: 'MEDIUM', title: 'Idle funds flagged', detail: 'Funds released but unspent 14 months.', project: 'MP-TG-2026-0642', time: '3 hrs ago' },
];

// ---------- DETECTION SUMMARY ----------
export const DETECTION = [
  { label: 'Duplicate Billing', alerts: 42, risk: 'CRITICAL' as Risk, icon: 'copy' },
  { label: 'Overbilling', alerts: 76, risk: 'HIGH' as Risk, icon: 'trend' },
  { label: 'Vendor Collusion', alerts: 18, risk: 'HIGH' as Risk, icon: 'network' },
  { label: 'Idle Funds', alerts: 63, risk: 'MEDIUM' as Risk, icon: 'clock' },
  { label: 'Asset Verification', alerts: 91, risk: 'HIGH' as Risk, icon: 'pin' },
];

// ---------- RISK DISTRIBUTION ----------
export const RISK_DIST = [
  { name: 'LOW', value: 71, color: '#48d29b' },
  { name: 'MEDIUM', value: 19, color: '#f0b64b' },
  { name: 'HIGH', value: 8, color: '#ff8a3d' },
  { name: 'CRITICAL', value: 2, color: '#ff5860' },
];

// ---------- STATES / HOTSPOTS ----------
export const HOTSPOTS = [
  { state: 'Delhi', count: 21, exposure: 4.2 },
  { state: 'Uttar Pradesh', count: 34, exposure: 5.8 },
  { state: 'Maharashtra', count: 27, exposure: 4.6 },
  { state: 'Rajasthan', count: 18, exposure: 2.9 },
  { state: 'Bihar', count: 16, exposure: 3.1 },
  { state: 'West Bengal', count: 14, exposure: 2.4 },
];

// Highlight color for the map by state name (partial match)
export const STATE_HIGHLIGHT: Record<string, string> = {
  'NCT of Delhi': '#ff5860',
  'Uttar Pradesh': '#ff8a3d',
  'Maharashtra': '#ff8a3d',
  'Rajasthan': '#f0b64b',
  'Bihar': '#f0b64b',
  'West Bengal': '#f0b64b',
};

// RISK -> color / class maps
export const RISK_COLOR: Record<Risk, string> = {
  LOW: '#48d29b',
  MEDIUM: '#f0b64b',
  HIGH: '#ff8a3d',
  CRITICAL: '#ff5860',
};

export const RISK_TEXT: Record<Risk, string> = {
  LOW: 'text-[#48d29b]',
  MEDIUM: 'text-[#f0b64b]',
  HIGH: 'text-[#ff8a3d]',
  CRITICAL: 'text-[#ff5860]',
};

export const RISK_BG: Record<Risk, string> = {
  LOW: 'bg-[#48d29b]/12 text-[#48d29b] border-[#48d29b]/25',
  MEDIUM: 'bg-[#f0b64b]/12 text-[#f0b64b] border-[#f0b64b]/25',
  HIGH: 'bg-[#ff8a3d]/12 text-[#ff8a3d] border-[#ff8a3d]/25',
  CRITICAL: 'bg-[#ff5860]/12 text-[#ff5860] border-[#ff5860]/25',
};

export const sp = (n: number) => { // format lakhs/crore for rupee display
  if (n >= 100) return `₹${(n / 100).toFixed(2)} Cr`;
  return `₹${n.toFixed(n % 1 === 0 ? 0 : 1)} L`;
};

export const rupees = (lakhs: number) => `₹${(lakhs * 100000).toLocaleString('en-IN')}`;

// ---------- TIMELINE (investigation) ----------
export const CASE_TIMELINE = [
  { label: 'Alert Generated', time: '06 Sep 2026 · 09:40', icon: 'bell', done: true },
  { label: 'AI Verification', time: '06 Sep 2026 · 09:40', icon: 'brain', done: true },
  { label: 'Evidence Collected', time: '06 Sep 2026 · 10:05', icon: 'file', done: true },
  { label: 'Officer Assigned', time: '06 Sep 2026 · 10:12', icon: 'user', done: true },
  { label: 'Field Verification', time: 'In progress', icon: 'truck', done: true },
  { label: 'Resolution', time: 'Pending', icon: 'check', done: false },
];

export const EXPORT_OPTIONS = ['CSV Export', 'JSON Export'];
