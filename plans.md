# Prompt 18.1: Backend - Teleconsultation Statuses & Queue Pipeline
Task: Update the backend to support the virtual waiting room state and integrate teleconsultations directly into the assigned Doctor's queue.

Requirements:

Schema Update (backend/src/models/Appointment.js):

type: Enum ['Physical', 'Teleconsultation'] (default: 'Physical').

scheduledDate: Date.

timeSlot: String (e.g., "10:30 AM - 11:00 AM").

teleconsultRoomId: String.

teleconsultInitiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }.

status: Add 'Teleconsult Confirmed', 'Patient Waiting in Room', 'In Teleconsult'.

Receptionist Assignment (receptionistController.js):

Endpoint confirmTeleconsult: Accepts appointmentId, assignedDoctorId, scheduledDate, and timeSlot. Generates a unique teleconsultRoomId = "sahay-room-" + appointmentId. Sets status = 'Teleconsult Confirmed'.

Patient/ASHA Check-In (appointmentController.js):

Endpoint POST /api/teleconsult/:appointmentId/start: Can be called by ASHA Worker, Nurse, or Patient. Updates the status to 'Patient Waiting in Room' and records timestamps.

Doctor Queue Controller (doctorController.js):

In getDoctorQueue, return a third categorized array: teleconsultQueue.

Query: assignedDoctorId === req.user.id, type === 'Teleconsultation', and status in ['Teleconsult Confirmed', 'Patient Waiting in Room', 'In Teleconsult']. Sort those with 'Patient Waiting in Room' to the top.

# Prompt 18.2: ASHA, Nurse & Patient "Enter Waiting Room" Interface
Task: Add the patient-side teleconsultation launcher so the ASHA worker or patient can initiate the call and notify the hospital.

Requirements:

In AshaDashboard.jsx, NurseDashboard.jsx, and PatientDashboard.jsx, add a Teleconsultations panel listing appointments where type === 'Teleconsultation'.

Display appointment cards showing: Target Hospital, Assigned Doctor, Scheduled Date & Time Slot, and Status Badge.

The Call Launcher Button:

If status is 'Teleconsult Confirmed', render an active button: "Enter Waiting Room / Start Call".

Clicking this button:

Calls POST /api/teleconsult/:appointmentId/start (updating status to 'Patient Waiting in Room').

Opens a modal rendering the <JitsiMeeting/> iframe with room name set to appointment.teleconsultRoomId.

Shows a banner above the video: "Waiting for Dr. [Doctor Name] to connect... Your connection is live."

# Prompt 18.3: Doctor Dashboard - Live Alert & Split Consultation Screen
Task: Upgrade the Doctor Dashboard to display the Virtual Queue with waiting alerts and render the video feed alongside full medical records.

Requirements:

Queue Sidebar Upgrade (DoctorQueue.jsx):

Add a section: Teleconsultations (Virtual OPD) alongside the existing "Ongoing Queue" and "Reports Ready" queues.

If any appointment has status === 'Patient Waiting in Room', show a pulsing green indicator with a label: "Patient Waiting in Call".

Integration into Existing Doctor Workspace (DoctorDashboard.jsx & ConsultationPanel.jsx):

When the Doctor clicks a teleconsultation patient from the queue:

Automatically fetch the patient's full longitudinal records using the existing getPatientHistory API.

Replace the single-column form with a 50/50 Split Screen:

Left Column: Render <JitsiMeeting displayName="{doctorName}" roomName="{appointment.teleconsultRoomId}"/> with controls to hang up.

Right Column: Render the existing clinical consultation tabs: "Medical History" (past visits, old prescriptions, past lab reports) and "Active Consultation" (symptoms, diagnosis, custom lab requests, digital prescription).

The Doctor can view past records and prescribe medicines while maintaining eye contact and speaking with the patient/ASHA worker.

Completion: When the doctor submits the consultation form, update the appointment status to 'Completed', which closes the call for both participants and writes to the patient's global record.