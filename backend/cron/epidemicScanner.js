import cron from 'node-cron';
import mongoose from 'mongoose';
import Consultation from '../src/models/Consultation.js';
import Appointment from '../src/models/Appointment.js';
import EpidemicAlert from '../src/models/EpidemicAlert.js';

// Localized Pincode Coordinates for Ahilyanagar, Kopargaon & Maharashtra Region
export const MAHARASHTRA_PINCODE_COORDINATES = {
  '414001': { lat: 19.0952, lng: 74.7454, name: 'Ahilyanagar Central' },
  '414002': { lat: 19.1121, lng: 74.7290, name: 'Ahilyanagar Camp' },
  '414003': { lat: 19.0712, lng: 74.7610, name: 'Ahilyanagar MIDC' },
  '423601': { lat: 19.8864, lng: 74.4789, name: 'Kopargaon City' },
  '423603': { lat: 19.8450, lng: 74.4310, name: 'Kopargaon Rural' },
  '422605': { lat: 19.5772, lng: 74.2120, name: 'Sangamner' },
  '413709': { lat: 19.6214, lng: 74.6621, name: 'Shrirampur' },
  '423107': { lat: 19.7668, lng: 74.4764, name: 'Shirdi / Rahata' },
  '414502': { lat: 19.3412, lng: 74.6541, name: 'Nevasa' },
  '413801': { lat: 18.7380, lng: 74.6890, name: 'Shrigonda' },
  '414402': { lat: 18.9950, lng: 75.0120, name: 'Shevgaon' },
  '414203': { lat: 19.1830, lng: 75.0510, name: 'Pathardi' },
  '422001': { lat: 19.9975, lng: 73.7898, name: 'Nashik' },
  '431001': { lat: 19.8762, lng: 75.3433, name: 'Chhatrapati Sambhajinagar' },
  '411001': { lat: 18.5204, lng: 73.8567, name: 'Pune' },
};

// Default fallback centered near Ahilyanagar / Kopargaon region (Latitude 19.09, Longitude 74.74)
export const DEFAULT_MAHARASHTRA_COORDS = { lat: 19.09, lng: 74.74 };

/**
 * Resolves coordinates from pincode, falling back to default Maharashtra coordinates
 */
export function getCoordinatesForPincode(pincode) {
  const cleanPin = String(pincode || '').trim();
  if (MAHARASHTRA_PINCODE_COORDINATES[cleanPin]) {
    return {
      lat: MAHARASHTRA_PINCODE_COORDINATES[cleanPin].lat,
      lng: MAHARASHTRA_PINCODE_COORDINATES[cleanPin].lng,
    };
  }
  // Subtle offset if unknown pincode to avoid overlapping exact point
  const hash = cleanPin.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const jitterLat = ((hash % 10) - 5) * 0.015;
  const jitterLng = (((hash >> 2) % 10) - 5) * 0.015;

  return {
    lat: Number((DEFAULT_MAHARASHTRA_COORDS.lat + jitterLat).toFixed(4)),
    lng: Number((DEFAULT_MAHARASHTRA_COORDS.lng + jitterLng).toFixed(4)),
  };
}

/**
 * Core MongoDB Aggregation & Epidemic Outbreak Scanner
 * Scans consultations and triage records created in the last 48 hours.
 * Groups by pincode and chiefComplaint.
 * Triggers alert if complaint occurs > threshold (default 10) times in one pincode.
 */
export async function runEpidemicScanner(options = {}) {
  const threshold = options.threshold ?? 10;
  const timeWindowHours = options.timeWindowHours ?? 48;
  const sinceDate = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);

  console.log(`[EpidemicRadar] Starting scan for window: last ${timeWindowHours}h (since ${sinceDate.toISOString()}), threshold > ${threshold}`);

  const detectedOutbreaks = [];

  try {
    // ── Pipeline 1: Scan Consultations ──────────────────────────────────────────
    const consultationAggregation = [
      {
        $match: {
          createdAt: { $gte: sinceDate },
          chiefComplaint: { $exists: true, $ne: null, $nin: ['', ' '] },
        },
      },
      {
        $lookup: {
          from: 'patients',
          localField: 'patientId',
          foreignField: '_id',
          as: 'patientData',
        },
      },
      {
        $addFields: {
          pincode: {
            $ifNull: [
              { $arrayElemAt: ['$patientData.address.pincode', 0] },
              '414001',
            ],
          },
          village: {
            $ifNull: [
              { $arrayElemAt: ['$patientData.address.village', 0] },
              'Ahilyanagar District',
            ],
          },
          complaint: { $trim: { input: '$chiefComplaint' } },
        },
      },
      {
        $match: {
          complaint: { $ne: '' },
          pincode: { $ne: '' },
        },
      },
      {
        $group: {
          _id: {
            pincode: '$pincode',
            chiefComplaint: '$complaint',
          },
          count: { $sum: 1 },
          village: { $first: '$village' },
          lastDetectedAt: { $max: '$createdAt' },
          firstDetectedAt: { $min: '$createdAt' },
        },
      },
      {
        $match: {
          count: { $gt: threshold },
        },
      },
    ];

    const consultResults = await Consultation.aggregate(consultationAggregation);

    // ── Pipeline 2: Scan Appointments / Triage Queue ────────────────────────────
    const appointmentAggregation = [
      {
        $match: {
          createdAt: { $gte: sinceDate },
          chiefComplaint: { $exists: true, $ne: null, $nin: ['', ' '] },
        },
      },
      {
        $lookup: {
          from: 'patients',
          localField: 'patientId',
          foreignField: '_id',
          as: 'patientData',
        },
      },
      {
        $addFields: {
          pincode: {
            $ifNull: [
              { $arrayElemAt: ['$patientData.address.pincode', 0] },
              '423601',
            ],
          },
          village: {
            $ifNull: [
              { $arrayElemAt: ['$patientData.address.village', 0] },
              'Kopargaon Region',
            ],
          },
          complaint: { $trim: { input: '$chiefComplaint' } },
        },
      },
      {
        $match: {
          complaint: { $ne: '' },
          pincode: { $ne: '' },
        },
      },
      {
        $group: {
          _id: {
            pincode: '$pincode',
            chiefComplaint: '$complaint',
          },
          count: { $sum: 1 },
          village: { $first: '$village' },
          lastDetectedAt: { $max: '$createdAt' },
          firstDetectedAt: { $min: '$createdAt' },
        },
      },
      {
        $match: {
          count: { $gt: threshold },
        },
      },
    ];

    const apptResults = await Appointment.aggregate(appointmentAggregation);

    // Merge and deduplicate by pincode + complaint
    const mergedMap = new Map();

    const processCluster = (item) => {
      const pin = String(item._id.pincode).trim();
      const complaint = String(item._id.chiefComplaint).trim();
      const key = `${pin}__${complaint.toLowerCase()}`;

      if (mergedMap.has(key)) {
        const existing = mergedMap.get(key);
        existing.count = Math.max(existing.count, item.count);
        if (item.lastDetectedAt > existing.lastDetectedAt) {
          existing.lastDetectedAt = item.lastDetectedAt;
        }
      } else {
        mergedMap.set(key, {
          pincode: pin,
          chiefComplaint: complaint,
          village: item.village || '',
          count: item.count,
          firstDetectedAt: item.firstDetectedAt || new Date(),
          lastDetectedAt: item.lastDetectedAt || new Date(),
        });
      }
    };

    consultResults.forEach(processCluster);
    apptResults.forEach(processCluster);

    console.log(`[EpidemicRadar] Aggregation found ${mergedMap.size} clusters exceeding threshold > ${threshold}`);

    // Persist or update alerts in EpidemicAlerts collection
    for (const cluster of mergedMap.values()) {
      const coords = getCoordinatesForPincode(cluster.pincode);

      const alertDoc = await EpidemicAlert.findOneAndUpdate(
        {
          pincode: cluster.pincode,
          chiefComplaint: cluster.chiefComplaint,
          status: 'active',
        },
        {
          $set: {
            pincode: cluster.pincode,
            village: cluster.village,
            chiefComplaint: cluster.chiefComplaint,
            caseCount: cluster.count,
            threshold,
            timeWindowHours,
            severity: 'CRITICAL',
            coordinates: {
              lat: coords.lat,
              lng: coords.lng,
              latitude: coords.lat,
              longitude: coords.lng,
            },
            lastDetectedAt: cluster.lastDetectedAt,
          },
          $setOnInsert: {
            firstDetectedAt: cluster.firstDetectedAt,
            status: 'active',
          },
        },
        { upsert: true, new: true }
      );

      detectedOutbreaks.push(alertDoc);
    }

    return detectedOutbreaks;
  } catch (err) {
    console.error('[EpidemicRadar] Error during aggregation scanner:', err);
    throw err;
  }
}

/**
 * Seeds demonstration alerts specifically for SIH demo localized around
 * Ahilyanagar (19.09, 74.74) and Kopargaon (19.88, 74.48)
 */
export async function seedDemoAlertsIfEmpty() {
  try {
    const count = await EpidemicAlert.countDocuments({ status: 'active' });
    if (count === 0) {
      console.log('[EpidemicRadar] No active alerts found. Seeding localized SIH demo outbreak data for Ahilyanagar & Kopargaon...');
      
      const demoData = [
        {
          pincode: '423601',
          village: 'Kopargaon Rural & Town',
          chiefComplaint: 'Fever and Severe Joint Pain',
          caseCount: 18,
          threshold: 10,
          timeWindowHours: 48,
          coordinates: {
            lat: 19.8864,
            lng: 74.4789,
            latitude: 19.8864,
            longitude: 74.4789,
          },
          status: 'active',
          severity: 'CRITICAL',
          firstDetectedAt: new Date(Date.now() - 36 * 60 * 60 * 1000),
          lastDetectedAt: new Date(),
        },
        {
          pincode: '414001',
          village: 'Ahilyanagar Central',
          chiefComplaint: 'Acute Watery Diarrhea & Dehydration',
          caseCount: 24,
          threshold: 10,
          timeWindowHours: 48,
          coordinates: {
            lat: 19.0952,
            lng: 74.7454,
            latitude: 19.0952,
            longitude: 74.7454,
          },
          status: 'active',
          severity: 'CRITICAL',
          firstDetectedAt: new Date(Date.now() - 28 * 60 * 60 * 1000),
          lastDetectedAt: new Date(),
        },
        {
          pincode: '422605',
          village: 'Sangamner Taluka',
          chiefComplaint: 'High Fever with Thrombocytopenia',
          caseCount: 14,
          threshold: 10,
          timeWindowHours: 48,
          coordinates: {
            lat: 19.5772,
            lng: 74.2120,
            latitude: 19.5772,
            longitude: 74.2120,
          },
          status: 'active',
          severity: 'CRITICAL',
          firstDetectedAt: new Date(Date.now() - 14 * 60 * 60 * 1000),
          lastDetectedAt: new Date(),
        },
      ];

      await EpidemicAlert.insertMany(demoData);
      console.log('[EpidemicRadar] Seeded 3 localized Maharashtra demo alerts successfully.');
    }
  } catch (err) {
    console.error('[EpidemicRadar] Could not seed demo alerts:', err.message);
  }
}

/**
 * Initializes the node-cron scheduled task running every hour (0 * * * *)
 */
export function initEpidemicScannerCron() {
  console.log('[EpidemicRadar] Initializing hourly epidemic scanner cron job: schedule(0 * * * *)...');
  
  // Run every hour at minute 0
  const task = cron.schedule('0 * * * *', async () => {
    console.log('[EpidemicRadar Cron] Triggering hourly epidemic outbreak scan...');
    try {
      const outbreaks = await runEpidemicScanner();
      console.log(`[EpidemicRadar Cron] Scan complete. ${outbreaks.length} active alerts processed.`);
    } catch (err) {
      console.error('[EpidemicRadar Cron] Hourly scan failed:', err);
    }
  });

  // Also trigger initial scan or seed upon startup asynchronously
  setTimeout(async () => {
    try {
      await runEpidemicScanner();
      await seedDemoAlertsIfEmpty();
    } catch (err) {
      console.warn('[EpidemicRadar] Initial scan/seed note:', err.message);
    }
  }, 2000);

  return task;
}

export default {
  initEpidemicScannerCron,
  runEpidemicScanner,
  seedDemoAlertsIfEmpty,
  getCoordinatesForPincode,
};
