# Prompt 16.1: Backend - Teleconsultation Schema & API
Task: Upgrade the Appointment schema and controllers to support live video teleconsultation rooms.

Requirements:

Schema Update (Appointment.js): Add a teleconsultRoomId (String) field and add 'Teleconsult Requested' and 'In Teleconsult' to the status enum.

Controller (nurseController.js): Create requestTeleconsult(req, res). Accept an appointmentId and a doctorId. Generate a unique room ID (e.g., Sahay-Tele-[appointmentId]-[timestamp]). Update the appointment with this teleconsultRoomId and set status to 'Teleconsult Requested'.

Controller (doctorController.js): Update getDoctorQueue to also fetch appointments with status 'Teleconsult Requested'. Create joinTeleconsult(req, res) to update the status to 'In Teleconsult'.

# Prompt 16.2: Frontend - Shared Jitsi Video Component
Task: Create a reusable WebRTC video component using the Jitsi React SDK.

Requirements:

Dependencies: Install the @jitsi/react-sdk package.

Component (frontend/src/components/common/VideoRoom.jsx):

Import JitsiMeeting from the SDK.

Accept props: roomName (the generated room ID), displayName (the logged-in user's name), and onClose (callback for when the call ends).

Configure the JitsiMeeting component to hide unnecessary UI elements (like screen sharing or inviting others) to keep it lightweight for rural bandwidth. Set the domain to meet.jit.si.

# Prompt 16.3: Frontend - Nurse & Doctor Dashboard Integration
Task: Embed the teleconsultation workflow into both the Nurse and Doctor workspaces.

Requirements:

Nurse Dashboard (NurseDashboard.jsx):

Add a "Request Teleconsultation" button next to patients in the Triage queue.

When clicked, open a modal to select a Specialist (Doctor), call the requestTeleconsult API, and then render the <VideoRoom/> component on the Nurse's screen, joining the generated room.

Doctor Dashboard (DoctorQueue.jsx & ConsultationPanel.jsx):

Update the queue sidebar to prominently flash/highlight incoming patients with the 'Teleconsult Requested' status.

When the Doctor clicks on this patient, display a "Join Video Call" button in the consultation panel.

Clicking it calls joinTeleconsult and renders the <VideoRoom/> component side-by-side with the clinical notes form, allowing the doctor to type prescriptions while talking to the nurse and patient.