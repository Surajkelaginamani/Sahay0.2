# Prompt 11.1: Backend - Support Multiple Lab Orders
Task: Update the requestLabTest controller to process multiple lab tests simultaneously.

Requirements:

Update doctorController.js (requestLabTest):

Change the expected request body from a single testName (String) to testNames (Array of Strings).

Map over the testNames array and use LabOrder.insertMany() to create a separate LabOrder document for each requested test, all linked to the same appointmentId, patientId, and facilityId.

Keep the logic that updates the Appointment status to 'Lab Pending'. Return the array of created lab orders in the response.

# Prompt 11.2: Frontend - Dynamic Custom Lab Requests
Task: Upgrade the Lab Request section in the Doctor Dashboard to support multiple custom test entries.

Requirements:

Update ConsultationPanel.jsx:

Replace the single lab test dropdown with a local state array: const [labTests, setLabTests] = useState([]).

UI Layout: Create a flex row containing a text input field (with the placeholder: "Enter custom lab test name (e.g., CBC, MRI Brain)") and an "Add" button.

List Display: Below the input, map through the labTests array and render them as small pill/badges with an "X" icon to remove them if the doctor makes a mistake.

Submission: Update the "Send to Lab" button to pass the entire labTests array to the updated backend API, then clear the input fields and remove the patient from the screen.

# Prompt 12.1: Unified Patient Registration (Backend Fix)
Task: Synchronize the Patient and User creation logic so patients can log in regardless of who registered them.

Requirements:

Update Receptionist createPatient controller: When the receptionist adds a new patient, the backend MUST first create a User document (Role: 'Patient', Phone: patient's phone, Password: a default like 'Sahay@123' or their DOB). Then, create the Patient document and link it to the newly created User._id.

Update Public register controller (Self-Registration): When a patient registers themselves on the landing page, the backend MUST first create the User document with their chosen password, and then immediately create a blank Patient document (containing their name, phone, and demographic data) linked to that User._id.

Schema Check: Ensure the Patient schema has a userId field referencing the User collection, and the User schema has a patientProfileId referencing the Patient collection (two-way binding).

# Prompt 12.2: Fix Receptionist Search & Patient Login
Task: Fix the receptionist search API to find all patients globally, and ensure patient login routes correctly.

Requirements:

Update searchPatients API (Receptionist): Modify the query to search the unified Patient collection using a regex on firstName, lastName, or contactPhone. It must return all patients in the database, regardless of whether they were created by a receptionist or via self-registration.

Update patientLogin API: When a patient logs in from the landing page using their phone and password, the backend must return both their User token AND their linked Patient._id.

Frontend Alert: Update the Receptionist's "Add Patient" UI to display a small success message after creation: "Patient registered. They can log in using their phone number and default password: Sahay@123".