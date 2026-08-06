// ==========================================================
// recommendationEngine.js
// Ranks seed job listings against a resume and answers two things:
//   1. Which specific listings are the best matches (recommendations)
//   2. What kind of roles the user should be searching for (suggestedRoles)
//
// The matching itself deliberately reuses scoreResumeAgainstJob() from
// atsScoring.js unchanged — a job listing's description is just another
// "job description" to score a resume against, so there is no separate
// matching algorithm to invent or maintain here.
//
// Two-tier pattern (same shape as aiService.js / resumeParser.js): a
// template-based reason is always available; if GEMINI_API_KEY is set,
// one BATCHED Gemini call asks for a short personalised reason per top
// match (a single request for all of them, not one per job). Any
// Gemini failure falls back to the templates. This never costs an AI
// credit — like ATS scoring, it's offline/instant and does not go
// through withCredit().
// ==========================================================

const { listAllJobs } = require('./jobProvider');
const { scoreResumeAgainstJob } = require('./atsScoring');
const { buildResumeProfile } = require('./resumeProfile');

const GEMINI_KEY   = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = () => process.env.GEMINI_MODEL || 'gemini-2.5-flash';

function norm(s) {
  return String(s || '').trim().toLowerCase();
}

// Case-insensitive intersection/difference between the resume's skills
// and a job's required skills.
function diffSkills(resumeSkills, requiredSkills) {
  const have = new Set(resumeSkills.map(norm));
  const matched = [];
  const missing = [];
  requiredSkills.forEach(skill => {
    (have.has(norm(skill)) ? matched : missing).push(skill);
  });
  return { matched, missing };
}

function templateReason(job, matchedSkills) {
  if (matchedSkills.length >= 2) {
    return `Your experience with ${matchedSkills.slice(0, 3).join(', ')} lines up directly with what this ${job.title} role needs.`;
  }
  if (matchedSkills.length === 1) {
    return `Your ${matchedSkills[0]} experience is a solid starting match for this ${job.title} role.`;
  }
  return `This ${job.title} role is a broad fit based on your overall resume content.`;
}

async function callGemini(prompt, maxTokens = 700) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL()}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: maxTokens, responseMimeType: 'application/json' },
    }),
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`Gemini ${res.status}: ${t}`); }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no text');
  return text.trim();
}

// One batched call for all top matches — never N calls for N jobs.
async function geminiReasons(resume, matches) {
  const prompt = `You are a career advisor. For each job below, write ONE short, specific sentence (max 25 words) explaining why this candidate's resume is a good match. Do NOT invent skills or experience not listed. Respond ONLY with strict JSON: {"reasons": {"<job id>": "<sentence>", ...}}.

Candidate summary: ${resume.summary || 'N/A'}
Candidate skills: ${matches.length ? '' : ''}${(resume._profileSkills || []).join(', ')}

Jobs:
${matches.map(m => `- id: ${m.job.id} | title: ${m.job.title} | matched skills: ${m.matchedSkills.join(', ') || 'none'} | job requires: ${m.job.requiredSkills.join(', ')}`).join('\n')}`;

  const text = await callGemini(prompt);
  const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
  return parsed.reasons || {};
}

// Groups the top matches' titles into a short, de-duplicated list of
// role types the user should be searching for.
function deriveSuggestedRoles(matches) {
  const seen = new Set();
  const roles = [];
  matches.forEach(m => {
    // Strip a leading seniority word so "Senior Backend Developer" and
    // "Backend Developer" surface as one suggested role, not two.
    const generic = m.job.title.replace(/^(junior|senior|lead|principal)\s+/i, '').trim();
    const key = norm(generic);
    if (!seen.has(key)) { seen.add(key); roles.push(generic); }
  });
  return roles.slice(0, 6);
}

async function recommendJobs(resume, { limit = 8 } = {}) {
  const profile = buildResumeProfile(resume);
  const jobs = listAllJobs();

  const scored = jobs.map(job => {
    const combinedDescription = `${job.description} ${job.requiredSkills.join(' ')}`;
    const ats = scoreResumeAgainstJob(resume, combinedDescription);
    const { matched, missing } = diffSkills(profile.skills, job.requiredSkills);
    return {
      job,
      matchScore: ats.overallScore,
      matchedSkills: matched,
      missingSkills: missing,
    };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);
  const top = scored.slice(0, limit);

  // Template reasons are always computed first so there's a safe
  // fallback no matter what happens with Gemini.
  top.forEach(m => { m.reason = templateReason(m.job, m.matchedSkills); });

  let source = 'local_rules';
  if (GEMINI_KEY) {
    try {
      const reasons = await geminiReasons({ ...resume, _profileSkills: profile.skills }, top);
      top.forEach(m => { if (reasons[m.job.id]) m.reason = reasons[m.job.id]; });
      source = 'gemini';
    } catch (e) {
      console.warn('Gemini job-recommendation reasons failed, using templates:', e.message);
    }
  }

  const recommendations = top.map(m => ({
    job: m.job,
    matchScore: m.matchScore,
    matchedSkills: m.matchedSkills,
    missingSkills: m.missingSkills,
    reason: m.reason,
  }));

  return {
    recommendations,
    suggestedRoles: deriveSuggestedRoles(top),
    profile,
    source,
  };
}

module.exports = { recommendJobs };
