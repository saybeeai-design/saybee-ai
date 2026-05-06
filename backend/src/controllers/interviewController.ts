import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { sendInterviewReport } from '../services/emailService';
import { generateFinalReport } from '../services/ai/evaluationService';
import { extractResumeContext, normalizeInterviewConfig } from '../services/ai/promptBuilder';
import { buildQuestionFallback, generateInterviewQuestion } from '../services/ai/questionService';

// Interview stages in order
export const INTERVIEW_STAGES = [
  'Introduction',
  'Technical',
  'Scenario',
  'HR',
  'Closing',
] as const;

export type InterviewStage = typeof INTERVIEW_STAGES[number];

function safeParseEvaluation(value: unknown) {
  if (typeof value !== 'string') {
    return value ?? null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

// ─── POST /api/interviews/start ───────────────────────────────────────────────
export const startInterview = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const resumeId =
      typeof req.body.resume === 'string' && req.body.resume.trim()
        ? req.body.resume.trim()
        : typeof req.body.resumeId === 'string'
          ? req.body.resumeId.trim()
          : '';
    const interviewConfig = normalizeInterviewConfig({
      category: typeof req.body.category === 'string' ? req.body.category.trim() : '',
      customRole: typeof req.body.customRole === 'string' ? req.body.customRole.trim() : '',
      language: typeof req.body.language === 'string' ? req.body.language.trim() : '',
      role: typeof req.body.role === 'string' ? req.body.role.trim() : '',
      subRole: typeof req.body.subRole === 'string' ? req.body.subRole.trim() : '',
    });
    const category = interviewConfig.category;

    if (!resumeId || !category) {
      res.status(400).json({ message: 'resume/category information is required' });
      return;
    }

    // Check Credits
    const userCheck = await prisma.user.findUnique({ where: { id: userId } });
    if (!userCheck || userCheck.credits <= 0) {
      res.status(403).json({ 
        success: false,
        code: "NO_CREDITS",
        message: 'No credits left'
      });
      return;
    }

    // Verify the resume belongs to the user
    const resume = await prisma.resume.findFirst({ where: { id: resumeId, userId } });
    if (!resume) {
      res.status(404).json({ message: 'Resume not found or does not belong to this user' });
      return;
    }

    const interview = await prisma.interview.create({
      data: {
        userId,
        resumeId,
        category,
        language: interviewConfig.language,
        reportData: {
          interviewConfig,
        } as any,
        status: 'IN_PROGRESS',
        // Store current stage in a JSON metadata field — we use the existing
        // data model's JSON-compatible approach via the score field being nullable
        // and tracking stage via a prefix in the category temporarily.
        // We'll use a separate approach: track stage via the question count.
      },
      include: {
        resume: { select: { id: true, fileName: true } },
      },
    });

    // Deduct 1 credit
    await prisma.user.update({
      where: { id: userId },
      data: { credits: { decrement: 1 } },
    });

    // Generate the first question immediately
    const resumeContext = extractResumeContext(resume.parsedData, resume.fileName, category);
    let firstQuestionMeta = buildQuestionFallback({
      interviewConfig,
      stage: INTERVIEW_STAGES[0],
    });

    try {
      firstQuestionMeta = await generateInterviewQuestion({
        interviewConfig,
        previousQuestions: [],
        resumeSummary: resumeContext,
        stage: INTERVIEW_STAGES[0],
      });
    } catch (error) {
      console.error('[Interview Start] Failed to generate the first AI question, using fallback:', error);
    }

    const firstQuestion = await prisma.question.create({
      data: {
        interviewId: interview.id,
        content: firstQuestionMeta.question,
        order: 1,
      },
    });

    res.status(201).json({
      message: 'Interview session started',
      interview: {
        ...interview,
        currentStage: INTERVIEW_STAGES[0],
        totalStages: INTERVIEW_STAGES.length,
        firstQuestion,
        firstQuestionMeta,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/interviews/:id ──────────────────────────────────────────────────
export const getInterview = async (
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
        resume: { select: { id: true, fileName: true } },
        questions: {
          orderBy: { order: 'asc' },
          include: { answer: true },
        },
        transcript: true,
      },
    });

    if (!interview) {
      res.status(404).json({ message: 'Interview not found' });
      return;
    }

    // Derive current stage from answered question count
    const answeredCount = interview.questions.filter((q) => q.answer !== null).length;
    const stageIndex = Math.min(
      Math.floor(answeredCount / 2),  // ~2 questions per stage
      INTERVIEW_STAGES.length - 1
    );

    const result = {
      ...interview,
      questions: interview.questions.map(q => ({
        ...q,
        answer: q.answer ? {
          ...q.answer,
          evaluation: safeParseEvaluation(q.answer.evaluation)
        } : null
      }))
    };

    res.status(200).json({
      interview: {
        ...result,
        currentStage: INTERVIEW_STAGES[stageIndex],
        stageIndex,
        totalStages: INTERVIEW_STAGES.length,
        answeredCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/interviews ──────────────────────────────────────────────────────
export const listInterviews = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    const interviews = await prisma.interview.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        resume: { select: { id: true, fileName: true } },
        _count: { select: { questions: true } },
      },
    });

    res.status(200).json({ interviews });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/interviews/:id/finish ─────────────────────────────────────────
export const finishInterview = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const interviewId = req.params.id as string;
    const { score } = req.body; // Optional final score (0–100)

    const interview = await prisma.interview.findFirst({
      where: { id: interviewId, userId },
      include: {
        questions: { include: { answer: true } },
      },
    });

    if (!interview) {
      res.status(404).json({ message: 'Interview not found' });
      return;
    }

    if (interview.status === 'COMPLETED') {
      res.status(200).json({ 
        message: 'Interview is already completed',
        interview
      });
      return;
    }

    // Calculate average score from individual answers if no overall score given
    const answers = interview.questions
      .map((q) => q.answer)
      .filter((a): a is NonNullable<typeof a> => a !== null && a.score !== null);

    const averageScore =
      score !== undefined
        ? Number(score)
        : answers.length > 0
        ? answers.reduce((sum, a) => sum + (a.score ?? 0), 0) / answers.length
        : null;

    // Build full transcript text from all answers
    const transcriptText = interview.questions
      .map((q, idx) => {
        const ans = q.answer?.content ?? '(No answer)';
        const evaluation = safeParseEvaluation(q.answer?.evaluation);
        return `Q${idx + 1} [${q.content}]\nA: ${ans}\nEvaluation: ${JSON.stringify(evaluation)}`;
      })
      .join('\n\n');

    const updatedInterview = await prisma.interview.update({
      where: { id: interviewId },
      data: {
        status: 'COMPLETED',
        score: averageScore,
        transcript: {
          upsert: {
            create: { text: transcriptText },
            update: { text: transcriptText },
          },
        },
      },
      include: { transcript: true },
    });

    // Generate Final Report using Gemini
    const finalReport = await generateFinalReport(transcriptText, interview.category, interview.language);

    // Save report to the interview
    const completedInterview = await prisma.interview.update({
      where: { id: interviewId },
      data: { reportData: finalReport as any },
      include: { transcript: true },
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      await sendInterviewReport(user.email, user.name || 'User', interviewId).catch((err) => console.error('Email error:', err));
    }

    res.status(200).json({
      message: 'Interview completed successfully',
      interview: completedInterview,
    });
  } catch (error) {
    next(error);
  }
};
