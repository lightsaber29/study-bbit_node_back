import express from 'express';
import { handleWebhook, getConnectionDetails } from '../controllers/livekitController.js';

const router = express.Router();

router.post('/webhook', handleWebhook);
router.get('/connection-details', getConnectionDetails);

export default router;