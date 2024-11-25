import { createParticipantToken} from "../services/livekitService.js";
import {config} from "../config/env.js"
import { randomString } from "../utils/helpers.js";
import { Room, RoomServiceClient } from 'livekit-server-sdk';

const livekitHost = 'https://studybbit.site';
const roomService = new RoomServiceClient(
  livekitHost, 
  config.LIVEKIT_API_KEY, 
  config.LIVEKIT_API_SECRET
);

export const handleWebhook = async (req, res) => {
  try {
    const event = await webhookReceiver.receive(
      req.body,
      req.get("Authorization")
    );
    console.log(event);
    res.status(200).send();
  } catch (error) {
    console.error("Error validating webhook event", error);
    res.status(500).send();
  }
};

export const getConnectionDetails = async (req, res) => {
  try {
    const { roomName, participantName, metadata = "", region } = req.query;
    
    const livekitServerUrl = config.LIVEKIT_URL;
    if (!livekitServerUrl) {
      return res.status(400).json({ errorMessage: "Invalid region" });
    }

    if (!roomName || !participantName) {
      return res.status(400).json({ errorMessage: "roomName and participantName are required" });
    }

    // 현재 방에 있는 참가자 목록 가져오기
    const participants = await roomService.listParticipants(roomName);

    // 이미 접속한 사용자인지 확인
    const isAlreadyInRoom = participants.some(
      (participant) => participant.name === participantName
    );

    if (isAlreadyInRoom) {
      return res.status(403).json({
        errorMessage: `'${participantName}'은/(는) 이미 참여중입니다'.`,
      });
    }

    const participantToken = await createParticipantToken(
      {
        identity: `${participantName}__${randomString(4)}`,
        name: participantName,
        metadata,
      },
      roomName
    );

    const data = {
        serverUrl: livekitServerUrl,
        roomName: roomName,
        participantToken: participantToken,
        participantName: participantName,
    };
    res.json(data);
  } catch (error) {
    console.error("Error generating connection details:", error);
    res.status(500).json({ errorMessage: error.message });
  }
};

export const listRooms = async (req, res) => {
  try {
    // RoomServiceClient의 listRooms() 호출
    const rooms = await roomService.listRooms();
    
    res.status(200).json({ rooms });
  } catch (error) {
    console.error("방 데이터를 가져오는데 실패했습니다.", error);
    res.status(500).json({ errorMessage: "방 데이터를 가져오는데 실패했습니다." });
  }
};

export const findRoom = async (req, res) => {
  try {
    const { name } = req.params; // URL에서 방 이름 추출

    if (!name) {
      return res.status(400).json({ errorMessage: "조회할 방 이름이 비었습니다." });
    }

    // RoomServiceClient의 listRooms() 호출
    const rooms = await roomService.listRooms();

    // 특정 이름과 일치하는 방 찾기
    const room = rooms.find((room) => room.name === name);

    if (!room) {
      return res.status(404).json({ errorMessage: "해당 이름의 방을 찾을 수 없습니다." });
    }

    res.status(200).json({ room });
  } catch (error) {
    console.error("방 데이터를 가져오는데 실패했습니다.", error);
    res.status(500).json({ errorMessage: "방 데이터를 가져오는데 실패했습니다." });
  }
};

export const createRoom = async (req, res) => {
  try {

    // POST 요청의 body에서 방 생성 옵션을 가져옴
    const { name, emptyTimeout = 600, maxParticipants = 20, metadata = "" } = req.body;

    if (!name) {
      return res.status(400).json({ errorMessage: "방 이름이 비었습니다!" });
    }
    
    // 방 생성 옵션 설정
    const opts = {
      name, // 방 이름
      emptyTimeout, // 방이 비어있을 경우 자동 삭제 시간 (초 단위)
      maxParticipants, // 최대 참가자 수
      metadata, // 방에 추가적인 메타데이터
    };
    
    // LiveKit의 `createRoom` 메서드 호출
    const room = await roomService.createRoom(opts);

    res.status(200).json({ room });
  } catch (error) {
    console.error("방 생성에 실패했습니다.", error);
    res.status(500).json({ errorMessage: "방 생성에 실패했습니다." });
  }
};

export const deleteRoom = async (req, res) => {
  try {
    const { name } = req.params; // URL에서 방 이름 추출

    if (!name) {
      return res.status(400).json({ errorMessage: "삭제할 방 이름이 비었습니다." });
    }

    // LiveKit의 deleteRoom 메서드 호출
    await roomService.deleteRoom(name);

    // 성공적으로 삭제되었음을 응답
    res.status(200).json({ message: `'${name}'번 방이 삭제되었습니다.` });
  } catch (error) {
    console.error("삭제에 실패했습니다.", error);

    // LiveKit에서 존재하지 않는 방을 삭제하려 할 때 등 예외 처리
    if (error.message.includes('not found')) {
      return res.status(404).json({ errorMessage: `'${name}'번 방이 없습니다.` });
    }

    res.status(500).json({ errorMessage: "삭제에 실패했습니다." });
  }
};

export const listParticipants = async (req, res) => {
  try {

    const { roomName } = req.params; // URL에서 방 이름 추출

    if (!roomName) {
      return res.status(400).json({ errorMessage: "조회할 방 이름이 비었습니다." });
    }

    // RoomServiceClient의 listRooms() 호출
    const participants = await roomService.listParticipants(roomName);
    
    res.status(200).json({ participants });
  } catch (error) {
    console.error("방 접속자 데이터를 가져오는데 실패했습니다.", error);
    res.status(500).json({ errorMessage: "방 접속자 데이터를 가져오는데 실패했습니다." });
  }
};