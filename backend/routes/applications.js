// Job application tracker routes

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const requireAuth = require('../middleware/auth');
const { buildReminders } = require('../utils/reminders');

const router = express.Router();
router.use(requireAuth);

// GET /api/applications
router.get('/', (req, res) => {
  const apps = db.getAllApplications(req.userId, req.query.status);
  res.json({ applications: apps });
});

// GET /api/applications/stats/summary - counts per status for dashboard
router.get('/stats/summary', (req, res) => {
  res.json({ summary: db.getAppStats(req.userId) });
});

// GET /api/applications/reminders - smart nudges (stale statuses,
// upcoming/past interview dates). Pure computation, no credits, no
// external calls — see utils/reminders.js.
router.get('/reminders', (req, res) => {
  const apps = db.getAllApplications(req.userId);
  res.json({ reminders: buildReminders(apps) });
});

// POST /api/applications
router.post('/', (req, res) => {
  const { companyName, jobTitle, jobDescription, resumeId, status, appliedDate, notes, interviewDate } = req.body;
  if (!companyName || !jobTitle)
    return res.status(400).json({ error: 'companyName and jobTitle are required.' });
  const app = db.createApplication({
    id: uuidv4(),
    user_id: req.userId,
    resume_id: resumeId || null,
    company_name: companyName,
    job_title: jobTitle,
    job_description: jobDescription || '',
    status: db.ALLOWED_STATUSES.includes(status) ? status : 'Saved',
    applied_date: appliedDate || null,
    interview_date: interviewDate || null,
    notes: notes || '',
  });
  res.status(201).json({ application: app });
});

// PUT /api/applications/:id
router.put('/:id', (req, res) => {
  const existing = db.getApplicationById(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Application not found' });
  const {
    companyName, jobTitle, jobDescription, status, appliedDate, notes, resumeId,
    interviewDate, reminderSnoozedUntil,
  } = req.body;
  if (status && !db.ALLOWED_STATUSES.includes(status))
    return res.status(400).json({ error: `Status must be one of: ${db.ALLOWED_STATUSES.join(', ')}` });

  const nextStatus = status ?? existing.status;
  const statusChanged = nextStatus !== existing.status;

  const updated = db.updateApplication(req.params.id, req.userId, {
    company_name:    companyName    ?? existing.company_name,
    job_title:       jobTitle       ?? existing.job_title,
    job_description: jobDescription ?? existing.job_description,
    status:          nextStatus,
    applied_date:    appliedDate    ?? existing.applied_date,
    interview_date:  interviewDate  ?? existing.interview_date,
    notes:           notes          ?? existing.notes,
    resume_id:       resumeId       ?? existing.resume_id,
    // Only restamp when the status actually moved, NOT on every edit —
    // this is what makes "days since status change" meaningful for the
    // smart-reminder system (an unrelated notes edit shouldn't reset a
    // staleness clock). See utils/reminders.js.
    ...(statusChanged ? { status_updated_at: new Date().toISOString() } : {}),
    // Snoozing rides the existing generic PUT rather than a dedicated
    // route — it's just another field on the record.
    ...(reminderSnoozedUntil !== undefined ? { reminder_snoozed_until: reminderSnoozedUntil } : {}),
  });
  res.json({ application: updated });
});

// DELETE /api/applications/:id
router.delete('/:id', (req, res) => {
  const deleted = db.deleteApplication(req.params.id, req.userId);
  if (!deleted) return res.status(404).json({ error: 'Application not found' });
  res.json({ success: true });
});

module.exports = router;
