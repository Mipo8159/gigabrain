import { createServer } from 'node:http';
import path from 'node:path';
import { createFilesHandler } from './files.ts';

const uploadsDir = path.resolve(process.env.UPLOADS_DIR ?? 'data/uploads');
createServer(createFilesHandler(uploadsDir)).listen(Number(process.env.PORT ?? 3000));
