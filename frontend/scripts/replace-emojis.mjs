/**
 * Bulk emoji-to-Lucide replacement script.
 * For each file, we:
 *  1. Add required lucide-react imports
 *  2. Replace emoji occurrences with JSX components or text equivalents
 * 
 * Run with: node scripts/replace-emojis.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, '..', 'src');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readFile(rel) {
  return fs.readFileSync(path.join(srcDir, rel), 'utf8');
}

function writeFile(rel, content) {
  fs.writeFileSync(path.join(srcDir, rel), content, 'utf8');
  console.log('✔ Updated:', rel);
}

// Add imports to existing lucide import line, or create new one after last import
function addLucideImports(content, icons) {
  const iconStr = icons.join(', ');

  // Check if there's already a lucide-react import
  const existingMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/);
  if (existingMatch) {
    const existing = existingMatch[1].split(',').map(s => s.trim()).filter(Boolean);
    const merged = [...new Set([...existing, ...icons])].sort();
    return content.replace(
      /import\s*\{[^}]+\}\s*from\s*['"]lucide-react['"]/,
      `import { ${merged.join(', ')} } from 'lucide-react'`
    );
  }

  // Find the last import line and insert after it
  const lastImport = content.match(/^import .+$/gm);
  if (lastImport) {
    const last = lastImport[lastImport.length - 1];
    return content.replace(last, `${last}\nimport { ${iconStr} } from 'lucide-react';`);
  }

  // Prepend
  return `import { ${iconStr} } from 'lucide-react';\n` + content;
}

// ─── File Transforms ──────────────────────────────────────────────────────────

// Helper: replace emoji in JSX span children
// e.g. <span>📹</span>  →  <span><Video className="w-4 h-4 inline" /></span>
// We do simple text replacements.

const TRANSFORMS = [
  {
    file: 'components/common/BookTeleconsultModal.jsx',
    icons: ['Video', 'X', 'AlertTriangle', 'Search', 'Phone', 'Check', 'Info', 'Lightbulb'],
    transform(c) {
      // Header icon
      c = c.replace(
        /<div className="w-11 h-11 rounded-2xl bg-white\/20 backdrop-blur-md flex items-center justify-center text-white text-xl shadow-inner">\s*📹\s*<\/div>/,
        '<div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">\n              <Video className="w-6 h-6" />\n            </div>'
      );
      // Close ✕ button
      c = c.replace(/>\s*✕\s*<\/button>/g, '><X className="w-4 h-4" /></button>');
      // ⚠️ span in error
      c = c.replace(/<span className="shrink-0 text-base">⚠️<\/span>/g, '<AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />');
      // 🔍 search span
      c = c.replace(/<span className="absolute left-3\.5 top-1\/2 -translate-y-1\/2 text-slate-400 text-base pointer-events-none">\s*🔍\s*<\/span>/,
        '<Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />'
      );
      // 🔍 in no-results empty state
      c = c.replace(/<div className="w-12 h-12 rounded-2xl bg-slate-200 text-slate-500 flex items-center justify-center mx-auto text-xl">\s*🔍\s*<\/div>/,
        '<div className="w-12 h-12 rounded-2xl bg-slate-200 text-slate-500 flex items-center justify-center mx-auto">\n                    <Search className="w-6 h-6" />\n                  </div>'
      );
      // ✓ Selected step tab
      c = c.replace(/\{selectedPatient && num === 1 && !isActive \? '✓' : num\}/,
        '{selectedPatient && num === 1 && !isActive ? <Check className="w-3 h-3" /> : num}'
      );
      // 💡 tip
      c = c.replace(/💡 Tip:/g, '<Lightbulb className="w-3.5 h-3.5 inline mr-1 text-amber-500" />Tip:');
      // 📞 phone
      c = c.replace(/📞\s*\{p\.contactPhone\}/g, '<Phone className="w-3 h-3 inline mr-1" />{p.contactPhone}');
      c = c.replace(/📞\s*\{selectedPatient\.contactPhone\}/g, '<Phone className="w-3 h-3 inline mr-1" />{selectedPatient.contactPhone}');
      // ✓ Selected badge
      c = c.replace(/✓ Selected/g, '<Check className="w-3 h-3 inline mr-0.5" />Selected');
      // ℹ️
      c = c.replace(/<span className="text-base shrink-0">ℹ️<\/span>/g, '<Info className="w-4 h-4 shrink-0 text-indigo-500" />');
      // 📹 submit button
      c = c.replace(/<span>📹<\/span>\s*\n\s*<span>Submit Teleconsult Request<\/span>/,
        '<Video className="w-4 h-4" />\n                      <span>Submit Teleconsult Request</span>'
      );
      return c;
    },
  },

  {
    file: 'components/common/CreateReferralForm.jsx',
    icons: ['AlertTriangle', 'CheckCircle2', 'Upload'],
    transform(c) {
      c = c.replace(/<span className="text-sm">⚠️<\/span>/g, '<AlertTriangle className="w-4 h-4 text-rose-500" />');
      c = c.replace(/<span className="text-sm">✅<\/span>/g, '<CheckCircle2 className="w-4 h-4 text-emerald-500" />');
      c = c.replace(/<span>📤<\/span>/g, '<Upload className="w-4 h-4" />');
      return c;
    },
  },

  {
    file: 'components/common/SharedPatientForm.jsx',
    icons: ['X', 'AlertTriangle', 'Phone', 'CreditCard', 'MapPin', 'ClipboardList', 'UserPlus'],
    transform(c) {
      // ✕ close
      c = c.replace(/>\s*✕\s*<\/button>/g, '><X className="w-4 h-4" /></button>');
      // ⚠️ spans
      c = c.replace(/<span>⚠️<\/span>/g, '<AlertTriangle className="w-4 h-4 text-amber-500" />');
      c = c.replace(/⚠️\n/g, '<AlertTriangle className="w-4 h-4 text-amber-500 inline" />\n');
      // 📞
      c = c.replace(/📞\s*\{match\.contactPhone\}/g, '<Phone className="w-3 h-3 inline mr-1" />{match.contactPhone}');
      // 🪪
      c = c.replace(/🪪\s*\{match\.uhid\}/g, '<CreditCard className="w-3 h-3 inline mr-1 text-slate-400" />{match.uhid}');
      // 📍
      c = c.replace(/<span className="text-slate-400">📍<\/span>/g, '<MapPin className="w-3.5 h-3.5 text-slate-400" />');
      // 📋
      c = c.replace(/<span>📋<\/span>\s*Use Existing Profile/g, '<ClipboardList className="w-4 h-4 inline mr-1" />Use Existing Profile');
      // 👤➕
      c = c.replace(/<span>👤➕<\/span>/g, '<UserPlus className="w-4 h-4" />');
      return c;
    },
  },

  {
    file: 'features/doctor/components/ConsultationForm.jsx',
    icons: ['Thermometer', 'Stethoscope', 'Heart', 'Wind', 'Scale', 'Ruler', 'FlaskConical', 'X'],
    transform(c) {
      // Vitals icons in data array
      c = c.replace(/\{ key: 'temp',.*?icon: '🌡️' \}/s, (m) => m.replace("'🌡️'", "'thermometer'"));
      c = c.replace(/\{ key: 'bp',.*?icon: '🩺' \}/s, (m) => m.replace("'🩺'", "'stethoscope'"));
      c = c.replace(/\{ key: 'pulse',.*?icon: '💓' \}/s, (m) => m.replace("'💓'", "'heart'"));
      c = c.replace(/\{ key: 'spO2',.*?icon: '🫁' \}/s, (m) => m.replace("'🫁'", "'wind'"));
      c = c.replace(/\{ key: 'weight',.*?icon: '⚖️' \}/s, (m) => m.replace("'⚖️'", "'scale'"));
      c = c.replace(/\{ key: 'height',.*?icon: '📏' \}/s, (m) => m.replace("'📏'", "'ruler'"));

      // Now find where the icon string is rendered (likely {field.icon})
      // Add a lookup map after the vitals array
      const iconMap = `
  const vitalIconMap = {
    thermometer: <Thermometer className="w-4 h-4" />,
    stethoscope: <Stethoscope className="w-4 h-4" />,
    heart: <Heart className="w-4 h-4" />,
    wind: <Wind className="w-4 h-4" />,
    scale: <Scale className="w-4 h-4" />,
    ruler: <Ruler className="w-4 h-4" />,
  };
`;
      // Insert after the closing ] of the vitals array  
      c = c.replace(/(\{ key: 'height'.*?\}[\s\r\n]*\];)/s, `$1\n${iconMap}`);
      // Replace {field.icon} with {vitalIconMap[field.icon] ?? field.icon}
      c = c.replace(/\{field\.icon\}/g, '{vitalIconMap[field.icon] ?? field.icon}');

      // 🧪 investigation
      c = c.replace(/<span>🧪\s*\{inv\.testName\}<\/span>/g, '<span><FlaskConical className="w-3.5 h-3.5 inline mr-1 text-cyan-600" />{inv.testName}</span>');
      // ✕ remove
      c = c.replace(/>\s*✕\s*<\/button>/g, '><X className="w-3.5 h-3.5" /></button>');
      return c;
    },
  },

  {
    file: 'features/doctor/components/DoctorQueue.jsx',
    icons: ['Video', 'Siren', 'AlertTriangle', 'FlaskConical', 'Microscope', 'Calendar', 'CreditCard', 'Coffee'],
    transform(c) {
      // Tab labels with emojis (strings)
      c = c.replace(/'📹 Teleconsult Req\.'/g, "'Teleconsult Req.'");
      c = c.replace(/'📹 Scheduled'/g, "'Scheduled'");
      c = c.replace(/'📹 Live Call'/g, "'Live Call'");
      // ternary icon
      c = c.replace(
        /\{isReportsReady && isCriticalLab \? '🚨' : isPatientWaiting \? '📹' : isEmergency \? '🚨' : '—'\}/,
        `{isReportsReady && isCriticalLab ? <Siren className="w-4 h-4 text-rose-600" /> : isPatientWaiting ? <Video className="w-4 h-4 text-violet-600" /> : isEmergency ? <Siren className="w-4 h-4 text-rose-600" /> : <span>—</span>}`
      );
      // 🪪 UHID
      c = c.replace(/🪪\s*\{patient\.uhid\}/g, '<CreditCard className="w-3 h-3 inline mr-1 text-slate-400" />{patient.uhid}');
      // 🚨 CRITICAL LAB / Emergency labels (string in JSX)
      c = c.replace(/🚨 CRITICAL LAB/g, 'CRITICAL LAB');
      c = c.replace(/🚨 Emergency/g, 'Emergency');
      c = c.replace(/⚠️ Urgent/g, 'Urgent');
      // <span className="text-xs animate-bounce">📹</span>
      c = c.replace(/<span className="text-xs animate-bounce">📹<\/span>/g, '<Video className="w-3.5 h-3.5 animate-bounce text-violet-600" />');
      // <span>📅</span>
      c = c.replace(/<span>📅<\/span>/g, '<Calendar className="w-4 h-4 text-slate-500" />');
      // {isCriticalLab ? '🚨' : '🔬'}
      c = c.replace(
        /\{isCriticalLab \? '🚨' : '🔬'\}/g,
        '{isCriticalLab ? <Siren className="w-4 h-4 text-rose-600" /> : <Microscope className="w-4 h-4 text-cyan-600" />}'
      );
      // <span className="text-xs shrink-0 animate-bounce">⚠️</span>
      c = c.replace(/<span className="text-xs shrink-0 animate-bounce">⚠️<\/span>/g, '<AlertTriangle className="w-3.5 h-3.5 shrink-0 animate-bounce text-amber-500" />');
      // <span>🚨</span>
      c = c.replace(/<span>🚨<\/span>/g, '<Siren className="w-4 h-4 text-rose-600" />');
      // <span>🔬</span>
      c = c.replace(/<span>🔬<\/span>/g, '<Microscope className="w-4 h-4 text-cyan-600" />');
      // <span>⚠️</span>
      c = c.replace(/<span>⚠️<\/span>/g, '<AlertTriangle className="w-4 h-4 text-amber-500" />');
      // 📹 Virtual (string in tab label)
      c = c.replace(/📹 Virtual/g, 'Virtual');
      // <span>🔬 Reports Ready</span>
      c = c.replace(/<span>🔬 Reports Ready<\/span>/g, '<span className="flex items-center gap-1"><Microscope className="w-3.5 h-3.5" />Reports Ready</span>');
      // ☕ break
      c = c.replace(/<span className="text-xl">☕<\/span>/g, '<Coffee className="w-5 h-5 text-amber-600" />');
      // 📹 Teleconsultations (Virtual OPD) span
      c = c.replace(/<span>📹 Teleconsultations \(Virtual OPD\)<\/span>/g, '<span className="flex items-center gap-1.5"><Video className="w-4 h-4" />Teleconsultations (Virtual OPD)</span>');
      // <span className="text-2xl">📹</span>
      c = c.replace(/<span className="text-2xl">📹<\/span>/g, '<Video className="w-6 h-6 text-violet-600" />');
      return c;
    },
  },

  {
    file: 'features/doctor/components/PatientHistory.jsx',
    icons: ['Tag', 'Mic'],
    transform(c) {
      c = c.replace(/<span className="text-\[10px\]">🏷️<\/span>/g, '<Tag className="w-3 h-3 text-slate-400" />');
      c = c.replace(/<span className="p-1 rounded-lg bg-cyan-100\/80 text-xs">🎙️<\/span>/g, '<span className="p-1 rounded-lg bg-cyan-100/80"><Mic className="w-3 h-3 text-cyan-600" /></span>');
      return c;
    },
  },

  {
    file: 'features/nurse/components/LabCoordination.jsx',
    icons: ['X', 'Phone', 'FlaskConical', 'Check', 'Siren', 'AlertTriangle'],
    transform(c) {
      // ✕ close button
      c = c.replace(/>\s*✕\s*</g, '><X className="w-4 h-4" /><');
      // 📞 phone in template string
      c = c.replace(/`📞 \$\{appt\.patientId\?\.contactPhone\}`/g, "appt.patientId?.contactPhone ? `${appt.patientId.contactPhone}` : ''");
      // Actually we need to handle it differently since it's in JSX
      c = c.replace(/\{appt\.patientId\?\.contactPhone \? `📞 \$\{appt\.patientId\.contactPhone\}` : ''\}/g,
        '{appt.patientId?.contactPhone && <><Phone className="w-3 h-3 inline mr-1" />{appt.patientId.contactPhone}</>}'
      );
      // 🧪 {testDetails}
      c = c.replace(/🧪 \{testDetails\}/g, '<FlaskConical className="w-3.5 h-3.5 inline mr-1 text-cyan-600" />{testDetails}');
      // <span>✓</span> Forwarded to Lab
      c = c.replace(/<span>✓<\/span> Forwarded to Lab/g, '<><Check className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />Forwarded to Lab</>');
      // 🚨 CRITICAL LAB RESULT
      c = c.replace(/🚨 CRITICAL LAB RESULT/g, '<Siren className="w-4 h-4 inline mr-1.5 text-rose-600" />CRITICAL LAB RESULT');
      // 📞 in critical card
      c = c.replace(/\{appt\.patientId\?\.contactPhone \? `📞 \$\{appt\.patientId\.contactPhone\}` : ''\}/g,
        '{appt.patientId?.contactPhone && <><Phone className="w-3 h-3 inline mr-1" />{appt.patientId.contactPhone}</>}'
      );
      // ⚠️ {criticalOrder.criticalReason}
      c = c.replace(/⚠️ \{criticalOrder\.criticalReason\}/g, '<AlertTriangle className="w-3.5 h-3.5 inline mr-1 text-amber-500" />{criticalOrder.criticalReason}');
      // {isCritical ? '⚠️ ' : '✓ '}
      c = c.replace(/\{isCritical \? '⚠️ ' : '✓ '\}/g, '{isCritical ? <AlertTriangle className="w-3.5 h-3.5 inline mr-1 text-amber-500" /> : <Check className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />}');
      // 🚨 Urgent Doctor Attention Required
      c = c.replace(/🚨 Urgent Doctor Attention Required/g, '<Siren className="w-4 h-4 inline mr-1.5 text-rose-600" />Urgent Doctor Attention Required');
      // '🚨 Escalate Critical Lab to Doctor' (string)
      c = c.replace(/'🚨 Escalate Critical Lab to Doctor'/g, "'Escalate Critical Lab to Doctor'");
      return c;
    },
  },

  {
    file: 'features/nurse/components/TriageQueue.jsx',
    icons: ['AlertTriangle', 'CreditCard', 'Siren', 'Video'],
    transform(c) {
      c = c.replace(/<span>⚠️<\/span>/g, '<AlertTriangle className="w-4 h-4 text-amber-500" />');
      c = c.replace(/🪪 \{patient\.uhid\}/g, '<CreditCard className="w-3 h-3 inline mr-1 text-slate-400" />{patient.uhid}');
      c = c.replace(/🚨 Emergency/g, 'Emergency');
      c = c.replace(/⚠️ Urgent/g, 'Urgent');
      c = c.replace(/<span>📹<\/span>/g, '<Video className="w-4 h-4 text-violet-600" />');
      return c;
    },
  },

  {
    file: 'pages/dashboards/AshaDashboard.jsx',
    icons: ['CheckCircle2', 'Video', 'Upload', 'MapPin', 'ClipboardList', 'Phone', 'CheckCircle', 'PartyPopper', 'Loader2', 'CreditCard'],
    transform(c) {
      // Toast strings  
      c = c.replace(/'✅ Referral Created'/g, "'Referral Created'");
      c = c.replace(/'📹 Teleconsult Requested!'/g, "'Teleconsult Requested!'");
      // Tab labels
      c = c.replace(/'📤 Refer'/g, "'Refer'");
      c = c.replace(/`📍 Visits \(\$\{followUps\.length\}\)` : '📍 Visits'/g, "`Visits (${followUps.length})` : 'Visits'");
      c = c.replace(/`📋 Referrals \(\$\{pendingCount\}\)` : '📋 Referrals'/g, "`Referrals (${pendingCount})` : 'Referrals'");
      c = c.replace(/`📹 Video \(\$\{scheduledTeleconsults\.length\}\)` : '📹 Video'/g, "`Video (${scheduledTeleconsults.length})` : 'Video'");
      // 📹 video icon div
      c = c.replace(
        /<div className="w-12 h-12 rounded-2xl bg-white\/20 flex items-center justify-center text-2xl shrink-0">📹<\/div>/g,
        '<div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0"><Video className="w-6 h-6" /></div>'
      );
      // 🪪 UHID
      c = c.replace(/🪪 \{selectedPatient\.uhid\}/g, '<CreditCard className="w-3 h-3 inline mr-1 text-slate-400" />{selectedPatient.uhid}');
      c = c.replace(/🪪 \{p\.uhid\}/g, '<CreditCard className="w-3 h-3 inline mr-1 text-slate-400" />{p.uhid}');
      // ⏳ submitting
      c = c.replace(/\{submitting \? '⏳ Submitting Referral…' : '📤 Submit Referral'\}/g,
        "{submitting ? <><Loader2 className=\"w-4 h-4 inline mr-1.5 animate-spin\" />Submitting Referral…</> : <><Upload className=\"w-4 h-4 inline mr-1.5\" />Submit Referral</>}"
      );
      // 📞 phone
      c = c.replace(/<span className="text-slate-400">·\s*📞\s*\{p\.contactPhone\}<\/span>/g, '<span className="text-slate-400">· <Phone className="w-3 h-3 inline mx-0.5" />{p.contactPhone}</span>');
      // ✅ / 🎉 filter labels
      c = c.replace(/`✅ Arrived \(\$\{/g, '`Arrived (${');
      c = c.replace(/`🎉 Done \(\$\{/g, '`Done (${');
      // 📹 large icon div
      c = c.replace(/<div className="text-4xl mb-3">📹<\/div>/g, '<div className="mb-3"><Video className="w-10 h-10 text-violet-500 mx-auto" /></div>');
      // 📹 Enter Waiting Room button text
      c = c.replace(/📹 Enter Waiting Room \/ Start Call/g, '<Video className="w-4 h-4 inline mr-1.5" />Enter Waiting Room / Start Call');
      return c;
    },
  },

  {
    file: 'pages/dashboards/GovtDashboard.jsx',
    icons: ['AlertTriangle', 'Hospital'],
    transform(c) {
      c = c.replace(/<div className="text-rose-500 text-2xl">⚠<\/div>/g, '<AlertTriangle className="w-6 h-6 text-rose-500" />');
      c = c.replace(/<div className="text-3xl">🏥<\/div>/g, '<div><Hospital className="w-8 h-8 text-slate-600" /></div>');
      return c;
    },
  },

  {
    file: 'pages/dashboards/HospitalAdminDashboard.jsx',
    icons: ['Users', 'Stethoscope', 'Leaf', 'FlaskConical'],
    transform(c) {
      // icon strings in stats array
      c = c.replace(/icon: '👥'/g, "icon: 'users'");
      c = c.replace(/icon: '🩺'/g, "icon: 'stethoscope'");
      c = c.replace(/icon: '🌿'/g, "icon: 'leaf'");
      c = c.replace(/icon: '🔬'/g, "icon: 'flask'");
      // Now add iconMap for rendering — find where the icon prop is rendered
      // Insert iconMap after the stats array
      const iconMapCode = `
  const adminIconMap = {
    users: <Users className="w-5 h-5" />,
    stethoscope: <Stethoscope className="w-5 h-5" />,
    leaf: <Leaf className="w-5 h-5" />,
    flask: <FlaskConical className="w-5 h-5" />,
  };
`;
      // Insert after the stats array closes
      c = c.replace(/(\]\s*;\s*\n)(\s*\/\/ render|\s*return)/m, `$1${iconMapCode}\n$2`);
      // Replace {stat.icon} with {adminIconMap[stat.icon] ?? stat.icon}
      c = c.replace(/\{stat\.icon\}/g, '{adminIconMap[stat.icon] ?? stat.icon}');
      return c;
    },
  },

  {
    file: 'pages/dashboards/NurseDashboard.jsx',
    icons: ['Video', 'Siren', 'Ambulance', 'Stethoscope', 'X', 'CreditCard', 'Tag', 'AlertTriangle'],
    transform(c) {
      // Toast string
      c = c.replace(/'📹 Teleconsult Scheduled!'/g, "'Teleconsult Scheduled!'");
      // 📹 button text
      c = c.replace(/📹\s*<span className="hidden sm:inline">\{t\('nurse\.scheduleTeleconsult'\)\}<\/span>/g,
        '<Video className="w-4 h-4" /><span className="hidden sm:inline">{t(\'nurse.scheduleTeleconsult\')}</span>'
      );
      // 🚨 standalone (text nodes)
      c = c.replace(/^\s*🚨\s*$/gm, '');
      // <span>🚨</span>
      c = c.replace(/<span>🚨<\/span>/g, '<Siren className="w-4 h-4 text-rose-600" />');
      // <span className="text-sm">📹</span>
      c = c.replace(/<span className="text-sm">📹<\/span>/g, '<Video className="w-4 h-4 text-violet-600" />');
      // standalone 📹 (text node)
      c = c.replace(/^\s*📹\s*$/gm, '');
      // 🚨 CRITICAL LAB RESULT
      c = c.replace(/🚨 CRITICAL LAB RESULT/g, '<Siren className="w-4 h-4 inline mr-1.5 text-rose-600" />CRITICAL LAB RESULT');
      // <span>🚨 Escalate to Dr. ...
      c = c.replace(/<span>🚨 Escalate to Dr\. \{docName\}<\/span>/g, '<span className="flex items-center gap-1"><Siren className="w-3.5 h-3.5 text-rose-600" />Escalate to Dr. {docName}</span>');
      // 🚑
      c = c.replace(/🚑/g, '<Ambulance className="w-4 h-4 text-rose-600" />');
      // 📹 large icon in modal
      c = c.replace(/<div className="w-14 h-14 rounded-2xl bg-violet-50 mx-auto flex items-center justify-center mb-3 text-3xl">📹<\/div>/g,
        '<div className="w-14 h-14 rounded-2xl bg-violet-50 mx-auto flex items-center justify-center mb-3"><Video className="w-7 h-7 text-violet-500" /></div>'
      );
      // <span>📹</span>
      c = c.replace(/<span>📹<\/span>/g, '<Video className="w-4 h-4 text-violet-600" />');
      // ✕ close buttons
      c = c.replace(/>\s*✕\s*</g, '><X className="w-4 h-4" /><');
      // 🩺 stethoscope
      c = c.replace(/🩺/g, '<Stethoscope className="w-4 h-4 text-teal-600" />');
      // 🪪 UHID
      c = c.replace(/🪪\s*\{forwardModalAppt\.patientId\.uhid\}/g, '<CreditCard className="w-3.5 h-3.5 inline mr-1 text-slate-400" />{forwardModalAppt.patientId.uhid}');
      // 🚨 Emergency option
      c = c.replace(/🚨 Emergency — Immediate doctor attention/g, 'Emergency — Immediate doctor attention');
      // 🏷️ allergy tag
      c = c.replace(/<span>🏷️ \{allergy\}<\/span>/g, '<span className="flex items-center gap-1"><Tag className="w-3 h-3 text-slate-400" />{allergy}</span>');
      return c;
    },
  },

  {
    file: 'pages/dashboards/PharmacyDashboard.jsx',
    icons: ['Package', 'X', 'ClipboardList', 'CreditCard', 'Phone', 'Pill', 'Ban', 'AlertTriangle', 'CheckCircle2', 'Circle'],
    transform(c) {
      // 📦 standalone text node
      c = c.replace(/^\s*📦\s*$/gm, '');
      // ✕ close
      c = c.replace(/>\s*✕\s*</g, '><X className="w-4 h-4" /><');
      // <span>📋 Prescription Queue</span>
      c = c.replace(/<span>📋 Prescription Queue<\/span>/g, '<span className="flex items-center gap-1.5"><ClipboardList className="w-4 h-4" />Prescription Queue</span>');
      // <span>📦 Inventory Status</span>
      c = c.replace(/<span>📦 Inventory Status<\/span>/g, '<span className="flex items-center gap-1.5"><Package className="w-4 h-4" />Inventory Status</span>');
      // 🪪 UHID
      c = c.replace(/🪪\s*\{patient\.uhid \|\| rx\.patientUhid\}/g, '<CreditCard className="w-3 h-3 inline mr-1 text-slate-400" />{patient.uhid || rx.patientUhid}');
      c = c.replace(/🪪\s*\{selectedRx\.patientId\?\.uhid \|\| selectedRx\.patientUhid\}/g, '<CreditCard className="w-3 h-3 inline mr-1 text-slate-400" />{selectedRx.patientId?.uhid || selectedRx.patientUhid}');
      // 📞 phone
      c = c.replace(/\{patient\.contactPhone && <span> · 📞 \{patient\.contactPhone\}<\/span>\}/g,
        '{patient.contactPhone && <span> · <Phone className="w-3 h-3 inline mx-0.5" />{patient.contactPhone}</span>}'
      );
      c = c.replace(/`· 📞 \$\{selectedRx\.patientId\?\.contactPhone\}`/g, '`· ${selectedRx.patientId?.contactPhone}`');
      // <span>💊</span>
      c = c.replace(/<span>💊<\/span>/g, '<Pill className="w-4 h-4 text-violet-600" />');
      // 💊 standalone text
      c = c.replace(/^\s*💊\s*$/gm, '');
      // 📦 View Full Inventory button text
      c = c.replace(/📦 View Full Inventory/g, '<Package className="w-4 h-4 inline mr-1.5" />View Full Inventory');
      // <span>⛔</span>
      c = c.replace(/<span>⛔<\/span>/g, '<Ban className="w-4 h-4 text-rose-600" />');
      // <span>⚠️</span>
      c = c.replace(/<span>⚠️<\/span>/g, '<AlertTriangle className="w-4 h-4 text-amber-500" />');
      // <span>🟠</span>
      c = c.replace(/<span>🟠<\/span>/g, '<Circle className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />');
      // <span>🟢</span>
      c = c.replace(/<span>🟢<\/span>/g, '<Circle className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" />');
      // ⛔ standalone
      c = c.replace(/^\s*⛔\s*$/gm, '');
      // ⛔ in ternary string
      c = c.replace(/'⛔'/g, "'ban'");
      // {isOut ? '⛔' : isLow ? '⚠️' : '💊'}
      c = c.replace(
        /\{isOut \? '⛔' : isLow \? '⚠️' : '💊'\}/g,
        "{isOut ? <Ban className=\"w-4 h-4 text-rose-600\" /> : isLow ? <AlertTriangle className=\"w-4 h-4 text-amber-500\" /> : <Pill className=\"w-4 h-4 text-violet-500\" />}"
      );
      // <span>⛔ Out of Stock — Dispense Disabled</span>
      c = c.replace(/<span>⛔ Out of Stock — Dispense Disabled<\/span>/g, '<span className="flex items-center gap-1"><Ban className="w-4 h-4 text-rose-600" />Out of Stock — Dispense Disabled</span>');
      // <span>⚠️ Restock Required</span>
      c = c.replace(/<span>⚠️ Restock Required<\/span>/g, '<span className="flex items-center gap-1"><AlertTriangle className="w-4 h-4 text-amber-500" />Restock Required</span>');
      // <span>⛔ Out of Stock</span>
      c = c.replace(/<span>⛔ Out of Stock<\/span>/g, '<span className="flex items-center gap-1"><Ban className="w-4 h-4 text-rose-600" />Out of Stock</span>');
      // <span>✓ In Stock</span>
      c = c.replace(/<span>✓ In Stock<\/span>/g, '<span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-500" />In Stock</span>');
      return c;
    },
  },
];

// ─── Execute ──────────────────────────────────────────────────────────────────

for (const { file, icons, transform } of TRANSFORMS) {
  try {
    let content = readFile(file);
    content = addLucideImports(content, icons);
    content = transform(content);
    writeFile(file, content);
  } catch (err) {
    console.error('✖ Error processing', file, ':', err.message);
  }
}

console.log('\nDone! All emoji replacements complete.');
