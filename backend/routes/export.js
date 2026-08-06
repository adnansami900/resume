// Export routes - download resume as PDF or DOCX

const express = require('express');
const db = require('../config/db');
const requireAuth = require('../middleware/auth');
const { generatePDF, generateDOCX } = require('../utils/exportResume');

const router = express.Router();
router.use(requireAuth);

// GET /api/export/:id/pdf
router.get('/:id/pdf', (req, res) => {
  const resume = db.getResumeById(req.params.id, req.userId);
  if (!resume) return res.status(404).json({ error: 'Resume not found' });
  const filename = (resume.full_name || 'resume').replace(/\s+/g, '_');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
  generatePDF(resume).pipe(res);
});

// GET /api/export/:id/docx
router.get('/:id/docx', async (req, res) => {
  const resume = db.getResumeById(req.params.id, req.userId);
  if (!resume) return res.status(404).json({ error: 'Resume not found' });
  try {
    const buffer = await generateDOCX(resume);
    const filename = (resume.full_name || 'resume').replace(/\s+/g, '_');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.docx"`);
    res.send(buffer);
  } catch(err) {
    res.status(500).json({ error: 'DOCX generation failed.', details: err.message });
  }
});

module.exports = router;
