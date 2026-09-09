# Prompt 14.1: Backend Data Population
Task: Ensure the patient records API populates the hospital and doctor names so the frontend can group them.

Requirements:

Locate Controller: Open backend/src/modules/patient/patientController.js and find getMyMedicalRecords (or the equivalent API fetching patient records).

Update Queries: For the Prescription.find() and LabOrder.find() queries, attach .populate('facilityId', 'name') to get the hospital name, and .populate('doctorId', 'firstName lastName') to get the doctor's name.

Verify that the response payload now includes these nested object names instead of just raw MongoDB ObjectIDs.

# Prompt 14.2: Frontend Grouping Logic & Nested UI
Task: Restructure the "Digital Prescription" and "Diagnostics Lab Reports" tabs to display nested, categorized lists.

Requirements:

Data Grouping Utility: In PatientDashboard.jsx, write a JavaScript helper function using .reduce() that takes a flat array of records and groups them. The resulting object structure must be:
{ "Hospital Name": { "Dr. Firstname Lastname": [ record1, record2 ] } }

Digital Prescriptions Tab: Apply the grouping function to the prescriptions array. Map over the Object.keys() of the hospitals to render a prominent Hospital header card. Inside that, map over the doctors to render a sub-header. Finally, map over the doctor's specific prescriptions to render the medication lists.

Diagnostics Lab Reports Tab: Apply the exact same grouping function and nested mapping layout to the lab reports array.

UI Fallback: Ensure that if a record is missing a linked facility or doctor (due to old dummy data), it defaults to falling under an "Unknown Hospital" or "General Consulting" category so the UI does not crash.
|
# Prompt 15.1: Backend - Shared Referral Route & Origin Tracking
Task: Upgrade the referral API to allow Nurses to create referrals and track the origin facility.

Requirements:

Route Permissions: Update the referral creation route (e.g., POST /api/referrals) to allow both ['AshaWorker', 'Nurse'] roles to access it.

Origin Tracking in Controller: In the createReferral controller, automatically grab the logged-in user's hospital ID (req.user.hospitalId) and save it to the referredFromFacility field in the Referral document.

Receptionist Query Update: In the receptionist's getIncomingReferrals controller (and the patient search controller), populate the referral data: .populate('referredFromFacility', 'name address city') and .populate('referredBy', 'firstName lastName role').

# Prompt 15.2: Frontend - Shared Referral Component for NursesTask:
 Extract the ASHA "Refer Patient" UI and embed it into the Nurse Dashboard.Requirements:Component Extraction: Take the referral form shown in the ASHA Portal (Search Patient $\rightarrow$ Select Destination Hospital $\rightarrow$ Referral Details) and turn it into a shared component: frontend/src/components/common/CreateReferralForm.jsx.Nurse Dashboard Integration: Open NurseDashboard.jsx and add a new tab or section called "Outbound Referrals". Render the <CreateReferralForm/> inside this tab.API Hookup: Ensure the form submits to the shared referral API endpoint, passing the selected patient, destination hospital, reason, and notes.

 # Prompt 15.3: Frontend - Enhanced Receptionist Referral Banner
Task: Update the Receptionist Dashboard to display the detailed origin of incoming referrals.

Requirements:

Update UI: Locate the "Valid Referral Found" banner in ReceptionistDashboard.jsx (which appears when searching for a referred patient).

Display Origin Data: Add new lines to this banner using the populated data from the backend. It must explicitly show:

From Facility: referral.referredFromFacility.name - referral.referredFromFacility.address, referral.referredFromFacility.city

Referred By: referral.referredBy.firstName referral.referredBy.lastName (referral.referredBy.role)

Reason & Notes: (Keep the existing reason and clinical notes display).

Ensure the UI handles fallbacks gracefully (e.g., if an ASHA worker is not attached to a specific facility, display "Independent Field Worker" instead of crashing).