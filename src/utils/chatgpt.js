import OpenAI from 'openai';
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import fs from "fs/promises";

const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY});

// Zod 스키마 -> 회의록 요약 양식을 정하기... 해당 양식 대로 GPT가 json형식으로 데이터를 던져주면
// 마크 다운 형식으로 재가공하여 S3에 저장하자

const MeetingSummarySchema = z.object({
    title: z.string(),
    date: z.string(),
    participants: z.array(z.string()),
    mainTopic: z.string(),
    topics: z.array(z.string()),
    participantSummaries: z.array(z.object({
        name: z.string(),
        summaries: z.array(z.string).min(1)
    })),
    options: z.string(),
  });

export const getImportantMeetingData = async (meetingTextArray, date) => {
  const meetingText = meetingTextArray.join("\n"); // 문장 사이에 공백 추가

  // OpenAI를 호출해 회의록 요약 생성
  const completion = await openai.beta.chat.completions.parse({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: '당신은 회의록 요약 전문가입니다. 제시된 요구사항과 실제 진행된 회의록을 읽고, response_format의 양식에 맞춰 응답해주세요. 회의록에 음성 인식이 잘 안 되어 있는 부분이 있으니, 감안하여 작성해주세요.' },
      { role: "user", content: `아래의 회의록을 요약해주세요. response_format의 옵션에는 회의록 내용을 바탕으로 추가적으로 있으면 좋을 만한 내용들을 넣어주세요:\n${meetingText}` },
    ],
    response_format: zodResponseFormat(MeetingSummarySchema, "meeting_summary"),
  });

  const meetingSummary = completion.choices[0].message.parsed;
  console.log(meetingSummary);
  const markdownContent =  `
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
    .map(
      ({ name, summaries }) => `- **${name}**:\n  ${summaries
        .map((summary) => `- ${summary}`)
        .join("\n  ")}` // summaries 배열의 각 발언을 -로 구분하여 출력
    )
    .join("\n\n")}
  
  ---
  
  ## 📌 참고 사항
  
  ${meetingSummary.options}
  
  ---
    `;
  return markdownContent;

  }
  