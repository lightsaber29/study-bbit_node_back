import { createApp } from './src/app.js';
import { config } from './src/config/env.js';

const { server } = createApp();

server.listen(config.SERVER_PORT, () => {
  console.log(`Server is running on port ${config.SERVER_PORT}`);
});