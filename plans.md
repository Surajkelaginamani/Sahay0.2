Task: Upgrade the Autonomous Clinical Voice Scribe to use an LLM for structured JSON data extraction to auto-fill the SAHAY clinical evaluation form.

1. Backend LLM Route (server.js or new route file):

Create a POST route at /api/scribe/process.

It will receive { text: "raw messy transcript from frontend" }.

Integrate an LLM call (e.g., Gemini API, OpenAI, or whatever AI package is already in the project).

System Prompt for the LLM: "You are an expert medical scribe. Fix any speech-to-text transcription errors in the following text. Extract the medical data and return ONLY a valid JSON object with the following strict schema:

chief_complaints: array of strings

allergies: array of strings

final_diagnosis: string (infer a brief diagnosis based on the context, e.g., 'Acute Bronchitis')

clinical_notes: string (a professional medical summary of the transcript)

medicines: array of objects, each containing: { name: string, dosage: string, frequency: string (e.g., 'Twice daily after meals'), duration: string }"

Return this JSON object to the frontend.

2. Frontend Integration (DoctorDashboard.jsx):

Update the startListening function. When the speech recognition finishes (recognition.onend or a manual "Stop" button click), take the final transcript string and make an axios.post request to /api/scribe/process.

3. Auto-Filling the UI State:

When the backend returns the structured JSON, directly update the React state variables that control the form inputs shown in the UI.

For example:

setFinalDiagnosis(responseData.final_diagnosis)

setClinicalNotes(responseData.clinical_notes)

setPrescribedMedicines(responseData.medicines)

Ensure the input fields for "Final Diagnosis" and "Clinical Notes & Observations" have their value props tied to these state variables so they populate instantly on the screen.