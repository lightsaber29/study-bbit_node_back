//AWS S3를 사용한 회의록 저장 예시 코드
// import AWS from 'aws-sdk';

// const s3 = new AWS.S3({
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   region: process.env.AWS_REGION,
// });

// // 고유한 파일명 생성 함수
// const generateUniqueFileName = (meetingName) => {
//   const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
//   return `${meetingName}_${timestamp}`;
// };

// // 회의록 저장 함수
// export const saveTranscriptToStorage = async (meetingId, meetingName, transcripts) => {
//   const uniqueFileName = generateUniqueFileName(meetingName);
  
//   const params = {
//     Bucket: process.env.S3_BUCKET_NAME,
//     Key: `meetings/${meetingId}/${uniqueFileName}_transcripts.json`,
//     Body: JSON.stringify({
//       meetingId,
//       meetingName,
//       transcripts,
//       createdAt: new Date().toISOString(),
//       fileName: uniqueFileName,
//     }, null, 2),
//     ContentType: 'application/json',
//   };

//   try {
//     await s3.putObject(params).promise();
//     return {
//       success: true,
//       fileName: uniqueFileName,
//       path: params.Key
//     };
//   } catch (error) {
//     console.error('Error saving transcript:', error);
//     throw error;
//   }
// };

// // 특정 회의의 최신 회의록 조회 함수
// export const getLatestTranscript = async (meetingId, meetingName) => {
//   const params = {
//     Bucket: process.env.S3_BUCKET_NAME,
//     Prefix: `meetings/${meetingId}/${meetingName}_`,
//   };

//   try {
//     const data = await s3.listObjects(params).promise();
//     if (!data.Contents.length) return null;

//     // 가장 최근 파일 가져오기
//     const latestFile = data.Contents.sort((a, b) => 
//       b.LastModified - a.LastModified
//     )[0];

//     const transcriptData = await s3.getObject({
//       Bucket: process.env.S3_BUCKET_NAME,
//       Key: latestFile.Key,
//     }).promise();

//     return JSON.parse(transcriptData.Body.toString());
//   } catch (error) {
//     console.error('Error fetching latest transcript:', error);
//     throw error;
//   }
// };

// // 특정 회의의 모든 회의록 목록 조회 함수
// export const listMeetingTranscripts = async (meetingId) => {
//   const params = {
//     Bucket: process.env.S3_BUCKET_NAME,
//     Prefix: `meetings/${meetingId}/`,
//   };

//   try {
//     const data = await s3.listObjects(params).promise();
//     return data.Contents
//       .sort((a, b) => b.LastModified - a.LastModified) // 최신순 정렬
//       .map(item => {
//         const key = item.Key;
//         const fileName = key.split('/').pop().replace('_transcripts.json', '');
//         return {
//           meetingName: fileName.split('_').slice(0, -1).join('_'), // 타임스탬프 제외한 미팅 이름
//           fileName: fileName,
//           path: key,
//           lastModified: item.LastModified,
//         };
//       });
//   } catch (error) {
//     console.error('Error listing transcripts:', error);
//     throw error;
//   }
// };