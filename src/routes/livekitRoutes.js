import express from 'express';
import { 
    handleWebhook, 
    getConnectionDetails,
    listRooms,
    createRoom,
    deleteRoom,
    listParticipants
} from '../controllers/livekitController.js';

const router = express.Router();

router.post('/livekit/webhook', handleWebhook);
router.get('/api/connection-details', getConnectionDetails);

router.post('/api/create-room', createRoom);
router.get('/api/list-rooms', listRooms);
router.delete('/api/delete-room/:name', deleteRoom);

router.get('/api/list-participants/:roomName', listParticipants);

export default router;