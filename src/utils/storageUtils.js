//AWS S3를 사용한 회의록 저장 예시 코드
// import AWS from 'aws-sdk';

// const s3 = new AWS.S3({
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   region: process.env.AWS_REGION,
// });

// export const saveTranscriptToStorage = async (meetingId, transcripts) => {
//   const params = {
//     Bucket: process.env.S3_BUCKET_NAME, // S3 버킷 이름
//     Key: `${meetingId}_transcripts.json`, // S3에 저장할 파일 이름
//     Body: JSON.stringify(transcripts, null, 2),
//     ContentType: 'application/json',
//   };

//   try {
//     await s3.upload(params).promise();
//     console.log(`Transcripts saved successfully to S3: ${params.Key}`);
//   } catch (err) {
//     console.error('Error saving transcripts to S3:', err);
//   }
// };