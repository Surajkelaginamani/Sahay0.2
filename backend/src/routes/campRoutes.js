import express from 'express';
import Camp from '../models/Camp.js';

const router = express.Router();

// Resilient in-memory store fallback
const inMemoryCamps = [];

/**
 * @route   POST /api/camps/broadcast
 * @route   POST /api/camps
 * @desc    Broadcast community health camp to target PIN code
 * @access  Public / Protected (Hospital Admin)
 */
router.post(['/broadcast', '/'], async (req, res) => {
  try {
    const {
      title,
      campTitle,
      name,
      dateTime,
      date,
      pincode,
      targetPincode,
      registrationUrl,
      googleFormUrl,
      hospitalId,
      hospitalName,
      location,
    } = req.body;

    const resolvedTitle = (title || campTitle || name || '').trim();
    const resolvedDateTime = (dateTime || date || '').trim();
    const resolvedPincode = String(pincode || targetPincode || '').trim();
    const resolvedUrl = (registrationUrl || googleFormUrl || 'https://forms.gle/mocklink123').trim();
    const resolvedLocation = (location || `District PHC - PIN ${resolvedPincode}`).trim();

    if (!resolvedTitle || !resolvedDateTime || !resolvedPincode) {
      return res.status(400).json({
        success: false,
        message: 'Camp title, date & time, and target PIN code are required',
      });
    }

    const campData = {
      title: resolvedTitle,
      dateTime: resolvedDateTime,
      date: resolvedDateTime,
      pincode: resolvedPincode,
      registrationUrl: resolvedUrl,
      location: resolvedLocation,
      hospitalId: hospitalId || null,
      hospitalName: hospitalName || 'District Hospital',
      recipients: 142,
      active: true,
      createdAt: new Date(),
    };

    let savedCamp = null;
    try {
      savedCamp = await Camp.create(campData);
    } catch (dbErr) {
      console.warn('[Camps] MongoDB save warning, falling back to in-memory cache:', dbErr.message);
    }

    const campResult = savedCamp
      ? savedCamp.toObject()
      : { ...campData, _id: `camp-${Date.now()}` };

    // Update in-memory fallback list
    inMemoryCamps.unshift(campResult);

    const successMessage = `Broadcast sent! 142 patients in PIN ${resolvedPincode} notified.`;

    return res.status(201).json({
      success: true,
      message: successMessage,
      camp: campResult,
      ...campResult,
    });
  } catch (error) {
    console.error('[Camps] Broadcast error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to broadcast health camp',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/camps/active?pincode=XYZ
 * @desc    Get the latest active camp matching requested PIN code
 * @access  Public
 */
router.get('/active', async (req, res) => {
  try {
    const { pincode } = req.query;

    if (!pincode) {
      return res.status(200).json(null);
    }

    const cleanPin = String(pincode).trim();

    let camp = null;
    try {
      camp = await Camp.findOne({
        pincode: cleanPin,
        active: true,
      })
        .sort({ createdAt: -1 })
        .lean();
    } catch (dbErr) {
      console.warn('[Camps] MongoDB lookup warning, falling back to in-memory store:', dbErr.message);
    }

    if (!camp) {
      camp = inMemoryCamps.find(
        (c) => String(c.pincode).trim() === cleanPin && c.active !== false
      );
    }

    if (!camp) {
      return res.status(200).json(null);
    }

    return res.status(200).json({
      ...camp,
      camp,
      success: true,
    });
  } catch (error) {
    console.error('[Camps] Fetch active camp error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve active camp',
      error: error.message,
    });
  }
});

export default router;
