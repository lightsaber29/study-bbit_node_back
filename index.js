// import "dotenv/config";
// import express from "express";
// import cors from "cors";
// import { AccessToken, WebhookReceiver} from "livekit-server-sdk";

// const SERVER_PORT = process.env.SERVER_PORT;
// //const SERVER_PORT = process.env.SERVER_PORT || 6080;
// const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
// // const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "devkey";
// const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
// //const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "secret";
// const LIVEKIT_URL = process.env.LIVEKIT_URL;

// const app = express();

// app.use(cors());
// app.use(express.json());
// app.use(express.raw({ type: "application/webhook+json" }));

// const webhookReceiver = new WebhookReceiver(
//   LIVEKIT_API_KEY,
//   LIVEKIT_API_SECRET
// );

// app.post("/livekit/webhook", async (req, res) => {
//   try {
//     const event = await webhookReceiver.receive(
//       req.body,
//       req.get("Authorization")
//     );
//     console.log(event);
//   } catch (error) {
//     console.error("Error validating webhook event", error);
//   }
//   res.status(200).send();
// });

// // /api/connection-details 엔드포인트
// app.get("/api/connection-details", async (req, res) => {
//   try {
//     // 쿼리 파라미터 가져오기
//     const roomName = req.query.roomName;
//     const participantName = req.query.participantName;
//     const metadata = req.query.metadata || "";
//     const region = req.query.region;
//     console.log(roomName, participantName, metadata, region);

//     // const livekitServerUrl = region ? getLiveKitURL(region) : LIVEKIT_URL;
//     const livekitServerUrl = LIVEKIT_URL
//     if (!livekitServerUrl) {
//       return res.status(400).json({ errorMessage: "Invalid region" });
//     }

//     if (!roomName || !participantName) {
//       return res.status(400).json({ errorMessage: "roomName and participantName are required" });
//     }

//     // 참가자 토큰 생성
//     const participantToken = await createParticipantToken(
//       {
//         identity: `${participantName}__${randomString(4)}`,
//         name: participantName,
//         metadata,
//       },
//       roomName
//     );

//     // 연결 세부 정보 반환
//     const data = {
//       serverUrl: livekitServerUrl,
//       roomName: roomName,
//       participantToken: participantToken,
//       participantName: participantName,
//     };
//     res.json(data);
//     console.log(data);
//   } catch (error) {
//     console.error("Error generating connection details:", error);
//     res.status(500).json({ errorMessage: error.message });
//   }
// });

// const createParticipantToken = async (userInfo, roomName) =>  {
//   const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, userInfo);
//   at.ttl = "5m";
//   at.addGrant({
//     room: roomName,
//     roomJoin: true
//     // canPublish: true,
//     // canPublishData: true,
//     // canSubscribe: true,
//   });
//   return await at.toJwt();
// }

// // LiveKit 서버 URL 가져오기
// // function getLiveKitURL(region) {
// //   let targetKey = "LIVEKIT_URL";
// //   if (region) {
// //     targetKey = `LIVEKIT_URL_${region}`.toUpperCase();
// //   }
// //   const url = process.env[targetKey];
// //   if (!url) {
// //     throw new Error(`${targetKey} is not defined`);
// //   }
// //   return url;
// // }

// // 필요한 임의 문자열 생성 유틸리티 함수 (대체 가능)
// function randomString(length) {
//   const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
//   let result = "";
//   for (let i = 0; i < length; i++) {
//     result += characters.charAt(Math.floor(Math.random() * characters.length));
//   }
//   return result;
// }

// app.listen(SERVER_PORT, () => {
//   console.log("@@ Server started on port:", SERVER_PORT);
// });
