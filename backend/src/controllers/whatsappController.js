import {
  evaluateBotResponse,
  sendWhatsAppMessage,
} from '../services/whatsappService.js';

/**
 * 1. Webhook Verification (GET /api/whatsapp/webhook)
 * Verifies with Meta using hub.mode, hub.verify_token, and hub.challenge
 */
export const verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'] || req.query?.hub?.mode;
  const token = req.query['hub.verify_token'] || req.query?.hub?.verify_token;
  const challenge = req.query['hub.challenge'] || req.query?.hub?.challenge;

  const expectedToken = process.env.META_VERIFY_TOKEN;

  console.log(`[WhatsApp Webhook] Verification request: mode=${mode}, token=${token ? '***' : 'none'}`);

  if (mode === 'subscribe' && token === expectedToken) {
    console.log('[WhatsApp Webhook] Verification successful. Returning challenge.');
    // Must return the hub.challenge directly as a raw string with a 200 status
    return res.status(200).send(String(challenge));
  } else {
    console.warn('[WhatsApp Webhook] Verification failed. Mode or token mismatch.');
    return res.sendStatus(403);
  }
};

/**
 * 2. Message Receiver (POST /api/whatsapp/webhook)
 * Handles incoming WhatsApp messages from Meta
 */
export const handleWebhook = async (req, res) => {
  console.log("Incoming Webhook payload:", JSON.stringify(req.body, null, 2));

  // Step 1: Immediately return a 200 OK status to Meta before processing the message
  // (to prevent timeout retries)
  res.status(200).send('EVENT_RECEIVED');

  try {
    // Step 2: Extract incoming message safely
    const message = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message) {
      // Ignored: status updates (delivery/read receipts) or ping events
      return;
    }

    const from = message.from;
    const body = message.text?.body;

    if (!from || !body) {
      console.log(`[WhatsApp Webhook] Received non-text message type or missing sender: type=${message.type}`);
      return;
    }

    console.log(`[WhatsApp Bot] Received message from ${from}: "${body}"`);

    // Step 3: Evaluate bot reply logic
    const replyText = await evaluateBotResponse(body);

    console.log(`[WhatsApp Bot] Replying to ${from}: "${replyText}"`);

    // Step 4: Send reply back to Meta API
    await sendWhatsAppMessage(from, replyText);
  } catch (error) {
    console.error("Meta API Error:", error.response?.data || error.message);
  }
};

/**
 * Local simulation endpoint (POST /api/whatsapp/test-message)
 * Allows testing the bot logic directly via curl or frontend
 */
export const testMessageSimulation = async (req, res) => {
  try {
    const { from = '919999999999', text = 'hi', sendToMeta = false } = req.body;
    const reply = await evaluateBotResponse(text);

    let metaResult = null;
    if (sendToMeta) {
      metaResult = await sendWhatsAppMessage(from, reply);
    }

    return res.status(200).json({
      success: true,
      input: { from, text },
      reply,
      metaResult,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
