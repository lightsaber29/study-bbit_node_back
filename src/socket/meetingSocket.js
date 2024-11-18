// import { saveTranscriptToStorage } from '../utils/storageUtils.js';

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
      console.log(meetingData.transcripts);
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

    //방장이 회의록 작성을 종료할 경우 transcript를 리셋하고 녹음을 하지 않게끔한다.
    socket.on('stopRecordMinute', ({ meetingId }) => {
      const meetingData = meetingRooms.get(meetingId);
      console.log('stopRecording');
      io.to(meetingId).emit('transcriptsReset');
      
    });

    //방장이 회의록 기록을 중지시킬 때
    socket.on('stopRecord', ({meetingId}) => {
      io.to(meetingId).emit('stopRecord');
      console.log('stop');
    })

    //방장이 회의록 기록을 재개할 때
    socket.on('resumeRecord', ({meetingId}) => {
      io.to(meetingId).emit('resumeRecord');
      console.log('resume');
    })
    //방장이 회의록 작성 종료 후 저장할 때 호출
    socket.on('saveMeeting', ({ meetingId, meetingName }) => {
      const meetingData = meetingRooms.get(meetingId);
      
      console.log(meetingName, meetingId);
      // Save the meeting transcript (e.g. to a file or cloud storage)
      // saveTranscriptToStorage(meetingId, meetingname, meetingData.transcripts);

      // Reset the meeting transcripts
      meetingData.transcripts = [];

      // Notify all clients in the meeting room that the transcripts have been reset
      io.to(meetingId).emit('transcriptsReset');
      
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