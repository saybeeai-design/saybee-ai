import { formatSearchContext, buildSearchQuery, searchWeb } from '../searchService';
import { generateGeminiText } from './geminiClient';
import {
  buildFallbackInterviewQuestion,
  buildFollowUpPrompt,
  buildInterviewPrompt,
  type GeneratedInterviewQuestion,
  getInterviewConfigFromReportData,
  parseGeneratedQuestionResponse,
  type InterviewPromptConfig,
} from './promptBuilder';
import { resolveRoleContext } from './roleContexts';

export interface GenerateQuestionInput {
  interviewConfig: InterviewPromptConfig;
  previousQuestions: string[];
  resumeSummary: string;
  stage: string;
}

export interface GenerateFollowUpInput {
  followUpCount?: number;
  interviewConfig: InterviewPromptConfig;
  lastQuestion: string;
  resumeSummary: string;
  stage: string;
  userAnswer: string;
}

function shouldUseWebContext(interviewConfig: InterviewPromptConfig, stage: string) {
  const roleContext = resolveRoleContext(interviewConfig);

  if (stage === 'Closing') {
    return false;
  }

  return roleContext.currentAffairsFocus || stage === 'Technical' || stage === 'Scenario';
}

async function fetchWebContext(interviewConfig: InterviewPromptConfig, stage: string) {
  if (!shouldUseWebContext(interviewConfig, stage)) {
    return {
      usedWebContext: false,
      webContextBlock: '',
    };
  }

  try {
    const searchQuery = buildSearchQuery(interviewConfig.category, stage);
    const searchResults = await searchWeb(searchQuery);
    const formatted = formatSearchContext(searchResults);

    if (!formatted) {
      return {
        usedWebContext: false,
        webContextBlock: '',
      };
    }

    return {
      usedWebContext: true,
      webContextBlock: formatted,
    };
  } catch {
    return {
      usedWebContext: false,
      webContextBlock: '',
    };
  }
}

export async function generateInterviewQuestion(
  input: GenerateQuestionInput
): Promise<GeneratedInterviewQuestion> {
  const { interviewConfig, previousQuestions, resumeSummary, stage } = input;
  const { usedWebContext, webContextBlock } = await fetchWebContext(interviewConfig, stage);
  const builtPrompt = buildInterviewPrompt({
    interviewConfig,
    previousQuestions,
    resumeContext: resumeSummary,
    stage,
    webContext: webContextBlock,
  });

  const raw = await generateGeminiText(builtPrompt.prompt, {
    label: `generateInterviewQuestion (${stage})`,
  });

  return parseGeneratedQuestionResponse(raw, builtPrompt, stage, { usedWebContext });
}

export async function generateFollowUpQuestion(
  input: GenerateFollowUpInput
): Promise<GeneratedInterviewQuestion> {
  const { followUpCount = 0, interviewConfig, lastQuestion, resumeSummary, stage, userAnswer } = input;
  const builtPrompt = buildFollowUpPrompt({
    followUpCount,
    interviewConfig,
    lastQuestion,
    resumeContext: resumeSummary,
    stage,
    userAnswer,
  });

  const raw = await generateGeminiText(builtPrompt.prompt, {
    label: `generateFollowUpQuestion (${stage})`,
  });

  return parseGeneratedQuestionResponse(raw, builtPrompt, stage, {
    isFollowUp: true,
    usedWebContext: false,
  });
}

export function buildQuestionFallback(input: {
  interviewConfig: InterviewPromptConfig;
  isFollowUp?: boolean;
  stage: string;
  usedWebContext?: boolean;
}) {
  return buildFallbackInterviewQuestion(input);
}

export { getInterviewConfigFromReportData };
