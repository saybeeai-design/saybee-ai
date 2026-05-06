import assert from 'node:assert/strict';
import {
  buildFallbackInterviewQuestion,
  buildFollowUpPrompt,
  buildInterviewPrompt,
  normalizeInterviewConfig,
} from '../src/services/ai/promptBuilder';

function assertIncludes(text: string, expected: string, label: string) {
  assert.ok(text.includes(expected), `${label} should include "${expected}"`);
}

const assamPscConfig = normalizeInterviewConfig({
  language: 'Assamese',
  role: 'State PSC',
  subRole: 'Assam PSC',
});

const assamPrompt = buildInterviewPrompt({
  interviewConfig: assamPscConfig,
  previousQuestions: [],
  resumeContext: 'Projects: District grievance dashboard, flood response analytics.',
  stage: 'Technical',
});

assert.equal(assamPrompt.language, 'Assamese');
assert.equal(assamPrompt.role, 'State PSC');
assert.equal(assamPrompt.subRole, 'Assam PSC');
assertIncludes(assamPrompt.prompt, 'Conduct the interview entirely in Assamese', 'Assam PSC prompt');
assertIncludes(assamPrompt.prompt, 'Assam administration', 'Assam PSC prompt');
assertIncludes(assamPrompt.prompt, 'Assam economy', 'Assam PSC prompt');

const bankingConfig = normalizeInterviewConfig({
  language: 'Hindi',
  role: 'Banking',
  subRole: 'RBI Grade B',
});

const bankingPrompt = buildInterviewPrompt({
  interviewConfig: bankingConfig,
  previousQuestions: ['What do you know about inflation targeting?'],
  resumeContext: 'Experience: worked on retail lending ops and customer escalation handling.',
  stage: 'Technical',
});

assert.equal(bankingPrompt.language, 'Hindi');
assertIncludes(bankingPrompt.prompt, 'Conduct the interview entirely in Hindi', 'Banking prompt');
assertIncludes(bankingPrompt.prompt, 'monetary policy', 'Banking prompt');
assertIncludes(bankingPrompt.prompt, 'financial regulation', 'Banking prompt');

const customConfig = normalizeInterviewConfig({
  customRole: 'Data Scientist',
  language: 'English',
  role: 'Custom',
});

const customPrompt = buildInterviewPrompt({
  interviewConfig: customConfig,
  previousQuestions: [],
  resumeContext: 'Projects: churn prediction, recommendation engine, experimentation platform.',
  stage: 'Technical',
});

assert.equal(customPrompt.role, 'Custom');
assertIncludes(customPrompt.prompt, 'Data Scientist interviewer', 'Custom role prompt');
assertIncludes(customPrompt.prompt, 'Data Scientist core responsibilities', 'Custom role prompt');

const followUpPrompt = buildFollowUpPrompt({
  followUpCount: 1,
  interviewConfig: customConfig,
  lastQuestion: 'How would you validate a recommendation model?',
  resumeContext: 'Projects: recommendation engine for a video platform.',
  stage: 'Scenario',
  userAnswer: 'I would check accuracy and see if users click more.',
});

assertIncludes(followUpPrompt.prompt, 'Previous question:', 'Follow-up prompt');
assertIncludes(followUpPrompt.prompt, 'Candidate answer:', 'Follow-up prompt');
assertIncludes(followUpPrompt.prompt, 'Ask exactly one follow-up question.', 'Follow-up prompt');

const fallbackQuestion = buildFallbackInterviewQuestion({
  interviewConfig: bankingConfig,
  stage: 'Introduction',
});

assert.equal(fallbackQuestion.language, 'Hindi');
assert.ok(fallbackQuestion.question.length > 0, 'Fallback question should exist');

console.log('Interview prompt builder verification passed.');
