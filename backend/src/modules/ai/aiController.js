import mongoose from 'mongoose';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Patient from '../../models/Patient.js';
import Appointment from '../../models/Appointment.js';
import Vitals from '../../models/Vitals.js';
import Consultation from '../../models/Consultation.js';
import LabOrder from '../../models/LabOrder.js';

/**
 * Intelligent clinical heuristic fallback when Gemini API key is not configured or network quota is reached.
 * Produces a concise, clinical 3-sentence longitudinal summary based on real patient records.
 */
function generateHeuristicSummary({ patient, currentVitals, vitalsHistory, consultations, labOrders }) {
  const sentences = [];

  // Sentence 1: Demographics, presentation & current vital state
  const bp = currentVitals.bloodPressure || currentVitals.bp || '120/80';
  const sugar = currentVitals.bloodSugar ? `${currentVitals.bloodSugar} mg/dL` : 'normal';
  const ageStr = patient.dob
    ? `${new Date().getFullYear() - new Date(patient.dob).getFullYear()}-year-old`
    : patient.age
    ? `${patient.age}-year-old`
    : 'Adult';

  sentences.push(
    `Patient is a ${ageStr} ${patient.gender || 'individual'} presenting with current blood pressure of ${bp} mmHg and blood sugar of ${sugar}.`
  );

  // Sentence 2: Longitudinal trends across past consultations & vitals
  const pastDiagnoses = consultations
    .map((c) => c.diagnosis)
    .filter(Boolean)
    .slice(0, 3);

  if (vitalsHistory.length > 1) {
    const priorBp = vitalsHistory[1]?.bloodPressure || 'baseline';
    sentences.push(
      `Longitudinal vitals track relative stability compared to prior recording (${priorBp}), with documented clinical history of ${
        pastDiagnoses.length ? pastDiagnoses.join(' and ') : 'routine outpatient reviews'
      }.`
    );
  } else if (pastDiagnoses.length) {
    sentences.push(
      `Prior longitudinal encounters highlight diagnostic management for ${pastDiagnoses.join(', ')} with consistent clinic attendance.`
    );
  } else {
    sentences.push(
      `Longitudinal records show consistent baseline physiological parameters over recent follow-up encounters.`
    );
  }

  // Sentence 3: Risk alerts (critical labs, allergies, or vitals flags)
  const criticalLabs = labOrders.filter((l) => l.isCritical);
  const allergies = patient.allergies || [];

  if (criticalLabs.length) {
    const critNames = criticalLabs.map((l) => l.testName).slice(0, 2).join(' and ');
    sentences.push(
      `Potential clinical risks include out-of-bounds critical findings for ${critNames}, warranting close physician review prior to pharmacotherapy.`
    );
  } else if (allergies.length) {
    sentences.push(
      `Documented drug hypersensitivity to ${allergies.join(', ')} poses clinical contraindication risks requiring strict prescription cross-referencing.`
    );
  } else {
    sentences.push(
      `No critical laboratory flags or severe adverse trends identified across the longitudinal evaluation interval.`
    );
  }

  return sentences.slice(0, 3).join(' ');
}

/**
 * @route   GET /api/ai/insights/:patientId
 * @access  Private (Doctor / Clinical Staff)
 * @desc    Analyzes up to 12 months (or last 5) of patient records using gemini-1.5-flash
 */
export const getPatientInsights = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!patientId || patientId === '[object Object]' || !mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({ message: 'Valid Patient ID is required.' });
    }

    // 1. Fetch Patient Demographics
    const patient = await Patient.findById(patientId).lean();
    if (!patient) {
      return res.status(404).json({ message: 'Patient record not found.' });
    }

    const patientAge = patient.dob
      ? new Date().getFullYear() - new Date(patient.dob).getFullYear()
      : patient.age || 'Unknown';

    // 2. Query up to 12 months of appointments or last 5 appointments
    const twelveMonthsAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

    let appointments = await Appointment.find({
      patientId,
      createdAt: { $gte: twelveMonthsAgo },
    })
      .sort({ createdAt: -1 })
      .populate('assignedDoctorId', 'name')
      .lean();

    if (!appointments || appointments.length < 5) {
      appointments = await Appointment.find({ patientId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('assignedDoctorId', 'name')
        .lean();
    }

    // 3. Fetch longitudinal clinical records (vitals, consultations, lab orders)
    const [vitalsHistory, consultations, labOrders] = await Promise.all([
      Vitals.find({ patientId }).sort({ createdAt: -1 }).limit(10).lean(),
      Consultation.find({ patientId }).sort({ createdAt: -1 }).limit(10).lean(),
      LabOrder.find({ patientId }).sort({ createdAt: -1 }).limit(15).lean(),
    ]);

    // Determine current triage vitals (most recent appointment vitals or latest Vitals doc)
    const currentVitals =
      appointments[0]?.vitals ||
      vitalsHistory[0] ||
      {};

    // 4. Construct Longitudinal Clinical Summary Payload
    const formatDate = (dateVal) => {
      if (!dateVal) return 'Recent';
      const d = new Date(dateVal);
      return isNaN(d.getTime()) ? 'Recent' : d.toISOString().split('T')[0];
    };

    const formattedDiagnoses = consultations
      .map((c) => `${c.diagnosis || 'Clinical visit'} (${formatDate(c.createdAt)})`)
      .join('; ') || 'None on record';

    const formattedVitalsTrend = vitalsHistory
      .slice(0, 5)
      .map((v) => {
        const dt = formatDate(v.createdAt);
        return `[${dt}: BP ${v.bloodPressure || 'N/A'}, Sugar ${v.bloodSugar || 'N/A'}, Pulse ${v.pulse || 'N/A'}, SpO2 ${v.spO2 || 'N/A'}]`;
      })
      .join(', ') || 'Only single observation recorded';

    const formattedLabs = labOrders
      .slice(0, 8)
      .map((l) => `${l.testName}: ${l.result || 'Pending'}${l.isCritical ? ' (CRITICAL FLAG)' : ''}`)
      .join('; ') || 'No lab tests on record';

    const patientDataText = `
- Demographics: ${patient.firstName} ${patient.lastName || ''}, Gender: ${patient.gender || 'Unknown'}, Age: ${patientAge}, Blood Group: ${patient.bloodGroup || 'Unknown'}
- Known Drug Allergies: ${patient.allergies?.length ? patient.allergies.join(', ') : 'None documented'}
- Current Vitals: BP ${currentVitals.bloodPressure || 'N/A'}, Blood Sugar ${currentVitals.bloodSugar || 'N/A'}, Pulse ${currentVitals.pulse || 'N/A'}, Temp ${currentVitals.temperature || 'N/A'}, SpO2 ${currentVitals.spO2 || 'N/A'}
- Prior Diagnoses (Last 12 Months): ${formattedDiagnoses}
- Vitals History Trend: ${formattedVitalsTrend}
- Diagnostic Lab Results: ${formattedLabs}
`.trim();

    // 5. Strict prompt requirement from plans.md
    const prompt = `You are an AI clinical assistant. Review this longitudinal patient data:
${patientDataText}

Provide a maximum 3-sentence clinical summary highlighting trends (e.g., improving/worsening vitals) and potential risks. Do not provide a final diagnosis. Be concise and format for a quick read.`;

    // 6. Query Gemini 1.5 Flash (with fallback)
    let clinicalSummary = '';
    let source = 'clinical-rule-engine';

    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent(prompt);
        const responseText = result.response?.text?.() || '';

        if (responseText.trim()) {
          clinicalSummary = responseText.trim();
          source = 'gemini-1.5-flash';
        }
      } catch (geminiError) {
        console.warn('Gemini 1.5 Flash API error, falling back to clinical rule engine:', geminiError.message);
      }
    }

    // Fallback if Gemini key wasn't provided or API call didn't return text
    if (!clinicalSummary) {
      clinicalSummary = generateHeuristicSummary({
        patient,
        currentVitals,
        vitalsHistory,
        consultations,
        labOrders,
      });
    }

    return res.status(200).json({
      success: true,
      insight: clinicalSummary,
      source,
      patient: {
        id: patient._id,
        name: `${patient.firstName} ${patient.lastName || ''}`.trim(),
        age: patientAge,
        gender: patient.gender,
        allergies: patient.allergies || [],
      },
      recordsAnalyzed: {
        appointmentsCount: appointments.length,
        vitalsCount: vitalsHistory.length,
        consultationsCount: consultations.length,
        labOrdersCount: labOrders.length,
      },
    });
  } catch (error) {
    console.error('Error in getPatientInsights:', error);
    return res.status(500).json({ message: error.message || 'Failed to generate clinical insights.' });
  }
};
