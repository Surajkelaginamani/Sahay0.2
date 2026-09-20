import express from 'express';
import EpidemicAlert from '../models/EpidemicAlert.js';
import { runEpidemicScanner, seedDemoAlertsIfEmpty } from '../../cron/epidemicScanner.js';

const router = express.Router();

/**
 * GET /api/admin/epidemic-alerts
 * Fetches all active, unresolved alerts from the EpidemicAlerts collection
 */
router.get('/epidemic-alerts', async (req, res) => {
  try {
    // If collection is empty, trigger initial check/seed so demo is always live
    const count = await EpidemicAlert.countDocuments();
    if (count === 0) {
      await seedDemoAlertsIfEmpty();
    }

    const alerts = await EpidemicAlert.find({
      status: { $in: ['active', 'investigating'] },
    })
      .sort({ severity: 1, caseCount: -1, lastDetectedAt: -1 })
      .lean();

    // Map format to ensure coordinates are readily available in various formats (lat, lng, coordinates array)
    const formattedAlerts = alerts.map((a) => ({
      ...a,
      id: a._id.toString(),
      lat: a.coordinates?.lat ?? 19.09,
      lng: a.coordinates?.lng ?? 74.74,
      position: [a.coordinates?.lat ?? 19.09, a.coordinates?.lng ?? 74.74],
    }));

    return res.status(200).json({
      success: true,
      count: formattedAlerts.length,
      alerts: formattedAlerts,
    });
  } catch (error) {
    console.error('[adminRoutes] Error fetching epidemic alerts:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch epidemic alerts',
      error: error.message,
    });
  }
});

/**
 * POST /api/admin/epidemic-alerts/scan
 * Manually triggers an aggregation scan
 */
router.post('/epidemic-alerts/scan', async (req, res) => {
  try {
    const { threshold, timeWindowHours } = req.body || {};
    const results = await runEpidemicScanner({
      threshold: threshold ? Number(threshold) : undefined,
      timeWindowHours: timeWindowHours ? Number(timeWindowHours) : undefined,
    });

    return res.status(200).json({
      success: true,
      message: `Outbreak scan completed. Found ${results.length} active alerts.`,
      alerts: results,
    });
  } catch (error) {
    console.error('[adminRoutes] Error running manual epidemic scan:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to execute epidemic scan',
      error: error.message,
    });
  }
});

/**
 * POST /api/admin/epidemic-alerts/seed-demo
 * Seeds demo outbreak data around Ahilyanagar & Kopargaon
 */
router.post('/epidemic-alerts/seed-demo', async (req, res) => {
  try {
    await seedDemoAlertsIfEmpty();
    const alerts = await EpidemicAlert.find({ status: 'active' }).lean();
    return res.status(200).json({
      success: true,
      message: 'Seeded localized demo alerts for Ahilyanagar & Kopargaon',
      alerts,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to seed demo alerts',
      error: error.message,
    });
  }
});

/**
 * PATCH /api/admin/epidemic-alerts/:id/status
 * Updates status of an alert (e.g. to 'investigating' or 'resolved')
 */
router.patch('/epidemic-alerts/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const alert = await EpidemicAlert.findByIdAndUpdate(
      req.params.id,
      { $set: { status, updatedAt: new Date() } },
      { new: true }
    );
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }
    return res.status(200).json({ success: true, alert });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
