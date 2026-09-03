import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import { waitForDb } from './db.js';
import criteriaRoutes from './routes/criteria.js';
import accommodationRoutes from './routes/accommodations.js';
import assessmentRoutes from './routes/assessments.js';
import paymentRoutes from './routes/payments.js';
import subscriptionRoutes from './routes/subscriptions.js';
import invitationRoutes from './routes/invitations.js';
import auditRoutes from './routes/audits.js';
import uploadRoutes from './routes/uploads.js';
import adminRoutes from './routes/admin.js';

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));

// Mollie webhook sends application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'ecostay-api' }));

app.use('/api/criteria', criteriaRoutes);
app.use('/api/accommodations', accommodationRoutes);
app.use('/api/accommodations', assessmentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/audits', auditRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/admin', adminRoutes);

app.use('/api', (req, res) => res.status(404).json({ error: 'Onbekend endpoint' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Er ging iets mis op de server' });
});

const port = Number(process.env.PORT || 4000);

waitForDb()
  .then(() => {
    app.listen(port, () => console.log(`Ecostay API luistert op http://localhost:${port}`));
  })
  .catch((err) => {
    console.error('Kon geen verbinding maken met de database:', err.message);
    process.exit(1);
  });
