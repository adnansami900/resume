// aiService.js — fixed edition
// Uses native fetch (Node 18+) instead of node-fetch
// Model updated to gemini-2.5-flash

const { buildGroundTruth, checkTextAgainstTruth } = require('./truthCheck');
const { scoreResumeAgainstJob } = require('./atsScoring');

const GEMINI_KEY   = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

function safeParseNames(field) {
  try {
    const arr = typeof field === 'string' ? JSON.parse(field) : field;
    if (!Array.isArray(arr)) return [];
    return arr.map(i => (typeof i === 'string' ? i : i.name || '')).filter(Boolean);
  } catch { return []; }
}

// Local fallbacks
function localImproveSummary(resume, jobDescription) {
  const ats = scoreResumeAgainstJob(resume, jobDescription || '');
  const top = ats.matchedKeywords.slice(0, 3).join(', ');
  const skills = safeParseNames(resume.skills).slice(0, 3).join(', ');
  let s = resume.summary ? resume.summary.trim() : `${resume.full_name || 'Candidate'} is a motivated professional`;
  if (skills) s += ` skilled in ${skills}`;
  s += '.';
  if (top) s += ` Experienced in areas relevant to this role including ${top}.`;
  return s;
}

function localRewriteBullet(bulletText) {
  const t = bulletText.trim();
  const hasVerb = /^(Achieved|Built|Created|Designed|Developed|Delivered|Managed|Led|Implemented|Improved|Increased|Reduced|Launched|Organized|Analyzed|Automated|Streamlined|Optimized|Resolved|Collaborated|Mentored|Executed|Maintained|Engineered|Deployed|Tested|Documented|Researched|Planned)/i.test(t);
  let r = hasVerb ? t : `Contributed to ${t.charAt(0).toLowerCase()}${t.slice(1)}`;
  if (!/\d/.test(r)) r += ' (tip: add a specific number or % to show measurable impact)';
  return r;
}

function localTailorResume(resume, jobDescription) {
  const ats = scoreResumeAgainstJob(resume, jobDescription);
  return {
    tailoredSummary: localImproveSummary(resume, jobDescription),
    keywordsToAdd: ats.missingKeywords.slice(0, 10),
    reasoning: 'Local rule-based tailoring — no new facts invented, only your existing resume content was used.',
    atsScoreBefore: ats.overallScore,
  };
}

async function callGemini(prompt, maxTokens = 500) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: maxTokens }
    })
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`Gemini ${res.status}: ${t}`); }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no text');
  return text.trim();
}

async function improveSummary(resume, jobDescription) {
  const groundTruth = buildGroundTruth(resume);
  if (GEMINI_KEY) {
    try {
      const prompt = `Rewrite this professional summary to be more compelling for the job below. RULES: Do NOT invent any skills, titles, employers, or experience not already in the original. Only rephrase existing true information.\n\nOriginal summary:\n${resume.summary || ''}\n\nJob description:\n${jobDescription || 'N/A'}\n\nRewritten summary (2-4 sentences, plain text only):`;
      const text = await callGemini(prompt);
      const check = checkTextAgainstTruth(text, groundTruth, resume.summary || '');
      return { text: check.cleanedText, source: 'gemini', truthFlags: check.flags };
    } catch(e) { console.warn('Gemini failed:', e.message); }
  }
  const local = localImproveSummary(resume, jobDescription);
  const check = checkTextAgainstTruth(local, groundTruth, resume.summary || '');
  return { text: check.cleanedText, source: 'local_rules', truthFlags: check.flags };
}

async function rewriteBullet(bulletText, resume) {
  const groundTruth = buildGroundTruth(resume);
  if (GEMINI_KEY) {
    try {
      const prompt = `Rewrite this resume bullet point to start with a strong action verb and be more impactful. Do NOT invent numbers, tools, or achievements not already stated. Only rephrase existing content.\n\nOriginal:\n${bulletText}\n\nRewritten (1 sentence, plain text only):`;
      const text = await callGemini(prompt);
      const check = checkTextAgainstTruth(text, groundTruth, bulletText);
      return { text: check.cleanedText, source: 'gemini', truthFlags: check.flags };
    } catch(e) { console.warn('Gemini failed:', e.message); }
  }
  const local = localRewriteBullet(bulletText);
  const check = checkTextAgainstTruth(local, groundTruth, bulletText);
  return { text: check.cleanedText, source: 'local_rules', truthFlags: check.flags };
}

async function tailorResume(resume, jobDescription) {
  const groundTruth = buildGroundTruth(resume);
  if (GEMINI_KEY) {
    try {
      const prompt = `You are a truth-constrained resume tailoring assistant. Respond ONLY in this exact JSON format with no other text:\n{"tailoredSummary": "...", "keywordsToAdd": ["..."], "reasoning": "..."}\n\nResume summary: ${resume.summary || ''}\nResume skills: ${safeParseNames(resume.skills).join(', ')}\nJob description: ${jobDescription}`;
      const text = await callGemini(prompt, 600);
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
      const check = checkTextAgainstTruth(parsed.tailoredSummary || '', groundTruth, resume.summary || '');
      return { tailoredSummary: check.cleanedText, keywordsToAdd: parsed.keywordsToAdd || [], reasoning: parsed.reasoning || '', source: 'gemini', truthFlags: check.flags };
    } catch(e) { console.warn('Gemini tailor failed:', e.message); }
  }
  const local = localTailorResume(resume, jobDescription);
  const check = checkTextAgainstTruth(local.tailoredSummary, groundTruth, resume.summary || '');
  return { ...local, tailoredSummary: check.cleanedText, source: 'local_rules', truthFlags: check.flags };
}

module.exports = { improveSummary, rewriteBullet, tailorResume };
