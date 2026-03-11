import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { INTERVIEW_STAGES, InterviewStage } from './interviewController';

// ─── Placeholder Question Bank ────────────────────────────────────────────────
// This will be replaced by the Gemini AI engine in the next implementation step.
const PLACEHOLDER_QUESTIONS: Record<InterviewStage, string[]> = {
  Introduction: [
    'Tell me about yourself and your background.',
    'What motivated you to apply for this position?',
    'Describe your overall career journey so far.',
  ],
  Technical: [
    'What are your core technical skills and areas of expertise?',
    'Describe a challenging technical problem you solved recently.',
    'How do you approach debugging a complex issue in production?',
    'What development methodologies are you familiar with?',
  ],
  Scenario: [
    'Describe a time you had to deliver under a tight deadline. How did you manage it?',
    'Tell me about a situation where you disagreed with your team. How was it resolved?',
    'Give an example of a project where you had to learn something new quickly.',
  ],
  HR: [
    'Where do you see yourself in the next 5 years?',
    'What are your biggest professional strengths and areas for improvement?',
    'How do you handle stress and pressure at work?',
    'What are your salary expectations?',
  ],
  Closing: [
    'Do you have any questions for us?',
    'Is there anything else you would like us to know about you?',
    'When are you available to start if selected?',
  ],
};

const QUESTIONS_PER_STAGE = 2;

// Determine current stage from the number of questions already asked
function getCurrentStage(questionCount: number): { stage: InterviewStage; stageIndex: number } {
  const stageIndex = Math.min(
    Math.floor(questionCount / QUESTIONS_PER_STAGE),
    INTERVIEW_STAGES.length - 1
  );
  return { stage: INTERVIEW_STAGES[stageIndex], stageIndex };
}

// ─── POST /api/interviews/:id/question ────────────────────────────────────────
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
      include: { questions: { orderBy: { order: 'asc' } } },
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
        message: 'All questions have been asked. Please finish the interview.',
        done: true,
        totalQuestions: currentQuestionCount,
      });
      return;
    }

    const { stage, stageIndex } = getCurrentStage(currentQuestionCount);
    const stageQuestions = PLACEHOLDER_QUESTIONS[stage];

    // Pick a question from the stage bank the interviewer hasn't asked yet
    const askedContents = interview.questions.map((q) => q.content);
    const available = stageQuestions.filter((q) => !askedContents.includes(q));
    const questionContent =
      available.length > 0
        ? available[Math.floor(Math.random() * available.length)]
        : stageQuestions[Math.floor(Math.random() * stageQuestions.length)];

    const question = await prisma.question.create({
      data: {
        interviewId,
        content: questionContent,
        order: currentQuestionCount + 1,
      },
    });

    const isLastQuestion = currentQuestionCount + 1 >= maxQuestions;

    res.status(201).json({
      question,
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

// ─── GET /api/interviews/:id/questions ────────────────────────────────────────
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

    // Annotate each question with its stage
    const annotated = questions.map((q) => ({
      ...q,
      stage: getCurrentStage(q.order - 1).stage,
    }));

    res.status(200).json({ questions: annotated });
  } catch (error) {
    next(error);
  }
};
