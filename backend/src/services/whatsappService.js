import axios from 'axios';
import Patient from '../models/Patient.js';
import Appointment from '../models/Appointment.js';

/**
 * Sends a message back to the user using Meta WhatsApp Cloud API
 * POST https://graph.facebook.com/v25.0/${process.env.META_PHONE_NUMBER_ID}/messages
 */
export async function sendWhatsAppMessage(to, bodyText) {
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.error('[WhatsApp Bot] Missing META_PHONE_NUMBER_ID or META_ACCESS_TOKEN in env');
    return null;
  }

  const url = `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: {
      preview_url: false,
      body: bodyText,
    },
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    console.log(`[WhatsApp Bot] Message sent to ${to}: "${bodyText}" (status: ${response.status})`);
    return response.data;
  } catch (error) {
    console.error("Meta API Error:", error.response?.data || error.message);
    throw error;
  }
}

/**
 * Safely queries MongoDB for Patient Queue status by UHID
 * @param {string} text - Message text containing UHID
 * @returns {Promise<string>} - Reply text
 */
export async function getQueuePositionForUhid(text) {
  try {
    // Extract UHID (e.g., SAH-12345 or SAH-202609-96555)
    const match = text.match(/sah-[a-z0-9-]+/i);
    const rawUhid = match ? match[0].trim() : text.trim();
    const uhidQuery = rawUhid.toUpperCase();

    // 1. Check for demo UHID "SAH-12345"
    if (uhidQuery === 'SAH-12345') {
      // Check if patient exists, else return the standard hackathon demo response
      const p = await Patient.findOne({ uhid: /^SAH-12345$/i }).lean();
      if (!p) {
        return 'Your Token is active. There are 2 patients ahead of you.';
      }
    }

    // 2. Find patient in MongoDB (exact or partial regex match)
    let patient = await Patient.findOne({
      uhid: { $regex: new RegExp(`^${uhidQuery}$`, 'i') },
    }).lean();

    if (!patient) {
      patient = await Patient.findOne({
        uhid: { $regex: new RegExp(uhidQuery, 'i') },
      }).lean();
    }

    if (!patient) {
      return 'UHID not found.';
    }

    // 3. Find active appointment for this patient in queue
    const activeStatuses = [
      'Waiting for Doctor',
      'Waiting',
      'CheckedIn',
      'At Triage',
      'In Consultation',
      'In Teleconsult',
      'Scheduled',
    ];

    let appointment = await Appointment.findOne({
      patientId: patient._id,
      status: { $in: activeStatuses },
    }).sort({ createdAt: -1 });

    // Fallback: check if any appointment exists
    if (!appointment) {
      appointment = await Appointment.findOne({ patientId: patient._id }).sort({ createdAt: -1 });
    }

    if (!appointment) {
      return 'UHID not found.';
    }

    // 4. Calculate patients ahead in the queue
    let countQuery = {
      status: {
        $in: ['Waiting for Doctor', 'Waiting', 'CheckedIn', 'At Triage', 'In Consultation', 'In Teleconsult'],
      },
    };

    if (appointment.assignedDoctorId) {
      countQuery.assignedDoctorId = appointment.assignedDoctorId;
    } else if (appointment.facilityId) {
      countQuery.facilityId = appointment.facilityId;
    }

    if (appointment.queueNumber != null) {
      countQuery.queueNumber = { $lt: appointment.queueNumber };
    } else {
      countQuery.createdAt = { $lt: appointment.createdAt };
      countQuery._id = { $ne: appointment._id };
    }

    const patientsAhead = await Appointment.countDocuments(countQuery);

    return `Your Token is active. There are ${patientsAhead} patients ahead of you.`;
  } catch (error) {
    console.error('[WhatsApp Bot] Error querying patient queue:', error);
    return 'UHID not found.';
  }
}

/**
 * Evaluates the incoming message text and generates the appropriate reply
 * @param {string} rawText
 * @returns {Promise<string>}
 */
export async function evaluateBotResponse(rawText) {
  const text = (rawText || '').trim().toLowerCase();

  if (text === 'hi' || text === 'hello') {
    return 'Welcome to SAHAY. Reply 1 to check your Live Queue Status.';
  }

  if (text === '1') {
    return 'Please enter your SAHAY UHID (e.g., SAH-12345).';
  }

  if (text.includes('sah-')) {
    return await getQueuePositionForUhid(rawText);
  }

  return "Welcome to SAHAY. Reply 'hi' or reply 1 to check your Live Queue Status.";
}

export default {
  sendWhatsAppMessage,
  getQueuePositionForUhid,
  evaluateBotResponse,
};
