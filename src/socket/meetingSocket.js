import { getImportantMeetingData, saveOriginalTranscript, saveMarkdownSummary, saveMeetingToDatabase } from '../utils/storageUtils.js';
import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';

export const meetingRooms = new Map();

export const initializeSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('joinMeeting', (meetingId) => {
      socket.join(meetingId); 
      if (!meetingRooms.has(meetingId)) {
        meetingRooms.set(meetingId, {
          transcripts: [],
          participants: new Set(),
          isRecording: false
        });
      }
      
      const meetingData = meetingRooms.get(meetingId);
      meetingData.participants.add(socket.id);
      
      socket.emit('previousTranscripts', meetingData.transcripts);
      
      if (meetingData.isRecording) {
        socket.emit('startRecord');
      }
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
      // console.log(meetingData.transcripts);
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
      if (meetingData) {
        meetingData.isRecording = false;
        console.log(meetingData.isRecording);
        meetingData.transcripts = [];
        io.to(meetingId).emit('transcriptsReset');
        console.log('stopRecording');
      }
    });

    //방이 회의록 기록을 중지시킬 때
    socket.on('stopRecord', ({ meetingId }) => {
      const meetingData = meetingRooms.get(meetingId);
      if (meetingData) {
        meetingData.isRecording = false;
        io.to(meetingId).emit('stopRecord');
        console.log(meetingData.isRecording);
        console.log('stop');
      }
    });

    socket.on('startRecord', ({ meetingId }) => {
      const meetingData = meetingRooms.get(meetingId);
      if (meetingData) {
        meetingData.isRecording = true;
        io.to(meetingId).emit('startRecord');
        console.log(meetingData.isRecording);
        console.log('start');
      }
    });

    //방장이 회의록 기록을 재개할 때
    socket.on('resumeRecord', ({ meetingId }) => {
      const meetingData = meetingRooms.get(meetingId);
      if (meetingData) {
        meetingData.isRecording = true;
        io.to(meetingId).emit('resumeRecord');
        console.log(meetingData.isRecording);
        console.log('resume');
      }
    });

    socket.on('savingScript', ({ meetingId }) => {
      io.to(meetingId).emit('savingScript');
      console.log('save');
    });
    
    // //방장이 회의록 작성 종료 후 저장할 때 호출
    // socket.on('saveMeeting', ({ meetingId, meetingName }) => {
    //   const meetingData = meetingRooms.get(meetingId);
    //   const date = Datetime.now();
    //   //챗지피티로 요약된 회의록 가져오는 함수 작성

    //   console.log(meetingName, meetingId);
    //   // Save the meeting transcript (e.g. to a file or cloud storage)
    //   const markDownContent = getImportantMeetingData(meetingData.transcripts, date);
    //   saveOriginalTranscript(meetingId, meetingName, meetingData.transcripts, date);
    //   saveMarkdownSummary(meetingId, meetingName, markDownContent, date);  
      

    //   // Reset the meeting transcripts
    //   meetingData.transcripts = [];

    //   // Notify all clients in the meeting room that the transcripts have been reset
    //   io.to(meetingId).emit('transcriptsReset');
      
    // });

    // 회의록 저장 이벤트 핸들러 개선
    socket.on('saveMeeting', async ({ meetingId, meetingName, mode = 'basic' }) => {
      const meetingData = meetingRooms.get(meetingId);
      const date = new Date();
      // 한국 시간으로 변환
      console.log(date);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const formattedDate = `${year}.${month}.${day} ${hours}:${minutes}`;
      console.log(formattedDate);
      // 빈 회의록 체크
      if (!meetingData || meetingData.transcripts.length === 0) {
        socket.emit('meetingSaved', {  
          success: false, 
          error: 'No transcripts to save' 
        });
        return;
      }

      try {
        // 저장 시작을 모든 참가자에게 알림
        io.to(meetingId).emit('savingStarted', { meetingId });
        
        // 현재 트랜스크립트 복사 후 초기화
        const currentTranscripts = [...meetingData.transcripts];
        console.log('복사된 스크립트',currentTranscripts);

        meetingData.transcripts = [];
        io.to(meetingId).emit('transcriptsReset');

        // 원본 저장 (비동기)
        const transcriptPromise = saveOriginalTranscript(
          meetingId, 
          meetingName, 
          currentTranscripts, 
          date
        );
        
        // GPT 처리 시작 알림
        socket.emit('processingStarted', { meetingId });

        // GPT 처리 및 마크다운 저장 (비동기) - mode 파라미터 추가
        getImportantMeetingData(currentTranscripts, formattedDate, mode)
          .then(async (markdownContent) => {
            try {
              const markdownResult = await saveMarkdownSummary(
                meetingId, 
                meetingName, 
                markdownContent, 
                date
              );

              const transcriptResult = await transcriptPromise;

              // PostgreSQL에 저장
              await saveMeetingToDatabase(
                meetingId,
                meetingName,
                date,
                transcriptResult.transcriptPath,
                markdownResult.markdownPath
              );

              //@@@ 알림 호출
              await axios.post('https://studybbit.store:8080/api/noti/mm', {
                roomId: meetingId,
                fileUrl: markdownResult.markdownPath,
              });

              // 처리 완료 알림
              socket.emit('meetingProcessed', { 
                success: true,
                meetingId,
                transcriptPath: transcriptResult.transcriptPath,
                markdownPath: markdownResult.markdownPath
              });
            } catch (error) {
              console.error('Error in processing:', error);
              socket.emit('meetingProcessingError', { 
                meetingId,
                error: 'Failed to process meeting summary'
              });
            }
          })
          .catch(error => {
            console.error('Error in GPT processing:', error);
            socket.emit('meetingProcessingError', { 
              meetingId,
              error: 'Failed to generate meeting summary'
            });
          });

        // 저장 성공을 모든 참가자에게 알림
        io.to(meetingId).emit('meetingSaved', { 
          success: true,
          message: 'Meeting saved successfully. Summary is being processed.'
        });

      } catch (error) {
        console.error('Error in saveMeeting:', error);
        io.to(meetingId).emit('meetingSaved', { 
          success: false, 
          error: 'Failed to save meeting data' 
        });
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
    
    //sockets for timer
    socket.on('timerSet', ({ meetingId, time }) => {
      console.log('타이머 세팅');
      if (typeof time !== 'number' || time <= 0) {
        socket.emit('error', { message: '유효하지 않은 타이머 값입니다.' });
        return;
      }
      io.to(meetingId).emit('timerSet', { time });
    });

    socket.on('timerStart', ({ meetingId }) => {
      console.log('타이머 시작');
      io.to(meetingId).emit('timerStart');
    });

    socket.on('timerPause', ({ meetingId }) => {
      console.log('타이머 중지');
      io.to(meetingId).emit('timerPause');
    });

    socket.on('timerReset', ({ meetingId }) => {
      console.log('타이머 리셋');
      io.to(meetingId).emit('timerReset');
    });

    socket.on('modalSet', ({ meetingId }) => {
      console.log('모달 상태 변경');
      io.to(meetingId).emit('modalSet');
    });

    // 저장 시작 이벤트
    socket.on('savingStarted', ({ meetingId }) => {
      io.to(meetingId).emit('savingStarted', { 
        message: '회의록 저장을 시작합니다.' 
      });
    });

    // 저장 취소 이벤트
    socket.on('saveCanceled', ({ meetingId }) => {
      io.to(meetingId).emit('saveCanceled', { 
        message: '회의록 저장이 취소되었습니다.' 
      });
    });

  });
};