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

// Zod 스키마 수정
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
  options: z.array(z.string()) // 배열로 변경
});

const InterviewSummarySchema = z.object({
  title: z.string(),
  date: z.string(),
  participants: z.array(z.string()),
  interviewTopic: z.string(),
  questions: z.array(z.object({
    question: z.string(),
    answer: z.object({
      content: z.string(),
      feedback: z.array(z.string()), // 피드백을 배열로
      improvements: z.array(z.string()) // 개선사항을 배열로
    }),
    followUpQuestions: z.array(z.object({
      question: z.string(),
      modelAnswer: z.string()
    }))
  })),
  overallFeedback: z.array(z.string()) // 배열로 변경
});

const DiscussionSummarySchema = z.object({
  title: z.string(),
  date: z.string(),
  participants: z.array(z.string()),
  mainTopic: z.string(),
  discussionTopics: z.array(z.object({
    topic: z.string(),
    type: z.enum(['debate', 'free']), // 토론 유형
    arguments: z.array(z.object({
      speaker: z.string(),
      opinion: z.string(),
      position: z.string().optional() // 찬반토론일 경우에만 사용
    })),
    feedback: z.array(z.string()),
    additionalPoints: z.array(z.string())
  })),
  overallFeedback: z.array(z.string()) // 배열로 변경
});

// 고유한 파일명 생성 함수
const generateUniqueFileName = (meetingName, date) => {
    // 한국 시간대로 변환 (UTC + 9)
    const koreaTime = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    
    // ISO 포맷을 이용해 시각 추출
    const timestamp = koreaTime.toISOString().split('T')[1].split('.')[0];
    return `${meetingName}_${timestamp}`;
  };

// 회의록 모드별 프롬프트 및 스키마 맵 정의
const meetingModeConfig = new Map([
  ['basic', {
    systemPrompt: '당신은 공부 회의록 요약 전문가입니다. 회의록에 음성 인식이 잘 안 되어 있는 부분을 감안하여 주세요. 공부 내용을 정리하는 의미의 회의록 요약이니, 공부에 도움되는 세부 내역들도 빠짐없이 정확히 회의록에 반영되어야 합니다. 그리고 회의록에 있는 내용과 참여 인원만을 바탕으로 요약해주세요. 한국어로 작성해주세요. 또한 오류가 날 수 있으니 해당하는 내용이 없다면 없다는 내용을 추가해주셔서 포맷을 반드시 맞춰주세요.',
    userPrompt: '아래의 회의록을 요약해주세요. response_format의 옵션에는 회의록 내용을 바탕으로 공부에 도움이 될 수 있는 사실적인 내용, 설명적인 내용을 최대한 상세하게 넣어주세요. 중복되는 내용을 넣으면 안됩니다. 또한 당신이 생성한 모든 내용은 반드시 회의록에 기반한 내용이어야 합니다. 회의록에 없는 내용과 없는 참여자를 절대로 생성해서는 안됩니다. 아래는 회의록 내용입니다. ',
    responseSchema: MeetingSummarySchema // 기존 스키마 사용
  }],
  ['interview', {
    systemPrompt: '당신은 면접 전문가입니다. 이용자의 면접 내용을 바탕으로 면접 실력 향상을 위한 면접 질문 생성, 모범 답안 제시 등의 역할을 수행할 것입니다. 면접 내용을 바탕으로 면접 질문과 모범 답안, 수정 사항 등을 생성해주세요. 결과물에 면접 내용에 전혀 없는 내용이 들어가면 안 됩니다.한국어로 작성해주세요. 또한 오류가 날 수 있으니 해당하는 내용이 없다면 없다는 내용을 추가해주셔서 포맷을 반드시 맞춰주세요. 가장 중요한 부분 중에 하나는 음성인식이 잘 안 되어 있는 부분이 있어 오타가 많을 수 있습니다. 해당 경우에는 원래 어떤 말일지 전체 내용을 바탕으로 객관적으로 판단하여 반드시 보정해주셔야 합니다.', // 면접 모드용 프롬프트 추가 예정
    userPrompt: '아래의 면접 내용을 바탕으로 면접 질문과 모범 답안, 수정 사항 등을 생성해주세요. 면접 내용을 빠짐없이 꼼꼼히 검토해보고 우선 면접 질문과 면접자의 답변을 추출하고, 각 면접자 답변의 아쉬운 점과 개선 방안 및 모범 답안, 추가적으로 나올 수 있는 꼬리 질문들과 모범 답안 등을 정확히 적어주세요. 가장 중요한 부분은 면접 질문, 면접자 답변에 해당하는 부분은 반드시 면접한 내용을 그대로 담아야되고 아래 제시되는 면접 내용에 없는 부분은 절대로 담아서는 안됩니다. 이상하면 이상한대로 면접한 내용이 그대로 담겨야 복기를 할 수 있기 때문입니다. 아래는 면접 내용입니다. ',
    responseSchema: InterviewSummarySchema // 면접용 스키마 추가 예정
  }],
  ['discussion', {
    systemPrompt: '당신은 토론 전문가입니다. 이용자의 토론 내용을 바탕으로 토론 실력 향상을 위한 토론 질문 생성, 모범 답안 제시 등의 역할을 수행할 것입니다. 토론 내용을 바탕으로 토론 질문과 모범 답안, 수정 사항 등을 생성해주세요. 결과물에 토론 내용에 전혀 없는 내용이 들어가면 안 됩니다. 한국어로 작성해주세요. 또한 오류가 날 수 있으니 해당하는 내용이 없다면 없다는 내용을 추가해주셔서 포맷을 반드시 맞춰주세요.가장 중요한 부분 중에 하나는 음성인식이 잘 안 되어 있는 부분이 있어 오타가 많을 수 있습니다. 해당 경우에는 원래 어떤 말일지 전체 내용을 바탕으로 객관적으로 판단하여 반드시 보정해주셔야 합니다.', // 토론 모드용 프롬프트 추가 예정
    userPrompt: '아래의 토론 내용을 바탕으로 토론 주제, 각각 발화자의 토론 내용을 정리, 토론 주제에 대한 찬성 및 반대 의견을 정리하고 각각의 의견에 대한 모범 답안 및 수정 사항 등을 생성해주세요. 참여자들의 아쉬운 점과, 개선 방향, 추가적으로 생각해볼만한 사안, 모범 답안 등을 통해 참여자의 토론 실력 향상에 도움이 되는 내용을 제시해주세요. 가장 중요한 부분은 토론 질문(주제), 토론자 답변에 해당하는 부분은 반드시 토론한 내용을 그대로 담아야되고 아래 제시되는 토론 내용에 없는 부분은 절대로 담아서는 안됩니다. 이상하면 이상한대로 토론한 내용이 그대로 담겨야 복기를 할 수 있기 때문입니다. 아래는 토론 내용입니다.',
    responseSchema: DiscussionSummarySchema // 토론용 스키마 추가 예정
  }]
]);

// GPT를 이용한 회의록 요약 함수 수정
export const getImportantMeetingData = async (meetingTextArray, date, mode = 'basic') => {
  const formattedText = meetingTextArray
    .map(entry => `${entry.timestamp} ${entry.user}: ${entry.text}`)
    .join('\n');
  console.log(date);
  
  const config = meetingModeConfig.get(mode);
  if (!config) {
    throw new Error('Invalid meeting mode');
  }
  console.log(config);
  try {
    const completion = await openai.beta.chat.completions.parse({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: config.systemPrompt
        },
        { 
          role: "user", 
          content: `${config.userPrompt}\n${formattedText}` 
        },
      ],
      response_format: zodResponseFormat(config.responseSchema, "meeting_summary"),
    });

    const meetingSummary = completion.choices[0].message.parsed;
    return generateMarkdownContent(meetingSummary, date, mode);
  } catch (error) {
    console.error('Error generating meeting summary:', error);
    throw error;
  }
};

// 마크다운 생성 함수 수정
const generateMarkdownContent = (meetingSummary, date, mode = 'basic') => {
  switch (mode) {
    case 'basic':
      return generateBasicMarkdown(meetingSummary, date);
    case 'interview':
      return generateInterviewMarkdown(meetingSummary, date);
    case 'discussion':
      return generateDiscussionMarkdown(meetingSummary, date);
    default:
      throw new Error('Invalid meeting mode');
  }
};

const generateBasicMarkdown = (meetingSummary, date) => {
  return `<h1 style="font-size: 2.5rem; font-weight: 600; margin-bottom: 2rem; text-align: center;">📚 스터디 회의록</h1>

<h2 style="font-size: 1.8rem; font-weight: 500; margin-top: 2rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem;">📅 개요</h2>
<div style="margin-left: 1rem; margin-top: 1rem;">
• 일시: ${date}
• 참여자: ${meetingSummary.participants.join(", ")}
</div>

<h2 style="font-size: 1.8rem; font-weight: 500; margin-top: 2rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem;">🏷️ 스터디 전체 주제</h2>
<div style="margin-left: 1rem; margin-top: 1rem; font-size: 1.1rem; font-weight: 500;">
${meetingSummary.mainTopic}
</div>

<h2 style="font-size: 1.8rem; font-weight: 500; margin-top: 2rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem;">📝 주요 토픽</h2>
<div style="margin-left: 1rem; margin-top: 1rem;">
<ol style="list-style-type: decimal; margin-left: 1rem;">
${meetingSummary.topics.map(topic => `<li style="margin-bottom: 1rem;">${topic}</li>`).join('\n')}
</ol>
</div>

<h2 style="font-size: 1.8rem; font-weight: 500; margin-top: 2rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem;">💬 참여자 발언 요약</h2>
${meetingSummary.participantSummaries
  .map(({ name, summaries }) => `
<section style="margin: 1rem 0">
  <h3 style="font-size: 1.5rem; font-weight: 500;">${name}</h3>
  <ul style="list-style-type: disc; margin: -1rem 0 0 2rem;">
    ${summaries.map(summary => `<li style="margin: 0.3rem 0">${summary}</li>`).join('\n')}
  </ul>
</section>`).join('\n')}

<h2 style="font-size: 1.8rem; font-weight: 500; margin-top: 2rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem;">📌 참고 사항</h2>
<div style="margin-left: 1rem; margin-top: 1rem;">
<ol style="list-style-type: decimal; margin-left: 1rem;">
${meetingSummary.options.map(option => `<li style="margin-bottom: 1rem;">${option}</li>`).join('\n')}
</ol>
</div>`;
};

const generateInterviewMarkdown = (meetingSummary, date) => {
  return `<h1 style="font-size: 2.5rem; font-weight: 600; margin-bottom: 2rem; text-align: center;">📋 면접 피드백</h1>

<h2 style="font-size: 1.8rem; font-weight: 500; margin-top: 2rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem;">📅 개요</h2>
<div style="margin-left: 1rem; margin-top: 1rem;">
• 면접 일시: ${date}
• 참여자: ${meetingSummary.participants.join(", ")}
</div>

<h2 style="font-size: 1.8rem; font-weight: 500; margin-top: 2rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem;">🎯 면접 주제</h2>
${meetingSummary.interviewTopic}

<h2 style="font-size: 1.8rem; font-weight: 500; margin-top: 2rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem;">💡 질문 및 답변 분석</h2>
${meetingSummary.questions.map((q, index) => `
<h3 style="font-size: 1.5rem; font-weight: 500; margin-top: 1.5rem;">질문 ${index + 1}. ${q.question}</h3>

<div style="margin-left: 1rem;">
  <h4 style="font-size: 1.2rem; font-weight: 500; margin-top: 1rem;">✍️ 면접자 답변</h4>
  ${q.answer.content}

  <h4 style="font-size: 1.2rem; font-weight: 500; margin-top: 1.5rem;">📊 피드백 및 개선 사항</h4>
  ${q.answer.feedback.map((fb, i) => `${i + 1}. ${fb}`).join("\n")}

  <h4 style="font-size: 1.2rem; font-weight: 500; margin-top: 1.5rem;">🎯 개선을 위한 실천 사항</h4>
  ${q.answer.improvements.map((imp, i) => `${i + 1}. ${imp}`).join("\n")}
</div>

<h4 style="font-size: 1.2rem; font-weight: 500; margin-top: 2rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem;">🔍 예상 꼬리 질문</h4>
<div style="margin-left: 1rem; margin-top: 1rem;">
${q.followUpQuestions.map((fq, i) => `
<p style="font-weight: 500;">Q${i + 1}. ${fq.question}</p>
<p style="margin-left: 1rem; margin-bottom: 1rem;">A. ${fq.modelAnswer}</p>
`).join("\n")}
</div>
`).join("\n")}

<h2 style="font-size: 1.8rem; font-weight: 500; margin-top: 2rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem;">📝 종합 피드백</h2>
${meetingSummary.overallFeedback.map((feedback, index) => `${index + 1}. ${feedback}`).join("\n")}`;
};

const generateDiscussionMarkdown = (meetingSummary, date) => {
  return `<h1 style="font-size: 2.5rem; font-weight: 600; margin-bottom: 2rem; text-align: center;">🗣️ 토론 피드백</h1>

<h2 style="font-size: 1.8rem; font-weight: 500; margin-top: 2rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem;">📅 개요</h2>
<div style="margin-left: 1rem; margin-top: 1rem;">
• 토론 일시: ${date}
• 참여자: ${meetingSummary.participants.join(", ")}
</div>

<h2 style="font-size: 1.8rem; font-weight: 500; margin-top: 2rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem;">🎯 전체 토론 주제</h2>
<div style="margin-left: 1rem; margin-top: 1rem; font-size: 1.1rem; font-weight: 500;">
${meetingSummary.mainTopic}
</div>

${meetingSummary.discussionTopics.map((topic, topicIndex) => `
<h2 style="font-size: 1.8rem; font-weight: 500; margin-top: 2rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem;">토론 논제 ${topicIndex + 1}</h2>
<div style="margin-left: 1rem; margin-top: 1rem;">
• 주제: ${topic.topic}
• 유형: ${topic.type === 'debate' ? '찬반 토론' : '자유 토론'}
</div>

<h3 style="font-size: 1.5rem; font-weight: 500; margin-top: 1.5rem;">주요 의견</h3>
${topic.arguments.map((arg, argIndex) => `
<section style="margin: 1rem 0">
  <h4 style="font-size: 1.2rem; font-weight: 500;">${arg.speaker}의 의견</h4>
  <ul style="list-style-type: disc; margin: 0.5rem 0 0 2rem;">
    ${topic.type === 'debate' ? `<li style="margin: 0.3rem 0">입장: ${arg.position}</li>` : ''}
    <li style="margin: 0.3rem 0">주장: ${arg.opinion}</li>
  </ul>
</section>`).join('\n')}

<h3 style="font-size: 1.5rem; font-weight: 500; margin-top: 1.5rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem;">📊 피드백</h3>
<div style="margin-left: 1rem; margin-top: 1rem;">
<ol style="list-style-type: decimal; margin-left: 1rem;">
${topic.feedback.map(fb => `<li style="margin-bottom: 1rem;">${fb}</li>`).join('\n')}
</ol>
</div>

<h3 style="font-size: 1.5rem; font-weight: 500; margin-top: 1.5rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem;">🔍 추가 고려사항</h3>
<div style="margin-left: 1rem; margin-top: 1rem;">
<ol style="list-style-type: decimal; margin-left: 1rem;">
${topic.additionalPoints.map(point => `<li style="margin-bottom: 1rem;">${point}</li>`).join('\n')}
</ol>
</div>
`).join("\n")}

<h2 style="font-size: 1.8rem; font-weight: 500; margin-top: 2rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem;">📝 종합 피드백</h2>
<div style="margin-left: 1rem; margin-top: 1rem;">
<ol style="list-style-type: decimal; margin-left: 1rem;">
${meetingSummary.overallFeedback.map(feedback => `<li style="margin-bottom: 1rem;">${feedback}</li>`).join('\n')}
</ol>
</div>`;
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