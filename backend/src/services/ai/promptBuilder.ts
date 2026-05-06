import { getLanguageConfig } from './languageConfig';
import { resolveRoleContext } from './roleContexts';

export type InterviewDifficulty = 'easy' | 'medium' | 'hard';

export interface InterviewPromptConfig {
  category: string;
  customRole?: string;
  language: string;
  role: string;
  subRole?: string;
}

export interface GeneratedInterviewQuestion {
  contextUsed: string[];
  difficulty: InterviewDifficulty;
  isFollowUp?: boolean;
  language: string;
  question: string;
  role: string;
  stage: string;
  subRole?: string;
  usedWebContext?: boolean;
}

interface BuildInterviewPromptInput {
  interviewConfig: InterviewPromptConfig;
  previousQuestions: string[];
  resumeContext: string;
  stage: string;
  webContext?: string;
}

interface BuildFollowUpPromptInput {
  followUpCount?: number;
  interviewConfig: InterviewPromptConfig;
  lastQuestion: string;
  resumeContext: string;
  stage: string;
  userAnswer: string;
}

interface BuiltPrompt {
  category: string;
  contextUsed: string[];
  difficulty: InterviewDifficulty;
  language: string;
  prompt: string;
  role: string;
  subRole?: string;
}

const STAGE_GUIDANCE: Record<string, string> = {
  Introduction:
    'Start with a natural opening question that helps the candidate settle in while still being role-relevant.',
  Technical:
    'Ask a role-specific domain, governance, finance, reasoning, or technical depth question that reveals real competence.',
  Scenario:
    'Ask a realistic situational question that tests judgement, trade-offs, and decision making.',
  HR:
    'Ask a behavioral or personality question that reveals maturity, integrity, self-awareness, and communication.',
  Closing:
    'Ask a thoughtful closing question that still feels useful and professional.',
};

const STAGE_DIFFICULTY: Record<string, InterviewDifficulty> = {
  Closing: 'medium',
  HR: 'hard',
  Introduction: 'easy',
  Scenario: 'hard',
  Technical: 'medium',
};

function normalizeDifficulty(value: string | undefined, fallback: InterviewDifficulty): InterviewDifficulty {
  if (value === 'easy' || value === 'medium' || value === 'hard') {
    return value;
  }

  return fallback;
}

function escalateDifficulty(difficulty: InterviewDifficulty): InterviewDifficulty {
  if (difficulty === 'easy') {
    return 'medium';
  }

  if (difficulty === 'medium') {
    return 'hard';
  }

  return 'hard';
}

function buildContextList(items: Array<string | false | null | undefined>) {
  return items.filter((item): item is string => Boolean(item));
}

function buildOutputInstruction(targetDifficulty: InterviewDifficulty) {
  return [
    'Return JSON only. No markdown, no bullets, no explanation.',
    'Use this exact structure:',
    '{',
    '  "question": "<one realistic interview question>",',
    `  "difficulty": "${targetDifficulty}"`,
    '}',
  ].join('\n');
}

function parseStoredInterviewConfig(value: unknown) {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const data = value as Record<string, unknown>;

  return {
    category: typeof data.category === 'string' ? data.category : '',
    customRole: typeof data.customRole === 'string' ? data.customRole : '',
    language: typeof data.language === 'string' ? data.language : '',
    role: typeof data.role === 'string' ? data.role : '',
    subRole: typeof data.subRole === 'string' ? data.subRole : '',
  };
}

function inferConfigFromCategory(category: string) {
  const trimmedCategory = category.trim();

  if (!trimmedCategory) {
    return {
      customRole: '',
      role: 'Custom',
      subRole: '',
    };
  }

  const [rolePart, subRolePart] = trimmedCategory.split(' - ').map((part) => part.trim());

  if (rolePart === 'UPSC' || rolePart === 'SSC') {
    return {
      customRole: '',
      role: rolePart,
      subRole: '',
    };
  }

  if (rolePart === 'State PSC' || rolePart === 'Banking') {
    return {
      customRole: '',
      role: rolePart,
      subRole: subRolePart || '',
    };
  }

  return {
    customRole: trimmedCategory,
    role: 'Custom',
    subRole: '',
  };
}

function stripCodeFences(text: string) {
  return text.replace(/^```json\s*|^```\s*|\s*```$/g, '').trim();
}

export function normalizeInterviewConfig(input: Partial<InterviewPromptConfig>): InterviewPromptConfig {
  const fromCategory = inferConfigFromCategory(input.category?.trim() || '');
  const role = input.role?.trim() || fromCategory.role;
  const subRole = input.subRole?.trim() || fromCategory.subRole;
  const customRole = input.customRole?.trim() || fromCategory.customRole;
  const roleContext = resolveRoleContext({ role, subRole, customRole });
  const language = getLanguageConfig(input.language || 'English').name;

  return {
    category: roleContext.resolvedCategory,
    customRole: customRole || undefined,
    language,
    role: roleContext.role,
    subRole: roleContext.subRole,
  };
}

export function getInterviewConfigFromReportData(
  reportData: unknown,
  fallback: Partial<InterviewPromptConfig>
): InterviewPromptConfig {
  const reportRecord = typeof reportData === 'object' && reportData !== null ? (reportData as Record<string, unknown>) : {};
  const stored = parseStoredInterviewConfig(reportRecord.interviewConfig);

  return normalizeInterviewConfig({
    category: stored?.category || fallback.category,
    customRole: stored?.customRole || fallback.customRole,
    language: stored?.language || fallback.language,
    role: stored?.role || fallback.role,
    subRole: stored?.subRole || fallback.subRole,
  });
}

export function extractResumeContext(parsedData: unknown, fileName: string, category: string) {
  const fallbackContext = `Resume file: ${fileName}. Use it only as background and ask a relevant ${category} interview question.`;

  if (!parsedData) {
    return fallbackContext;
  }

  if (typeof parsedData === 'string') {
    const trimmed = parsedData.trim();

    if (!trimmed) {
      return fallbackContext;
    }

    try {
      const parsedJson = JSON.parse(trimmed) as Record<string, unknown>;
      const summary = typeof parsedJson.summary === 'string' ? parsedJson.summary.trim() : '';
      const projects = Array.isArray(parsedJson.projects) ? parsedJson.projects.join('; ') : '';
      const skills = Array.isArray(parsedJson.skills) ? parsedJson.skills.join(', ') : '';
      const extracted = [summary, projects && `Projects: ${projects}`, skills && `Skills: ${skills}`]
        .filter(Boolean)
        .join('\n');

      return extracted || fallbackContext;
    } catch {
      return trimmed;
    }
  }

  if (typeof parsedData === 'object') {
    const parsedJson = parsedData as Record<string, unknown>;
    const summary = typeof parsedJson.summary === 'string' ? parsedJson.summary.trim() : '';
    const projects = Array.isArray(parsedJson.projects) ? parsedJson.projects.join('; ') : '';
    const skills = Array.isArray(parsedJson.skills) ? parsedJson.skills.join(', ') : '';
    const extracted = [summary, projects && `Projects: ${projects}`, skills && `Skills: ${skills}`]
      .filter(Boolean)
      .join('\n');

    return extracted || fallbackContext;
  }

  return fallbackContext;
}

export function buildInterviewPrompt(input: BuildInterviewPromptInput): BuiltPrompt {
  const interviewConfig = normalizeInterviewConfig(input.interviewConfig);
  const roleContext = resolveRoleContext(interviewConfig);
  const languageConfig = getLanguageConfig(interviewConfig.language);
  const difficulty = STAGE_DIFFICULTY[input.stage] ?? 'medium';
  const questionsAlreadyAsked =
    input.previousQuestions.length > 0
      ? input.previousQuestions.map((question, index) => `${index + 1}. ${question}`).join('\n')
      : 'None yet.';
  const contextUsed = buildContextList([
    'role_context',
    roleContext.subRole && 'sub_role_context',
    'language_control',
    input.resumeContext && 'resume_context',
    input.webContext && 'current_affairs_context',
    input.previousQuestions.length > 0 && 'question_history',
    'human_interview_flow',
  ]);

  const prompt = [
    roleContext.interviewerPersona,
    `Interview track: ${roleContext.resolvedCategory}`,
    `Stage: ${input.stage}`,
    `Target difficulty: ${difficulty}`,
    `Tone to maintain: ${roleContext.tone.join(', ')}`,
    languageConfig.instruction,
    languageConfig.spokenStyle,
    STAGE_GUIDANCE[input.stage] ?? 'Ask one relevant interview question.',
    `Core focus areas:\n- ${roleContext.focusAreas.join('\n- ')}`,
    roleContext.stageOverrides[input.stage]?.length
      ? `Stage-specific emphasis:\n- ${roleContext.stageOverrides[input.stage]?.join('\n- ')}`
      : '',
    input.resumeContext
      ? [
          'Resume context to use naturally:',
          input.resumeContext,
          'If the resume mentions projects, claims, technologies, achievements, or responsibilities, challenge them naturally and ask follow-up worthy questions.',
        ].join('\n')
      : '',
    input.webContext
      ? [
          'Current contextual information you may use:',
          input.webContext,
          'Prioritize this when the role requires governance, banking, economic, policy, or current affairs awareness.',
        ].join('\n')
      : '',
    `Questions already asked. Do not repeat them:\n${questionsAlreadyAsked}`,
    [
      'Interview behavior rules:',
      '- Ask exactly one question at a time.',
      '- Sound like a real human interviewer, not a generic chatbot.',
      '- Make the question specific to the selected role and sub-role.',
      '- Increase difficulty gradually across the interview.',
      '- Avoid robotic phrasing, lists, or multi-part questioning.',
      '- If the selected role is UPSC or State PSC, naturally bring governance, ethics, and current affairs depth.',
      '- If the selected role is Banking, naturally bring finance, regulation, and customer handling depth.',
      '- If the selected role is SSC, bring aptitude, reasoning, and situational clarity.',
      '- If the selected role is Custom, behave like an expert interviewer in that exact domain.',
    ].join('\n'),
    buildOutputInstruction(difficulty),
  ]
    .filter(Boolean)
    .join('\n\n');

  return {
    category: interviewConfig.category,
    contextUsed,
    difficulty,
    language: languageConfig.name,
    prompt,
    role: interviewConfig.role,
    subRole: interviewConfig.subRole,
  };
}

export function buildFollowUpPrompt(input: BuildFollowUpPromptInput): BuiltPrompt {
  const interviewConfig = normalizeInterviewConfig(input.interviewConfig);
  const roleContext = resolveRoleContext(interviewConfig);
  const languageConfig = getLanguageConfig(interviewConfig.language);
  const baseDifficulty = STAGE_DIFFICULTY[input.stage] ?? 'medium';
  const difficulty = input.followUpCount && input.followUpCount > 0
    ? escalateDifficulty(baseDifficulty)
    : baseDifficulty;
  const contextUsed = buildContextList([
    'role_context',
    roleContext.subRole && 'sub_role_context',
    'language_control',
    input.resumeContext && 'resume_context',
    'follow_up_context',
    'human_interview_flow',
  ]);

  const prompt = [
    roleContext.interviewerPersona,
    `Interview track: ${roleContext.resolvedCategory}`,
    `Stage: ${input.stage}`,
    `Target difficulty: ${difficulty}`,
    `Tone to maintain: ${roleContext.tone.join(', ')}`,
    languageConfig.instruction,
    languageConfig.spokenStyle,
    `Follow-up style: ${roleContext.followUpStyle}`,
    `Core focus areas:\n- ${roleContext.focusAreas.join('\n- ')}`,
    `Previous question:\n${input.lastQuestion}`,
    `Candidate answer:\n${input.userAnswer}`,
    input.resumeContext
      ? [
          'Resume context:',
          input.resumeContext,
          'Use it to challenge weak claims, deepen strong answers, or connect the discussion back to actual projects and responsibilities.',
        ].join('\n')
      : '',
    [
      'Interview behavior rules:',
      '- Ask exactly one follow-up question.',
      '- First assess the answer silently: weak, average, or strong.',
      '- If weak, challenge vagueness and ask for specifics.',
      '- If average, probe for depth, examples, trade-offs, or clarity.',
      '- If strong, raise the difficulty and ask a sharper, deeper follow-up.',
      '- Sound natural and human, as if you are continuing a real interview conversation.',
      '- Do not repeat the last question.',
      '- Keep the follow-up concise but sharp.',
    ].join('\n'),
    buildOutputInstruction(difficulty),
  ]
    .filter(Boolean)
    .join('\n\n');

  return {
    category: interviewConfig.category,
    contextUsed,
    difficulty,
    language: languageConfig.name,
    prompt,
    role: interviewConfig.role,
    subRole: interviewConfig.subRole,
  };
}

export function parseGeneratedQuestionResponse(
  raw: string,
  builtPrompt: Pick<BuiltPrompt, 'contextUsed' | 'difficulty' | 'language' | 'role' | 'subRole'>,
  stage: string,
  options: { isFollowUp?: boolean; usedWebContext?: boolean } = {}
): GeneratedInterviewQuestion {
  const cleaned = stripCodeFences(raw);
  let question = cleaned;
  let difficulty = builtPrompt.difficulty;

  try {
    const parsed = JSON.parse(cleaned) as { difficulty?: string; question?: string };

    if (typeof parsed.question === 'string' && parsed.question.trim()) {
      question = parsed.question.trim();
    }

    difficulty = normalizeDifficulty(parsed.difficulty, builtPrompt.difficulty);
  } catch {
    question = cleaned.trim();
  }

  return {
    contextUsed: builtPrompt.contextUsed,
    difficulty,
    isFollowUp: options.isFollowUp,
    language: builtPrompt.language,
    question,
    role: builtPrompt.role,
    stage,
    subRole: builtPrompt.subRole,
    usedWebContext: options.usedWebContext,
  };
}

export function buildFallbackInterviewQuestion(input: {
  interviewConfig: InterviewPromptConfig;
  isFollowUp?: boolean;
  stage: string;
  usedWebContext?: boolean;
}): GeneratedInterviewQuestion {
  const interviewConfig = normalizeInterviewConfig(input.interviewConfig);
  const languageConfig = getLanguageConfig(interviewConfig.language);

  return {
    contextUsed: ['fallback_question', 'language_control'],
    difficulty: input.isFollowUp ? 'medium' : STAGE_DIFFICULTY[input.stage] ?? 'medium',
    isFollowUp: input.isFollowUp,
    language: languageConfig.name,
    question: languageConfig.fallbackQuestion,
    role: interviewConfig.role,
    stage: input.stage,
    subRole: interviewConfig.subRole,
    usedWebContext: input.usedWebContext,
  };
}
