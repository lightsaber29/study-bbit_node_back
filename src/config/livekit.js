  // src/config/livekit.js
  import { WebhookReceiver } from "livekit-server-sdk";
  import { config } from "./env.js";
  
  export const webhookReceiver = new WebhookReceiver(
    config.LIVEKIT_API_KEY,
    config.LIVEKIT_API_SECRET
  );