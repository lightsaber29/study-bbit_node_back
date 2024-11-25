import express from 'express';
import { 
    handleWebhook, 
    getConnectionDetails,
    listRooms,
    createRoom,
    findRoom,
    deleteRoom,
    listParticipants
} from '../controllers/livekitController.js';

const router = express.Router();

router.post('/livekit/webhook', handleWebhook);
router.get('/api/express/connection-details', getConnectionDetails);

router.post('/api/express/create-room', createRoom);
router.get('/api/express/list-rooms', listRooms);
router.get('/api/express/find-room/:name', findRoom);
router.delete('/api/express/delete-room/:name', deleteRoom);

router.get('/api/express/list-participants/:roomName', listParticipants);

export default router;