import express from 'express';
import { getMeetingDetails } from '../controllers/meetingController.js';
import { getMeetingTranscripts } from '../utils/storageUtils.js';

const router = express.Router();

// router.get('/:meetingId', getMeetingDetails);

// GET /api/meetings/:meetingId
router.get('/:meetingId', async (req, res) => {
    const { meetingId } = req.params;
  
    try {
      const transcripts = await getMeetingTranscripts(meetingId);
      res.status(200).json({ success: true, data: transcripts });
    } catch (error) {
      console.error('Error fetching transcripts:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch meeting transcripts' });
    }
  });

export default router;