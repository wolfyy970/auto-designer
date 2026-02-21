import { Hono } from 'hono';
import { getLogEntries, clearLogEntries } from '../log-store.ts';

const logs = new Hono();

logs.get('/', (c) => {
  return c.json(getLogEntries());
});

logs.delete('/', (c) => {
  clearLogEntries();
  return c.body(null, 204);
});

export default logs;
