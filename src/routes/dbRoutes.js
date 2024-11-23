import express from 'express';
import { 
    createMmSummary,
    listMmSummary,
    oneMmSummary,
    deleteMmSummary
} from '../controllers/dbController.js';

const router = express.Router();

router.post('/api/express/create-mm-summary', createMmSummary);
router.get('/api/express/list-mm-summary', listMmSummary);
router.get('/api/express/one-mm-summary/:mmSummaryId', oneMmSummary);
router.delete('/api/express/delete-mm-summary/:mmSummaryId', deleteMmSummary);

export default router;