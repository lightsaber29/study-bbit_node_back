import { meetingRooms } from '../socket/meetingSocket.js';

export const getMeetingDetails = (req, res) => {
  const meetingData = meetingRooms.get(req.params.meetingId);
  if (meetingData) {
    res.json({ transcripts: meetingData.transcripts });
  } else {
    res.status(404).json({ message: '회의를 찾을 수 없습니다.' });
  }
};