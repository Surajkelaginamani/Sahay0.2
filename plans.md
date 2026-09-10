# Prompt 17.1: Appointment Schema & Teleconsult Controllers
Task: Upgrade the Appointment model and backend controllers to support scheduled, multi-source teleconsultations.

Requirements:

Schema Updates (backend/src/models/Appointment.js):

type: Enum ['Physical', 'Teleconsultation'] (Default: 'Physical').

teleconsultSource: Enum ['ASHA', 'Nurse', 'Patient'].

scheduledDate: Date.

timeSlot: String (e.g., "10:00 AM - 10:30 AM").

teleconsultRoomId: String (nullable).

status: Add 'Teleconsult Requested', 'Teleconsult Scheduled', 'In Teleconsult'.

Booking Controller (appointmentController.js):

bookTeleconsult(req, res): Accepts patientId, facilityId, departmentId/doctorId, scheduledDate, timeSlot, chiefComplaint, and determines teleconsultSource from req.user.role.

Sets status = 'Teleconsult Requested'.

Receptionist Confirmation Controller (receptionistController.js):

getPendingTeleconsults(req, res): Fetch all appointments for the facility with status 'Teleconsult Requested'.

confirmTeleconsult(req, res): Accepts appointmentId, assignedDoctorId, and confirmed timeSlot. Generates a unique room string (room-sahay-[appointmentId]-[timestamp]), assigns it to teleconsultRoomId, and updates status to 'Teleconsult Scheduled'.

Mount and protect these routes under /api/teleconsult.

# Prompt 17.2: Booking Modals (ASHA, Nurse, and Patient Dashboards)
Task: Build unified teleconsultation booking forms for village health workers and self-service patients.

Requirements:

Component (frontend/src/components/common/BookTeleconsultModal.jsx):

Modal containing inputs: Facility Selector (Dropdown of District/Higher-level Hospitals), Department/Specialty, Preferred Date (HTML datepicker, min today), Time Slot Selector (Pill selections: 10:00 AM, 11:30 AM, 02:00 PM, etc.), and Chief Complaint textarea.

If triggered by Nurse/ASHA, include a Patient Search input to select which villager the appointment is for.

If triggered by Patient, automatically lock the patient ID to the logged-in user.

On submit: Calls POST /api/teleconsult/book and displays a confirmation toast: "Teleconsult request submitted for hospital review."

Integration:

AshaDashboard.jsx: Add a "Book Video Consult for Villager" quick action.

NurseDashboard.jsx: Add a "Schedule Teleconsult" button in the action bar.

PatientDashboard.jsx: Add a prominent card on the home screen: "Schedule Doctor Video Call".

# Prompt 17.3: Receptionist Teleconsult Triage Desk
Task: Create the incoming teleconsult verification interface in the Receptionist Dashboard.

Requirements:

Update ReceptionistDashboard.jsx: Add a dedicated tab: Teleconsult Requests.

Data Display: Render a table listing: Patient Name, Age, Booking Source (e.g., "ASHA: Sakib" or "Self (Patient)"), Requested Hospital Department, Requested Date & Slot, and Chief Complaint.

Action:

"Assign Doctor & Confirm" dropdown + button.

On confirmation, call /api/teleconsult/confirm. The row updates to "Confirmed" with the assigned doctor's name, and the patient/worker receives the confirmed slot status.

# Prompt 17.4: Doctor Dashboard Teleconsult Queue & Video Workspace
Task: Add an isolated Teleconsultation Queue and Jitsi video conference screen to the Doctor Dashboard.

Requirements:

Update doctorController.js (getDoctorQueue): Return a third queue section: teleconsultQueue containing appointments assigned to this doctor where type === 'Teleconsultation' and status is 'Teleconsult Scheduled'.

Update DoctorDashboard.jsx:

Render a secondary sidebar section: Scheduled Teleconsults (Virtual OPD) with date and time badges.

When the doctor clicks a teleconsult patient, show a side-by-side interface:

Left Panel (50%): The live Jitsi video room connecting to appointment.teleconsultRoomId.

Right Panel (50%): Standard ABDM consultation panel (Patient Medical History, Diagnosis, Lab Order Requests, and Digital Prescription).

Joining from Village/Patient Side:

In AshaDashboard.jsx, NurseDashboard.jsx, and PatientDashboard.jsx, render a "My Teleconsults" section.

If an appointment has status 'Teleconsult Scheduled', display a Join Doctor Call button that launches the video modal using the same teleconsultRoomId.