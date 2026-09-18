import { calculateEstimatedWaitTime } from '../../services/queuePredictionService.js';

// GET /api/queue/patient-status/:appointmentId
export const getPatientQueueStatus = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    if (!appointmentId) {
      return res.status(400).json({ success: false, message: 'appointmentId is required.' });
    }

    const queueData = await calculateEstimatedWaitTime(appointmentId);

    res.status(200).json({ success: true, queueData });
  } catch (error) {
    if (error.message === 'Appointment not found.') {
      return res.status(404).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};
