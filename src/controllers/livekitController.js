import { createParticipantToken, getLiveKitURL } from "../services/livekitService.js";

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
    
    const livekitServerUrl = LIVEKIT_URL;
    if (!livekitServerUrl) {
      return res.status(400).json({ errorMessage: "Invalid region" });
    }

    if (!roomName || !participantName) {
      return res.status(400).json({ errorMessage: "roomName and participantName are required" });
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