# Prompt 9.1: Pharmacy Role & Backend API (Step 4.5)
Task: Introduce the Pharmacist role and build the API to fetch digital prescriptions.

Requirements:

Schema Update (User.js): Add 'Pharmacist' to the role enum.

Admin & Routing Updates: Add the Pharmacist role to the Hospital Admin staff creation dropdown and update the authentication routing to redirect this role to /dashboard/pharmacy.

Backend (pharmacyController.js & pharmacyRoutes.js):

Create getActivePrescriptions(req, res): Fetch documents from the Prescription collection where facilityId matches the logged-in Pharmacist and status is 'Pending'. Populate patient details.

Create dispenseMedication(req, res): Accept prescriptionId and update its status to 'Dispensed'.

# Prompt 9.2: Pharmacy Dashboard UI (Step 4.5)
Task: Build the frontend interface for the Pharmacy Dashboard.

Requirements:

Create PharmacyDashboard.jsx: Guard this route for the 'Pharmacist' role.

Active Queue: Display a data table fetching from getActivePrescriptions.

Prescription View: When a patient is clicked, display the exact array of medications, dosages, and instructions prescribed by the doctor.

Action: Include a "Mark as Dispensed" button that calls the dispenseMedication API and removes the patient from the pharmacist's active screen.

# Prompt 9.3: Patient Dashboard & Medical Records (Step 5)
Task: Build the dedicated Patient Dashboard for citizens to view their own medical history across all hospitals.

Requirements:

Backend (patientController.js): Create getMyMedicalRecords(req, res). Extract the patientId from the user's JWT. Query and return all Consultations, Prescriptions, and LabOrders associated with this ID, populating the facilityId to show which hospital they visited.

Frontend (PatientDashboard.jsx): Build a tabbed interface or chronological timeline displaying:

Hospitals Visited: A list of unique facilities they have checked into.

Medical History: A timeline of previous check-ups, treatments received, lab reports, and medicines taken.

Routing: Ensure patients logging in via the public portal are routed strictly to this dashboard.