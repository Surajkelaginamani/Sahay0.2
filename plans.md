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