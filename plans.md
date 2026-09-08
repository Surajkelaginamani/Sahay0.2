# Prompt 7.1: Clinical Database Schemas (Consultations & Labs)
Task: Create the Mongoose schemas to store doctor consultations, prescriptions, and lab requests.

Requirements:

Consultation.js (backend/src/models/):

References: appointmentId, patientId, doctorId, facilityId.

Fields: chiefComplaint (String), diagnosis (String), notes (String), status (Enum: ['Open', 'Closed']).

Prescription.js (backend/src/models/):

References: consultationId, patientId, doctorId.

Fields: medications (Array of objects: medicineName, dosage, frequency, duration), instructions (String).

LabOrder.js (backend/src/models/):

References: appointmentId, patientId, doctorId, facilityId.

Fields: testName (String), status (Enum: ['Requested', 'Sample Collected', 'Completed']), resultURL (String - for the future report), notes (String).

# Prompt 7.2: Doctor Backend API (History & Actions)
Task: Build the API controllers for the Doctor to view patient history, request labs, and submit prescriptions.

Requirements:

Update doctorController.js & doctorRoutes.js:

getPatientHistory(req, res): Accept a patientId. Fetch and return all past Consultations, Prescriptions, LabOrders, and Vitals associated with this patient across any facility. Sort by date descending.

requestLabTest(req, res): Accept appointmentId, patientId, and testName. Create a new LabOrder with status 'Requested'. Update the Appointment status to 'Lab Pending' (routing it back to the Nurse).

closeConsultation(req, res): Accept clinical data and prescription arrays. Save to Consultation and Prescription collections. Update the Appointment status to 'Completed'. Map these to protected GET and POST routes.

# Prompt 7.3: Doctor Frontend UI (History & Consultation Form)
Task: Upgrade the Doctor Dashboard to include the Patient History view and the Lab Request / Prescription action panel.

Requirements:

Update DoctorDashboard.jsx: When a patient is clicked from the <DoctorQueue/>, render a main workspace divided into two tabs: "Medical History" and "Current Consultation".

PatientHistory.jsx (Tab 1): Fetch from getPatientHistory API. Display a chronological timeline of the patient's past visits, showing old diagnoses, vitals, and previous medications.

ConsultationPanel.jsx (Tab 2):

Display the vitals just captured by the Nurse.

Provide a text area for Diagnosis and Notes.

Action 1 - Request Lab: A dropdown to select a test (e.g., CBC, X-Ray) and a "Send to Lab" button that calls the requestLabTest API (removing the patient from the doctor's immediate screen).

Action 2 - Prescribe & Close: A dynamic form to add medications. A final "Complete Consultation" button that calls the closeConsultation API.