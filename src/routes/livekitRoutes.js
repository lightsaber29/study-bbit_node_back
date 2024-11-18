import express from 'express';
import { handleWebhook, getConnectionDetails } from '../controllers/livekitController.js';

const router = express.Router();

router.post('/livekit/webhook', handleWebhook);
router.get('/api/connection-details', getConnectionDetails);

export default router;