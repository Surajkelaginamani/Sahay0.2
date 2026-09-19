/**
 * Fix DoctorQueue.jsx - restore from .bak and apply emoji replacements
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const targetFile = path.join(__dirname, '..', 'src', 'features', 'doctor', 'components', 'DoctorQueue.jsx');
const backupFile = targetFile + '.bak';

function addLucideImports(content, icons) {
  const existingMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/);
  if (existingMatch) {
    const existing = existingMatch[1].split(',').map(s => s.trim()).filter(Boolean);
    const merged = [...new Set([...existing, ...icons])].sort();
    return content.replace(
      /import\s*\{[^}]+\}\s*from\s*['"]lucide-react['"]/,
      `import { ${merged.join(', ')} } from 'lucide-react'`
    );
  }
  const lastImport = content.match(/^import .+$/gm);
  if (lastImport) {
    const last = lastImport[lastImport.length - 1];
    return content.replace(last, `${last}\nimport { ${icons.join(', ')} } from 'lucide-react';`);
  }
  return `import { ${icons.join(', ')} } from 'lucide-react';\n` + content;
}

let content = fs.readFileSync(backupFile, 'utf8');

// Add lucide imports
content = addLucideImports(content, ['Video', 'Siren', 'AlertTriangle', 'FlaskConical', 'Microscope', 'Calendar', 'CreditCard', 'Coffee']);

// Tab status badge labels (text in JSX)
content = content.replace(
  /(\s*<span className="w-2 h-2 rounded-full bg-purple-600 animate-ping" \/>\s*)📹 Teleconsult Req\./,
  '$1<Video className="w-3 h-3" /> Teleconsult Req.'
);
content = content.replace(
  /(\s*<span className="w-1\.5 h-1\.5 rounded-full bg-violet-600" \/>\s*)📹 Scheduled/,
  '$1<Video className="w-3 h-3" /> Scheduled'
);
content = content.replace(
  /(\s*<span className="w-1\.5 h-1\.5 rounded-full bg-indigo-600 animate-pulse" \/>\s*)📹 Live Call/,
  '$1<Video className="w-3 h-3" /> Live Call'
);

// ternary status icon in table
content = content.replace(
  /\{isReportsReady && isCriticalLab \? '🚨' : isPatientWaiting \? '📹' : isEmergency \? '🚨' : '—'\}/,
  `{isReportsReady && isCriticalLab ? <Siren className="w-4 h-4 text-rose-600" /> : isPatientWaiting ? <Video className="w-4 h-4 text-violet-600" /> : isEmergency ? <Siren className="w-4 h-4 text-rose-600" /> : <span>—</span>}`
);

// 🪪 UHID
content = content.replace(/🪪 \{patient\.uhid\}/g, '<CreditCard className="w-3 h-3 inline mr-1 text-slate-400" />{patient.uhid}');

// Text labels without icon span needed
content = content.replace(/🚨 CRITICAL LAB/g, 'CRITICAL LAB');
content = content.replace(/🚨 Emergency/g, 'Emergency');
content = content.replace(/⚠️ Urgent/g, 'Urgent');

// <span className="text-xs animate-bounce">📹</span>
content = content.replace(
  /<span className="text-xs animate-bounce">📹<\/span>/g,
  '<Video className="w-3.5 h-3.5 animate-bounce text-violet-600" />'
);

// <span>📅</span>
content = content.replace(/<span>📅<\/span>/g, '<Calendar className="w-4 h-4 text-slate-500" />');

// {isCriticalLab ? '🚨' : '🔬'}
content = content.replace(
  /\{isCriticalLab \? '🚨' : '🔬'\}/g,
  '{isCriticalLab ? <Siren className="w-4 h-4 text-rose-600" /> : <Microscope className="w-4 h-4 text-cyan-600" />}'
);

// <span className="text-xs shrink-0 animate-bounce">⚠️</span>
content = content.replace(
  /<span className="text-xs shrink-0 animate-bounce">⚠️<\/span>/g,
  '<AlertTriangle className="w-3.5 h-3.5 shrink-0 animate-bounce text-amber-500" />'
);

// <span>🚨</span>
content = content.replace(/<span>🚨<\/span>/g, '<Siren className="w-4 h-4 text-rose-600" />');

// <span>🔬</span>
content = content.replace(/<span>🔬<\/span>/g, '<Microscope className="w-4 h-4 text-cyan-600" />');

// <span>⚠️</span>
content = content.replace(/<span>⚠️<\/span>/g, '<AlertTriangle className="w-4 h-4 text-amber-500" />');

// 📹 Virtual tab text
content = content.replace(/📹 Virtual/g, 'Virtual');

// <span>🔬 Reports Ready</span>
content = content.replace(
  /<span>🔬 Reports Ready<\/span>/g,
  '<span className="flex items-center gap-1"><Microscope className="w-3.5 h-3.5" />Reports Ready</span>'
);

// ☕ break
content = content.replace(/<span className="text-xl">☕<\/span>/g, '<Coffee className="w-5 h-5 text-amber-600" />');

// <span>📹 Teleconsultations (Virtual OPD)</span>
content = content.replace(
  /<span>📹 Teleconsultations \(Virtual OPD\)<\/span>/g,
  '<span className="flex items-center gap-1.5"><Video className="w-4 h-4" />Teleconsultations (Virtual OPD)</span>'
);

// <span className="text-2xl">📹</span>
content = content.replace(
  /<span className="text-2xl">📹<\/span>/g,
  '<Video className="w-6 h-6 text-violet-600" />'
);

// 🧪 in empty state
content = content.replace(
  /<span className="text-xl">🧪<\/span>/g,
  '<FlaskConical className="w-6 h-6 mx-auto text-teal-500" />'
);

fs.writeFileSync(targetFile, content, 'utf8');
console.log('✔ DoctorQueue.jsx restored and updated:', (content.split('\n').length), 'lines');

// Clean up backup
fs.unlinkSync(backupFile);
console.log('✔ Backup removed');
