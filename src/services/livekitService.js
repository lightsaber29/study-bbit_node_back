import { AccessToken } from "livekit-server-sdk";
import { config } from "../config/env.js";
import { randomString } from "../utils/helpers.js";

export const createParticipantToken = async (userInfo, roomName) => {
  const at = new AccessToken(config.LIVEKIT_API_KEY, config.LIVEKIT_API_SECRET, userInfo);
  at.ttl = "5m";
  at.addGrant({
    room: roomName,
    roomJoin: true
  });
  return await at.toJwt();
};

export const getLiveKitURL = (region) => {
  let targetKey = "LIVEKIT_URL";
  if (region) {
    targetKey = `LIVEKIT_URL_${region}`.toUpperCase();
  }
  const url = process.env[targetKey];
  if (!url) {
    throw new Error(`${targetKey} is not defined`);
  }
  return url;
};