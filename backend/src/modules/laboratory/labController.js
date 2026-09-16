import DiagnosticOrder from '../../models/DiagnosticOrder.js';
import DiagnosticReport from '../../models/DiagnosticReport.js';
import LabOrder from '../../models/LabOrder.js';
import Appointment from '../../models/Appointment.js';
import labCatalog, { findCatalogTest } from '../../utils/labCatalog.js';

// @desc    Aggregates counts of DiagnosticOrders grouped by status for user's facilityId
// @route   GET /api/lab/metrics
// @access  Private (LabHead)
export const getLabMetrics = async (req, res) => {
  try {
    const facilityId = req.user.hospitalId;
    if (!facilityId) {
      return res.status(400).json({ message: 'User is not linked to any healthcare facility.' });
    }

    const counts = await DiagnosticOrder.aggregate([
      { $match: { facilityId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const metrics = {
      Ordered: 0,
      SampleCollected: 0,
      Processing: 0,
      Completed: 0,
      total: 0,
    };

    counts.forEach((item) => {
      if (metrics.hasOwnProperty(item._id)) {
        metrics[item._id] = item.count;
      }
      metrics.total += item.count;
    });

    res.status(200).json(metrics);
  } catch (error) {
    console.error('Error fetching lab metrics:', error);
    res.status(500).json({ message: error.message || 'Server error fetching lab metrics' });
  }
};

// @desc    Fetches all DiagnosticOrders for the user's facilityId sorted by date
// @route   GET /api/lab/queue
// @access  Private (LabHead)
export const getTestQueue = async (req, res) => {
  try {
    const facilityId = req.user.hospitalId;
    if (!facilityId) {
      return res.status(400).json({ message: 'User is not linked to any healthcare facility.' });
    }

    const { status } = req.query;
    const query = { facilityId };
    if (status) {
      query.status = status;
    }

    const queue = await DiagnosticOrder.find(query)
      .populate('patientId', 'firstName lastName uhid contactPhone email')
      .populate('doctorId', 'name email')
      .sort({ orderDate: -1, createdAt: -1 });

    res.status(200).json(queue);
  } catch (error) {
    console.error('Error fetching test queue:', error);
    res.status(500).json({ message: error.message || 'Server error fetching test queue' });
  }
};

// @desc    Updates the status of a specific order
// @route   PUT /api/lab/orders/:id/status
// @access  Private (LabHead)
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const facilityId = req.user.hospitalId;

    const validStatuses = ['Ordered', 'SampleCollected', 'Processing', 'Completed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const order = await DiagnosticOrder.findOne({ _id: id, facilityId });
    if (!order) {
      return res.status(404).json({ message: 'Diagnostic order not found for this facility.' });
    }

    order.status = status;
    await order.save();

    res.status(200).json({
      message: 'Order status updated successfully',
      order,
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: error.message || 'Server error updating order status' });
  }
};

// @desc    Creates a new DiagnosticReport linked to an order and marks order as Completed
// @route   POST /api/lab/reports
// @access  Private (LabHead)
export const submitReport = async (req, res) => {
  try {
    const facilityId = req.user.hospitalId;
    const { orderId, resultText, fileUrl, verificationStatus } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: 'Order ID is required to submit a report.' });
    }

    const order = await DiagnosticOrder.findOne({ _id: orderId, facilityId });
    if (!order) {
      return res.status(404).json({ message: 'Associated diagnostic order not found for this facility.' });
    }

    const report = await DiagnosticReport.create({
      orderId: order._id,
      patientId: order.patientId,
      labHeadId: req.user._id,
      resultText: resultText || '',
      fileUrl: fileUrl || '',
      verificationStatus: verificationStatus || 'Pending',
      completedDate: new Date(),
    });

    order.status = 'Completed';
    await order.save();

    res.status(201).json({
      message: 'Diagnostic report submitted and order marked as Completed.',
      report,
      order,
    });
  } catch (error) {
    console.error('Error submitting diagnostic report:', error);
    res.status(500).json({ message: error.message || 'Server error submitting report' });
  }
};

// ─── Prompt 8.3: Lab Head Pending Tests & Report Upload ──────────────────────

// @desc    Fetch pending LabOrder requests for the Lab Head's facility
// @route   GET /api/lab/pending-tests
// @access  Private (LabHead)
export const getPendingTests = async (req, res) => {
  try {
    const facilityId = req.user.hospitalId;
    if (!facilityId) {
      return res.status(400).json({ message: 'User is not linked to any healthcare facility.' });
    }

    const { status } = req.query;
    const query = {
      facilityId,
      status: status || { $in: ['Requested', 'Sample Collected'] },
    };

    const pendingTests = await LabOrder.find(query)
      .populate('patientId', 'firstName lastName contactPhone gender dob abhaId bloodGroup uhid')
      .populate('doctorId', 'name email')
      .populate('appointmentId', 'appointmentDate queueNumber priority visitType status')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: pendingTests.length,
      tests: pendingTests,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Error fetching pending lab tests.' });
  }
};

// Helper function to extract first numeric value from result text (Prompt 6.1)
export const parseNumericResult = (text) => {
  if (typeof text === 'number') return text;
  if (!text || typeof text !== 'string') return null;
  const match = text.match(/[-+]?\d*\.?\d+/);
  if (!match) return null;
  const num = parseFloat(match[0]);
  return isNaN(num) ? null : num;
};

// @desc    Upload test report, mark LabOrder as Completed, and transition Appointment to 'Reports Ready'
// @route   POST /api/lab/upload-report or POST /api/lab/complete-order
// @access  Private (LabHead)
export const uploadReport = async (req, res) => {
  try {
    const facilityId = req.user.hospitalId;
    const { labOrderId, orderId, resultText, result, resultURL, notes } = req.body;
    const targetId = labOrderId || orderId;

    if (!targetId) {
      return res.status(400).json({ message: 'Lab Order ID is required.' });
    }

    const labOrder = await LabOrder.findOne({ _id: targetId, facilityId });
    if (!labOrder) {
      return res.status(404).json({ message: 'Lab order not found for this facility.' });
    }

    const findingsText = String(resultText || result || resultURL || '').trim();

    // Prompt 6.1: Check if submitted resultText falls outside catalog min and max
    const testName = labOrder.testName || '';
    const catalogItem = findCatalogTest(testName) || labCatalog.find(
      (t) => (typeof t === 'string' ? t : t.name).toLowerCase() === testName.toLowerCase()
    );

    let isCritical = false;
    let criticalReason = '';

    if (catalogItem) {
      const min = catalogItem.normalRange?.min ?? catalogItem.min;
      const max = catalogItem.normalRange?.max ?? catalogItem.max;
      const unit = catalogItem.normalRange?.unit || catalogItem.unit || '';

      if (typeof min === 'number' && typeof max === 'number') {
        const numVal = parseNumericResult(findingsText);
        if (numVal !== null) {
          if (numVal < min) {
            isCritical = true;
            criticalReason = `Result ${numVal} ${unit} is below normal reference range (${min} - ${max} ${unit})`;
          } else if (numVal > max) {
            isCritical = true;
            criticalReason = `Result ${numVal} ${unit} exceeds normal reference range (${min} - ${max} ${unit})`;
          }
        }
      }
    }

    // 1. Update LabOrder to 'Completed' (Prompt 8.3 & Prompt 6.1)
    labOrder.status = 'Completed';
    labOrder.result = findingsText;
    labOrder.resultText = findingsText;
    labOrder.resultURL = resultURL || findingsText;
    labOrder.isCritical = isCritical;
    labOrder.criticalReason = criticalReason;
    if (notes) labOrder.notes = notes.trim();
    await labOrder.save();

    // 2. Update associated Appointment to 'Reports Ready' (Prompt 8.3 & Prompt 6.1)
    let appointment = null;
    if (labOrder.appointmentId) {
      appointment = await Appointment.findById(labOrder.appointmentId);
      if (appointment) {
        appointment.status = 'Reports Ready';
        if (isCritical) {
          appointment.isCriticalLab = true;
        } else {
          const otherCritical = await LabOrder.exists({
            appointmentId: labOrder.appointmentId,
            _id: { $ne: labOrder._id },
            isCritical: true,
          });
          if (otherCritical) {
            appointment.isCriticalLab = true;
          }
        }
        if (appointment.investigationAdvice && appointment.investigationAdvice.length > 0) {
          appointment.investigationAdvice.forEach((inv) => {
            if (inv.testName === labOrder.testName || !inv.status || inv.status === 'Ordered') {
              inv.status = 'Completed';
            }
          });
        }
        await appointment.save();
      }
    }

    res.status(200).json({
      success: true,
      message: isCritical
        ? 'Lab report uploaded. CRITICAL VALUE FLAGGED: Test result is outside normal reference range.'
        : 'Lab report uploaded successfully and appointment updated to Reports Ready.',
      labOrder,
      appointment,
      isCritical,
      criticalReason,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Error uploading lab report.' });
  }
};

// Prompt 6.1: completeLabOrder alias
export const completeLabOrder = uploadReport;

// @desc    Returns the standardized list of diagnostic tests with normal ranges
// @route   GET /api/labs/catalog or GET /api/lab/catalog
// @access  Public / Authenticated (Doctor, Nurse, LabHead)
export const getLabCatalog = async (req, res) => {
  try {
    res.status(200).json(labCatalog);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error fetching lab catalog' });
  }
};

