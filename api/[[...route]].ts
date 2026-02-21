import { handle } from 'hono/vercel';
import app from '../server/app.ts';

export const runtime = 'nodejs';
export const maxDuration = 300;

export default handle(app);
