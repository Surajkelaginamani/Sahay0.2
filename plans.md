# Prompt: Mount Live Queue Tracker in Patient Dashboard
Task: Mount the conditional Live OPD Queue Tracker card on PatientDashboard.jsx directly below the summary stat cards and wire it to real-time appointment status data. Use lucide-react icons and avoid all emojis.

1. Dashboard State & Logic (PatientDashboard.jsx)
On dashboard load, call GET /api/appointments/patient/active-today (or check if today's appointments list contains a record with status: 'WAITING' or status: 'IN_CONSULTATION').

Store the active record in state: const [activeAppointment, setActiveAppointment] = useState(null);

If activeAppointment exists:

Render <LiveQueueTracker appointment="{activeAppointment}"/> immediately below the 4 stat cards and above the purple video call banner.

Set up a 20-second interval to refresh queue status from /api/queue/patient-status/:appointmentId.

2. Component Layout (LiveQueueTracker.jsx)
Container: Rounded card (rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50/70 via-white to-cyan-50/70 p-5 shadow-sm mb-6).

Header Row:

Left side: Pulse indicator (span className="relative flex h-3 w-3 mr-2") with text "Live OPD Queue Tracker" (font-semibold text-slate-800 text-lg) and <Activity className="w-5 h-5 text-teal-600 ml-2"/>.

Right side: Assigned Doctor pill badge (bg-white border border-slate-200 px-3 py-1 rounded-full text-xs text-slate-600 flex items-center): <Stethoscope className="w-3.5 h-3.5 text-teal-600 mr-1.5"/> Dr. [Doctor Name] • Room 3.

3-Column Token & Progress Grid (grid grid-cols-3 gap-4 my-4):

Box 1 (Your Token):

Label: "Your Token" (text-xs font-medium text-slate-500)

Value: #[tokenNumber] (text-3xl font-black text-teal-700)

Box 2 (Now Serving):

Label: "Currently Serving" (text-xs font-medium text-slate-500)

Value: #[currentServingToken || '--'] (text-3xl font-black text-slate-800)

Box 3 (Ahead of You):

Label: "Patients Ahead" (text-xs font-medium text-slate-500)

Value: [patientsAhead] (text-3xl font-black text-indigo-600)

Dynamic Wait-Time & Action Banner:

If status === 'WAITING' and patientsAhead > 1:

Clean banner (bg-white/80 border border-teal-100 rounded-xl p-3.5 flex items-center justify-between):

Left: <Timer className="w-5 h-5 text-teal-600 mr-2"/> Estimated Wait Time: ~[estimatedWaitMinutes] mins

Right: <Clock className="w-4 h-4 text-slate-400 mr-1"/> Expected Call: [expectedTime]

If patientsAhead <= 1 (Next Up Alert):

Highlight banner (bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex items-center text-amber-900):

<BellRing className="w-5 h-5 text-amber-600 mr-2 animate-bounce"/>

"Please be ready near Room 3. You are next in line."

If status === 'IN_CONSULTATION':

Success banner (bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 flex items-center text-emerald-900):

<CheckCircle2 className="w-5 h-5 text-emerald-600 mr-2"/>

"Doctor is ready. Please enter Consultation Room 3."