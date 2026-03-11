import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

// ─── Placeholder Evaluation Logic ─────────────────────────────────────────────
// Will be replaced by Gemini AI evaluation in the next implementation step.
function generatePlaceholderEvaluation(answerContent: string): {
  evaluation: object;
  score: number;
} {
  const wordCount = answerContent.trim().split(/\s+/).length;

  // Rudimentary scoring based on answer length as a placeholder
  const lengthScore =
    wordCount < 10 ? 4 : wordCount < 30 ? 6 : wordCount < 60 ? 8 : 9;

  return {
    score: lengthScore,
    evaluation: {
      communication: lengthScore,
      confidence: Math.round(5 + Math.random() * 4),
      technicalAccuracy: Math.round(5 + Math.random() * 4),
      note: 'Placeholder evaluation — Gemini AI evaluation will replace this.',
      strengths: ['Responded to the question'],
      improvements: ['Provide more specific examples'],
    },
  };
}

// ─── POST /api/questions/:id/answer ───────────────────────────────────────────
export const submitAnswer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const questionId = req.params.id as string;
    const { content, transcriptText } = req.body;

    if (!content || content.trim().length === 0) {
      res.status(400).json({ message: 'Answer content is required' });
      return;
    }

    // Verify question belongs to the user's interview
    const question = await prisma.question.findFirst({
      where: { id: questionId },
      include: { interview: { select: { userId: true, id: true, status: true } } },
    });

    if (!question) {
      res.status(404).json({ message: 'Question not found' });
      return;
    }

    if (question.interview.userId !== userId) {
      res.status(403).json({ message: 'Forbidden — this question does not belong to you' });
      return;
    }

    if (question.interview.status === 'COMPLETED') {
      res.status(400).json({ message: 'Cannot submit answers to a completed interview' });
      return;
    }

    // Check if this question was already answered
    const existingAnswer = await prisma.answer.findUnique({ where: { questionId } });
    if (existingAnswer) {
      res.status(409).json({ message: 'This question has already been answered' });
      return;
    }

    const { score, evaluation } = generatePlaceholderEvaluation(content);

    const answer = await prisma.answer.create({
      data: {
        questionId,
        content: content.trim(),
        score,
        evaluation: JSON.stringify(evaluation),
      },
    });

    // If a transcriptText field is provided, upsert the interview transcript
    if (transcriptText) {
      const interviewId = question.interview.id;
      const existing = await prisma.transcript.findUnique({ where: { interviewId } });

      if (existing) {
        await prisma.transcript.update({
          where: { interviewId },
          data: { text: existing.text + `\n\n${transcriptText}` },
        });
      } else {
        await prisma.transcript.create({
          data: { interviewId, text: transcriptText },
        });
      }
    }

    res.status(201).json({
      message: 'Answer submitted successfully',
      answer,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/questions/:id/answer ────────────────────────────────────────────
export const getAnswer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const questionId = req.params.id as string;

    const question = await prisma.question.findFirst({
      where: { id: questionId },
      include: {
        answer: true,
        interview: { select: { userId: true } },
      },
    });

    if (!question) {
      res.status(404).json({ message: 'Question not found' });
      return;
    }

    if (question.interview.userId !== userId) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    if (!question.answer) {
      res.status(404).json({ message: 'No answer found for this question' });
      return;
    }

    const result = {
      ...question.answer,
      evaluation: question.answer.evaluation ? JSON.parse(question.answer.evaluation as any) : null
    };

    res.status(200).json({ answer: result });
  } catch (error) {
    next(error);
  }
};
