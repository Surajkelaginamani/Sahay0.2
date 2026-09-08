# Prompt 10.1: System Role & Referral Schema
Task: Introduce the ASHA Worker role and build the Mongoose schema for inter-facility referrals.

Requirements:

Schema Update (User.js): Add 'AshaWorker' to the role enum.

Authentication Routing: Update Admin creation dropdowns and login switch cases (Landing.jsx, auth.js) to route this role to /dashboard/asha.

Create Referral.js (backend/src/models/):

References: patientId (Patient), referredBy (User - AshaWorker), referredToFacility (Hospital), referredFromFacility (Hospital - Optional, if ASHA is attached to a specific PHC).

Fields: reasonForReferral (String), clinicalNotes (String), status (Enum: ['Pending', 'Arrived', 'Completed']).

Add timestamps.

# Prompt 10.2: ASHA Worker Backend & Dashboard (Step 1)
Task: Build the ASHA Worker's interface to search patients and send referrals to higher-level hospitals.

Requirements:

Backend (ashaController.js & ashaRoutes.js):

getHigherLevelHospitals(req, res): Fetch hospitals that have a higher tier than the local village center (or simply return all available district hospitals).

createReferral(req, res): Accept patientId, referredToFacility, and reasonForReferral. Save to the Referral collection with status 'Pending'.

Frontend (AshaDashboard.jsx):

Design this UI to be highly mobile-responsive, as rural workers primarily use phones/tablets.

Build a "Refer Patient" form: Includes a patient search bar, a dropdown of higher-level hospitals fetched from the API, and a text area for the referral reason.

Build an "Active Referrals" list showing patients they have sent to the city who haven't arrived yet.

# Prompt 10.3: Receptionist Referral Integration (Step 2)
Task: Upgrade the Receptionist Dashboard to intercept incoming ASHA referrals and process them into the hospital queue.

Requirements:

Backend Update (receptionistController.js):

Create getIncomingReferrals(req, res): Query the Referral collection where referredToFacility matches the receptionist's hospital ID and status is 'Pending'.

Update the existing patient search logic: If the searched patient has a pending referral to this facility, return the referral data alongside the patient data.

Frontend Update (ReceptionistDashboard.jsx):

Add an "Incoming Referrals" notification badge or section.

When the receptionist searches for a patient who just arrived from a village, display a prominent banner: "Valid ASHA Referral Found: [Reason]".

Action: Modify the "Add to Queue" button logic. When clicked for a referred patient, it must create the standard Appointment (setting status to 'At Triage' for the Nurse), AND simultaneously update the Referral document status to 'Arrived'.