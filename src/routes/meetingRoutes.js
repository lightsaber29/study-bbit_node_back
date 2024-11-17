import express from 'express';
import { getMeetingDetails } from '../controllers/meetingController.js';

const router = express.Router();

router.get('/:meetingId', getMeetingDetails);

export default router;