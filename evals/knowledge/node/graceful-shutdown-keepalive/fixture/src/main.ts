import { createApp } from './app.ts';

const server = createApp();
server.listen(Number(process.env.PORT ?? 3000), () => {
  const addr = server.address();
  console.log(`listening ${typeof addr === 'object' && addr ? addr.port : ''}`);
});
