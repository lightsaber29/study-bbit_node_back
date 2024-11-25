// import AWS from 'aws-sdk';
// import mongoose from 'mongoose';

// const s3 = new AWS.S3({
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   region: process.env.AWS_REGION,
// });

// // MongoDB 스키마 정의
// const MeetingSchema = new mongoose.Schema({
//   meetingId: { type: String, required: true },
//   fileName: { type: String, required: true },
//   meetingName: { type: String, required: true },
//   status: { 
//     type: String, 
//     enum: ['processing', 'completed', 'error'],
//     default: 'processing' 
//   },
//   createdAt: { type: Date, default: Date.now },
//   completedAt: { type: Date },
//   transcriptPath: { type: String },
//   markdownPath: { type: String }
// });

// // 복합 인덱스 생성
// MeetingSchema.index({ meetingId: 1, fileName: 1 }, { unique: true });

// // 모델 생성
// const Meeting = mongoose.model('Meeting', MeetingSchema);

// // 고유한 파일명 생성 함수
// const generateUniqueFileName = (meetingName, date) => {
//   const timestamp = date.toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
//   return `${meetingName}_${timestamp}`;
// };

// // 원본 회의록만 저장하는 함수
// export const saveOriginalTranscript = async (meetingId, meetingName, transcripts, currentDate) => {
  
//   const uniqueFileName = generateUniqueFileName(meetingName, currentDate);

//   const year = currentDate.getFullYear();
//   const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // 월은 0부터 시작하므로 +1
//   const day = String(currentDate.getDate()).padStart(2, '0');
  
//   const joinedTranscripts = transcripts.join('\n');

//   const transcriptParams = {
//     Bucket: process.env.S3_BUCKET_NAME,
//     Key: `meetings/${meetingId}/${year}-${month}-${day}/transcripts/${uniqueFileName}.json`,
//     Body: JSON.stringify({
//       meetingName,
//       createdAt: currentDate.toISOString(),
//       joinedTranscripts,      
//     }, null, 2),
//     ContentType: 'application/json',
//   };

//   try {
//     // S3에 원본 저장
//     await s3.putObject(transcriptParams).promise();

//     // MongoDB에 처리 상태 저장
//     await Meeting.create({
//       meetingId,
//       fileName: uniqueFileName,
//       meetingName,
//       status: 'processing',
//       createdAt: currentDate,
//       transcriptPath: transcriptParams.Key
//     });

//     return {
//       success: true,
//       fileName: uniqueFileName,
//       transcriptPath: transcriptParams.Key
//     };
//   } catch (error) {
//     console.error('Error saving original transcript:', error);
//     throw error;
//   }
// };

// // GPT로 처리된 마크다운 저장 함수
// export const saveMarkdownSummary = async (meetingId, fileName, markdownContent, currentDate) => {
//   const uniqueFileName = generateUniqueFileName(meetingName, currentDate);

//   const year = currentDate.getFullYear();
//   const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // 월은 0부터 시작하므로 +1
//   const day = String(currentDate.getDate()).padStart(2, '0');

//   const markdownParams = {
//     Bucket: process.env.S3_BUCKET_NAME,
//     Key: `meetings/${meetingId}/${year}-${month}-${day}/markdown/${uniqueFileName}.md`,
//     Body: markdownContent,
//     ContentType: 'text/markdown',
//   };

//   try {
//     // S3에 마크다운 저장
//     await s3.putObject(markdownParams).promise();

//     // MongoDB 상태 업데이트
//     await Meeting.findOneAndUpdate(
//       { meetingId, fileName },
//       { 
//         status: 'completed',
//         completedAt: new Date(),
//         markdownPath: markdownParams.Key
//       },
//       { new: true }
//     );

//     return {
//       success: true,
//       markdownPath: markdownParams.Key
//     };
//   } catch (error) {
//     console.error('Error saving markdown summary:', error);
//     throw error;
//   }
// };

// // 회의록 처리 상태 조회 함수
// export const getMeetingProcessingStatus = async (meetingId, fileName) => {
//   try {
//     const meeting = await Meeting.findOne({ meetingId, fileName });
//     return meeting;
//   } catch (error) {
//     console.error('Error fetching processing status:', error);
//     throw error;
//   }
// };

// // 특정 회의의 모든 회의록 목록 조회 함수
// export const listMeetingTranscripts = async (meetingId) => {
//   try {
//     // MongoDB에서 해당 meetingId의 모든 회의록 조회
//     const meetings = await Meeting.find({ meetingId })
//       .sort({ createdAt: -1 }); // 최신순 정렬

//     return meetings.map(meeting => ({
//       meetingName: meeting.meetingName,
//       fileName: meeting.fileName,
//       lastModified: meeting.createdAt,
//       transcriptPath: meeting.transcriptPath,
//       markdownPath: meeting.markdownPath,
//       status: meeting.status,
//       completedAt: meeting.completedAt
//     }));
//   } catch (error) {
//     console.error('Error listing transcripts:', error);
//     throw error;
//   }
// };

// // 에러 발생 시 상태 업데이트 함수 추가
// export const updateMeetingError = async (meetingId, fileName) => {
//   try {
//     await Meeting.findOneAndUpdate(
//       { meetingId, fileName },
//       { status: 'error' },
//       { new: true }
//     );
//   } catch (error) {
//     console.error('Error updating meeting error status:', error);
//     throw error;
//   }
// };

import AWS from 'aws-sdk';
// import { Pool } from 'pg';
import pkg from 'pg';
import OpenAI from 'openai';
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import dotenv from 'dotenv';
dotenv.config();

// AWS S3 설정
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const { Pool } = pkg;
// PostgreSQL 설정
const pool = new Pool({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: process.env.POSTGRES_PORT
  });
// PostgreSQL에 회의록 정보 저장
export const saveMeetingToDatabase = async (meetingId, meetingName, date, transcriptPath, markdownPath) => {
    const query = `
      INSERT INTO mm_summary (
        room_id, 
        mm_original_url, 
        mm_summary_url, 
        created_by, 
        modified_by,
        created_at,
        modified_at
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const createdBy = 1234; // 예시 사용자, 실제 사용자 정보를 처리하는 코드 필요
    const modifiedBy = 1234; // 예시 사용자, 실제 수정자 정보를 처리하는 코드 필요
    const createdAt = new Date(date); // 예시로 `date`를 `created_at`에 맞춰 사용
    const modifiedAt = new Date(date); // 예시로 `date`를 `modified_at`에 맞춰 사용
    // const Id = 56;
    //미팅 이름 컬럼 추가하기(tod0)
    try {
      const result = await pool.query(query, [
        meetingId, //meetingId,
        transcriptPath,
        markdownPath,
        // meetingName,
        createdBy,
        modifiedBy,
        createdAt,
        modifiedAt        
      ]);
      return result.rows[0];
    } catch (error) {
      console.error('Error saving to database:', error);
      throw error;
    }
  };

// OpenAI 설정
const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY});

// Zod 스키마 정의
const MeetingSummarySchema = z.object({
  title: z.string(),
  date: z.string(),
  participants: z.array(z.string()),
  mainTopic: z.string(),
  topics: z.array(z.string()),
  participantSummaries: z.array(z.object({
    name: z.string(),
    summaries: z.array(z.string())
  })),
  options: z.string(),
});

// 고유한 파일명 생성 함수
const generateUniqueFileName = (meetingName, date) => {
    // 한국 시간대로 변환 (UTC + 9)
    const koreaTime = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    
    // ISO 포맷을 이용해 시각 추출
    const timestamp = koreaTime.toISOString().split('T')[1].split('.')[0];
    return `${meetingName}_${timestamp}`;
  };

// GPT를 이용한 회의록 요약 함수
export const getImportantMeetingData = async (meetingTextArray, date) => {
//   console.log(meetingTextArray);
//   console.log(meetingTextArray.type);
//   const meetingTextString = JSON.stringify(meetingTextArray);
  
//   const meetingText = meetingTextArray.join("\n"); // 추후 회의록
//   console.log(meetingTextArray);
//   console.log(meetingText);
  const formattedText = meetingTextArray
  .map(entry => `${entry.timestamp} ${entry.user}: ${entry.text}`)
  .join('\n');
  console.log(formattedText);
  try {
    const completion = await openai.beta.chat.completions.parse({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: '당신은 공부 회의록 요약 전문가입니다. 회의록에 음성 인식이 잘 안 되어 있는 부분을 감안하여 주세요. 공부 내용을 정리하는 의미의 회의록 요약이니, 공부에 도움되는 세부 내역들도 빠짐없이 정확히 회의록에 반영되어야 합니다.' 
        },
        { 
          role: "user", 
          content: `아래의 회의록을 요약해주세요. response_format의 옵션에는 회의록 내용을 바탕으로 공부에 도움이 될 수 있는 사실적인 내용, 설명적인 내용을 넘버링을 이용해서 최대한 상세하게 넣어주세요. 단 중복되는 내용을 넣으면 안됩니다. 또한 당신이 생성한 모든 내용은 회의록에 기반하거나, 회의록 내용을 바탕으로 응용한 것이어야 하고, 회의록에 없는 내용과 없는 참여자를 생성해서는 안됩니다. 아래는 회의록 내용입니다.\n${formattedText}` 
        },
      ],
      response_format: zodResponseFormat(MeetingSummarySchema, "meeting_summary"),
    });

    const meetingSummary = completion.choices[0].message.parsed;
    // console.log(meetingTextString);
    console.log(meetingSummary);
    return generateMarkdownContent(meetingSummary, date);
  } catch (error) {
    console.error('Error generating meeting summary:', error);
    throw error;
  }
};

// 마크다운 생성 함수
const generateMarkdownContent = (meetingSummary, date) => {
  return `
# 📚 스터디 회의록

- **스터디 날짜**: ${date}
- **참여자**: ${meetingSummary.participants.join(", ")}

---

## 🏷️ 스터디 전체 주제
**${meetingSummary.mainTopic}**

---

## 📝 주요 토픽
${meetingSummary.topics.map((topic, index) => `${index + 1}. ${topic}`).join("\n")}

---

## 💬 참여자 발언 요약
${meetingSummary.participantSummaries
  .map(({ name, summaries }) => 
    `**${name}**:\n  ${summaries.map(summary => `- ${summary}`).join("\n  ")}`)
  .join("\n\n")}

---

## 📌 참고 사항

${meetingSummary.options}

---
  `;
};

// 원본 회의록 저장 함수
export const saveOriginalTranscript = async (meetingId, meetingName, transcripts, currentDate) => {
  const uniqueFileName = generateUniqueFileName(meetingName, currentDate);
  const formattedDate = currentDate.toISOString().split('T')[0];
  
  const transcriptKey = `meetings/${meetingId}/${formattedDate}/transcripts/${uniqueFileName}.json`;
  const formattedText = transcripts
  .map(entry => `${entry.timestamp} ${entry.user}: ${entry.text}`)
  .join('\n');
  const transcriptParams = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: transcriptKey,
    Body: JSON.stringify({
      meetingName,
      createdAt: currentDate.toISOString(),
      minute: formattedText
    }, null, 2),
    ContentType: 'application/json',
  };

  try {
    await s3.putObject(transcriptParams).promise();
    const transcriptUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${transcriptKey}`;
    
    return {
      success: true,
      fileName: uniqueFileName,
      transcriptPath: transcriptUrl
    };
  } catch (error) {
    console.error('Error saving original transcript:', error);
    throw error;
  }
};

// 마크다운 요약본 저장 함수
export const saveMarkdownSummary = async (meetingId, meetingName, markdownContent, currentDate) => {
  console.log(markdownContent);
  const uniqueFileName = generateUniqueFileName(meetingName, currentDate);
  const formattedDate = currentDate.toISOString().split('T')[0];
  
  const markdownKey = `meetings/${meetingId}/${formattedDate}/markdown/${uniqueFileName}.md`;
  
  const markdownParams = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: markdownKey,
    Body: markdownContent,
    ContentType: 'text/markdown',
  };

  try {
    await s3.putObject(markdownParams).promise();
    const markdownUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${markdownKey}`;
    
    return {
      success: true,
      markdownPath: markdownUrl
    };
  } catch (error) {
    console.error('Error saving markdown summary:', error);
    throw error;
  }
};

// // PostgreSQL에 회의록 정보 저장 함수
// const saveMeetingToDatabase = async (meetingId, meetingName, date, transcriptPath, markdownPath) => {
//   const query = `
//     INSERT INTO meetings (meeting_id, meeting_name, date, transcript_path, markdown_path)
//     VALUES ($1, $2, $3, $4, $5)
//     RETURNING *;
//   `;
  
//   try {
//     const result = await pool.query(query, [
//       meetingId,
//       meetingName,
//       date,
//       transcriptPath,
//       markdownPath
//     ]);
//     return result.rows[0];
//   } catch (error) {
//     console.error('Error saving to database:', error);
//     throw error;
//   }
// };

// 소켓 이벤트 핸들러 수정
// export const handleSaveMeeting = async (socket, meetingRooms, io) => {
//   socket.on('saveMeeting', async ({ meetingId, meetingName }) => {
//     const meetingData = meetingRooms.get(meetingId);
//     const date = new Date();

//     try {
//       // 원본 저장 (비동기)
//       const transcriptPromise = saveOriginalTranscript(
//         meetingId, 
//         meetingName, 
//         meetingData.transcripts, 
//         date
//       );

//       // GPT 요약 및 마크다운 저장 (비동기)
//       const markdownPromise = getImportantMeetingData(meetingData.transcripts, date)
//         .then(markdownContent => 
//           saveMarkdownSummary(meetingId, meetingName, markdownContent, date)
//         );

//       // 모든 저장 작업이 완료될 때까지 대기
//       const [transcriptResult, markdownResult] = await Promise.all([
//         transcriptPromise,
//         markdownPromise
//       ]);

//       // PostgreSQL에 저장
//       await saveMeetingToDatabase(
//         meetingId,
//         meetingName,
//         date,
//         transcriptResult.transcriptPath,
//         markdownResult.markdownPath
//       );

//       // 회의록 초기화 및 클라이언트 통보
//       meetingData.transcripts = [];
//       io.to(meetingId).emit('transcriptsReset');
//       socket.emit('meetingSaved', { success: true });
      
//     } catch (error) {
//       console.error('Error in handleSaveMeeting:', error);
//       socket.emit('meetingSaved', { 
//         success: false, 
//         error: 'Failed to save meeting data' 
//       });
//     }
//   });
// };

// 회의록 조회 함수
export const getMeetingTranscripts = async (meetingId) => {
  console.log(meetingId);
  const query = `
    SELECT * FROM mm_summary
    WHERE room_id = $1 
    ORDER BY created_at DESC;
  `;
  
  try {
    const result = await pool.query(query, [meetingId]);
    console.log(result);
    return result.rows;
  } catch (error) {
    console.error('Error fetching meeting transcripts:', error);
    throw error;
  }
};