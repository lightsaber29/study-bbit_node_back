export const config = {
    SERVER_PORT: process.env.SERVER_PORT || 6080,
    CHAT_PORT: process.env.PORT || 5000,
    LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY || "devkey",
    LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET || "secret",
    LIVEKIT_URL: process.env.LIVEKIT_URL,
    CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3000"
  };
  
