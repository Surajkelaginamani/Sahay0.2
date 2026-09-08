# Prompt 8.1: System Role & Auth for Lab Head
Task: Introduce the 'LabHead' role to the unified authentication system.

Requirements:

Schema Update (User.js): Add 'LabHead' to the role enum array.

Admin UI (HospitalAdminDashboard.jsx): Add "Lab Head" to the staff creation dropdown.

Login Routing (auth.js, Landing.jsx, HospitalLogin.jsx, Navbar.jsx): Add switch cases for the 'LabHead' role to route to /dashboard/lab.

# Prompt 8.2: Nurse Dashboard Upgrade (Lab Coordination)
Task: Upgrade the Nurse Dashboard and API to handle lab request forwarding and doctor re-queuing (Steps 4.2 & 4.4).

Requirements:

Update nurseController.js:

Create getLabQueue(req, res): Fetch appointments with status 'Lab Pending' or 'Reports Ready'. Include populated LabOrder details.

Create forwardToLab(req, res): Accept appointmentId. (In a real system, this might trigger a notification, but for now, just acknowledge the forward in the database or simply log it, as the Lab Head will pull from the database directly).

Create notifyDoctor(req, res): Accept appointmentId. This updates a specific flag (e.g., doctorQueueType: 'Review') to ensure the doctor sees them in a separate queue, but keeps status as 'Reports Ready'.

Update NurseDashboard.jsx: Add a new tab called "Lab Coordination". Display a table with two sections:

Pending Lab Requests: Shows patients sent by the doctor. Include a "Forward to Lab" button.

Reports Ready: Shows patients whose tests are done. Include a "Notify Doctor (Move to Review Queue)" button.

# Prompt 8.3: Lab Head Backend & Dashboard
Task: Build the API and UI for the Lab Head to process tests and upload results (Step 4.3).

Requirements:

Backend (labController.js & labRoutes.js):

getPendingTests: Fetch LabOrder documents where facilityId matches the Lab Head's facility and status is 'Requested'. Populate patient details.

uploadReport: Accept labOrderId and resultText (or file URL). Update LabOrder status to 'Completed'. Update the associated Appointment status to 'Reports Ready' so the Nurse sees it.

Frontend (LabDashboard.jsx & LabDashboardApi.js):

Create the /dashboard/lab route guarded by the 'LabHead' role.

Build a main data table fetching getPendingTests.

Add an "Upload Result" button that opens a modal with a text area for the report. On submit, call the uploadReport API.

# Prompt 8.4: Doctor Dashboard Upgrade (Secondary Queue)
Task: Update the Doctor's queue to display patients with ready lab reports in a separate list (Step 4.4 & 4.5).

Requirements:

Update doctorController.js (getDoctorQueue): Modify the logic to return two distinct arrays:

activeQueue: Patients with status 'Waiting' or 'Waiting for Doctor'.

reviewQueue: Patients with status 'Reports Ready'.

Update DoctorQueue.jsx: Split the sidebar UI into two sections using accordions or distinct lists: "Ongoing Queue" and "Reports Ready".

Update ConsultationPanel.jsx: Ensure that when a doctor clicks a patient from the "Reports Ready" queue, the panel displays the newly completed LabOrder results prominently so the doctor can review them and prescribe medication.