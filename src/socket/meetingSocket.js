export const meetingRooms = new Map();

export const initializeSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('joinMeeting', (meetingId) => {
      //meetingId로 해당 방 모든 클라이언트에게 메시지 전송 가능 
      socket.join(meetingId); 
      if (!meetingRooms.has(meetingId)) {
        meetingRooms.set(meetingId, {
          transcripts: [],
          participants: new Set()
        });
      }
      // join한 소켓을 meetingId 방에 추가
      meetingRooms.get(meetingId).participants.add(socket.id);
      const meetingData = meetingRooms.get(meetingId);
      socket.emit('previousTranscripts', meetingData.transcripts);
    });

    //새로운 transcript가 클라이언트에서 전송되면 연결된 meetingId에 전송
    socket.on('newTranscript', ({ meetingId, transcript }) => {
      const meetingData = meetingRooms.get(meetingId);
      console.log(transcript);
      if (meetingData) {
        meetingData.transcripts.push(transcript);
        io.to(meetingId).emit('transcriptUpdate', transcript);
      } else {
        socket.emit('error', { message: 'Invalid meeting ID' });
      }
    });

    //회의 종료,, 추후에 transcripts 배열에 있는 정보들을 통해 회의록 작성
    //회의록 -> s3에 저장(todo)
    socket.on('endMeeting', ({ meetingId }) => {
      const meetingData = meetingRooms.get(meetingId);
      if (meetingData) {
        io.to(meetingId).emit('meetingEnded', {
          message: '회의가 종료되었습니다.',
          transcripts: meetingData.transcripts
        });
        meetingRooms.delete(meetingId);
      } else {
        socket.emit('error', { message: 'Invalid meeting ID for ending meeting' });
      }
    });

    
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      meetingRooms.forEach((data, meetingId) => {
        if (data.participants.has(socket.id)) {
          data.participants.delete(socket.id);
          if (data.participants.size === 0) {
            meetingRooms.delete(meetingId);
          }
        }
      });
    });
  });
};