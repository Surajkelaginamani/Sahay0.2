# Prompt 12.1: Backend - Audit Log Schema & Integration
Task: Create a lightweight audit trail to log every time a patient's medical record is accessed or modified.

Requirements:

New Schema (AuditLog.js): Create a collection with the following fields: action (String, e.g., 'VIEW_RECORD', 'EDIT_RECORD', 'DISPENSE_MEDS'), userId (ObjectId, referencing the Doctor/Nurse/Pharmacist who did it), patientUhid (String, referencing the patient), and timestamp (Date, default Date.now).

Controller Logic: Create a reusable backend function logAudit(action, userId, patientUhid).

Integration: Inject this function into your critical endpoints. For example, in the route where a doctor opens a file, call logAudit('VIEW_RECORD', req.user._id, patientUhid). In the route where a pharmacist dispenses meds, call logAudit('DISPENSE_MEDS', req.user._id, patientUhid).

# Prompt 12.2: Frontend - Admin Audit Viewer
Task: Provide a simple UI for hospital administrators to view the audit logs for compliance purposes.

Requirements:

Admin Dashboard (AdminDashboard.jsx): Add a new tab called "Security & Audit Logs".

Data Fetching: Fetch the logs from a new GET /api/audit/logs backend endpoint.

UI Table: Display the logs in a clean, chronological table showing: Date/Time | Action Performed | Staff Member Name | Patient UHID. Add a simple text input to filter the table by Patient UHID.