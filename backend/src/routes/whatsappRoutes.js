import express from 'express';
import {
  verifyWebhook,
  handleWebhook,
  testMessageSimulation,
} from '../controllers/whatsappController.js';

const router = express.Router();

// 1. Webhook Verification (GET /api/whatsapp/webhook)
router.get('/webhook', verifyWebhook);

// 2. Message Receiver (POST /api/whatsapp/webhook)
router.post('/webhook', handleWebhook);

// 3. Local Test Simulation (POST /api/whatsapp/test-message)
router.post('/test-message', testMessageSimulation);

export default router;
