// Job recommendation routes.
//
// Currently a single endpoint: rank the seed job dataset against one
// of the user's resumes and suggest both specific listings and the
// broader role types worth searching for. No credit cost — like ATS
// scoring, this is offline/instant computation (see recommendationEngine.js).

const express = require('express');
const db = require('../config/db');
const requireAuth = require('../middleware/auth');
const { recommendJobs } = require('../utils/recommendationEngine');

const router = express.Router();
router.use(requireAuth);

// GET /api/jobs/recommended?resumeId=<id>
// Defaults to the user's most recently updated resume if resumeId is omitted.
router.get('/recommended', async (req, res) => {
  try {
    let resume;

    if (req.query.resumeId) {
      resume = db.getResumeById(req.query.resumeId, req.userId);
      if (!resume) return res.status(404).json({ error: 'Resume not found' });
    } else {
      const resumes = db.getAllResumes(req.userId); // already sorted, most recent first
      if (resumes.length === 0) {
        return res.status(404).json({ error: 'Create a resume first to get job recommendations.' });
      }
      resume = db.getResumeById(resumes[0].id, req.userId);
    }

    const result = await recommendJobs(resume);
    res.json(result);
  } catch (err) {
    console.error('[jobs] recommendation failed:', err);
    res.status(500).json({ error: 'Could not generate job recommendations. Please try again.' });
  }
});

module.exports = router;
