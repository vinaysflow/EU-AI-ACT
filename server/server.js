import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { logger } from './middleware/logger.js';
import { timeout } from './middleware/timeout.js';
import classifyRouter from './routes/classify.js';
import evaluateRouter from './routes/evaluate.js';
import consistencyRouter from './routes/consistency.js';
import synthesiseRouter from './routes/synthesise.js';
import reportRouter from './routes/report.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));

app.use('/api', logger);
app.use('/api', timeout(30000));

app.use('/api/classify', classifyRouter);
app.use('/api/evaluate', evaluateRouter);
app.use('/api/consistency', consistencyRouter);
app.use('/api/synthesise', synthesiseRouter);
app.use('/api/report', reportRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
