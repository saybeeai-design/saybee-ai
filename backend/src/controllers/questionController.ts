import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { INTERVIEW_STAGES, InterviewStage } from './interviewController';
import {
  extractResumeContext,
  getInterviewConfigFromReportData,
} from '../services/ai/promptBuilder';
import { buildQuestionFallback, generateInterviewQuestion } from '../services/ai/questionService';

const QUESTIONS_PER_STAGE = 2;

function getCurrentStage(questionCount: number): { stage: InterviewStage; stageIndex: number } {
  const stageIndex = Math.min(
    Math.floor(questionCount / QUESTIONS_PER_STAGE),
    INTERVIEW_STAGES.length - 1
  );
  return { stage: INTERVIEW_STAGES[stageIndex], stageIndex };
}

export const generateNextQuestion = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const interviewId = req.params.id as string;

    const interview = await prisma.interview.findFirst({
      where: { id: interviewId, userId },
      include: {
        questions: { orderBy: { order: 'asc' } },
        resume: true,
      },
    });

    if (!interview) {
      res.status(404).json({ message: 'Interview not found' });
      return;
    }

    if (interview.status === 'COMPLETED') {
      res.status(400).json({ message: 'Interview is already completed' });
      return;
    }

    const currentQuestionCount = interview.questions.length;
    const maxQuestions = INTERVIEW_STAGES.length * QUESTIONS_PER_STAGE;

    if (currentQuestionCount >= maxQuestions) {
      res.status(200).json({
        done: true,
        message: 'All questions have been asked. Please finish the interview.',
        totalQuestions: currentQuestionCount,
      });
      return;
    }

    const { stage, stageIndex } = getCurrentStage(currentQuestionCount);
    const interviewConfig = getInterviewConfigFromReportData(interview.reportData, {
      category: interview.category,
      language: interview.language,
    });
    const previousQuestions = interview.questions.map((question) => question.content);
    const resumeSummary = extractResumeContext(
      interview.resume.parsedData,
      interview.resume.fileName,
      interviewConfig.category
    );

    let generatedQuestion = buildQuestionFallback({
      interviewConfig,
      stage,
    });

    try {
      generatedQuestion = await generateInterviewQuestion({
        interviewConfig,
        previousQuestions,
        resumeSummary,
        stage,
      });
    } catch (error) {
      console.error('[QuestionController] Dynamic question generation failed, using fallback:', error);
    }

    const question = await prisma.question.create({
      data: {
        interviewId,
        content: generatedQuestion.question,
        order: currentQuestionCount + 1,
      },
    });

    const isLastQuestion = currentQuestionCount + 1 >= maxQuestions;

    res.status(201).json({
      question,
      questionMeta: generatedQuestion,
      stage,
      stageIndex,
      totalStages: INTERVIEW_STAGES.length,
      questionNumber: currentQuestionCount + 1,
      totalQuestions: maxQuestions,
      isLastQuestion,
    });
  } catch (error) {
    next(error);
  }
};

export const getInterviewQuestions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const interviewId = req.params.id as string;

    const interview = await prisma.interview.findFirst({
      where: { id: interviewId, userId },
    });

    if (!interview) {
      res.status(404).json({ message: 'Interview not found' });
      return;
    }

    const questions = await prisma.question.findMany({
      where: { interviewId },
      orderBy: { order: 'asc' },
      include: { answer: true },
    });

    const annotated = questions.map((question) => ({
      ...question,
      stage: getCurrentStage(question.order - 1).stage,
    }));

    res.status(200).json({ questions: annotated });
  } catch (error) {
    next(error);
  }
};
