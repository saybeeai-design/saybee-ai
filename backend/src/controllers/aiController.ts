import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { evaluateAnswer } from '../services/ai/evaluationService';
import {
  extractResumeContext,
  getInterviewConfigFromReportData,
} from '../services/ai/promptBuilder';
import {
  buildQuestionFallback,
  generateInterviewQuestion,
  generateFollowUpQuestion,
} from '../services/ai/questionService';
import { transcribeBuffer } from '../services/ai/speechToTextService';
import { textToSpeech, getLanguageCode } from '../services/ai/textToSpeechService';
import { INTERVIEW_STAGES } from './interviewController';

const MAX_FOLLOW_UPS = 2; // Maximum follow-ups per main question before advancing

const QUESTIONS_PER_STAGE = 2;

function getCurrentStage(questionCount: number) {
  const stageIndex = Math.min(
    Math.floor(questionCount / QUESTIONS_PER_STAGE),
    INTERVIEW_STAGES.length - 1
  );
  return { stage: INTERVIEW_STAGES[stageIndex], stageIndex };
}

const EVALUATION_FALLBACK = {
  communication: 5,
  confidence: 5,
  score: 5,
  strengths: ['Responded to the question'],
  suggestions: ['Please provide a more detailed answer'],
  summary: 'Evaluation is temporarily unavailable.',
  technicalAccuracy: 5,
  weaknesses: ['Answer could not be fully evaluated'],
};

// ─── PHASE 1: POST /api/interviews/:id/generate-question ─────────────────────
// Full AI question generation pipeline:
//   1. Determine current stage from answered count
//   2. Call Gemini to generate a context-aware question
//   3. Store it in the Question table
//   4. Optionally convert question to speech
export const generateAIQuestion = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const interviewId = req.params.id as string;
    const { speakQuestion = false } = req.body;

    const interview = await prisma.interview.findFirst({
      where: { id: interviewId, userId },
      include: {
        resume: true,
        questions: { orderBy: { order: 'asc' }, include: { answer: true } },
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

    const totalQuestions = interview.questions.length;
    const maxQuestions = INTERVIEW_STAGES.length * QUESTIONS_PER_STAGE;

    if (totalQuestions >= maxQuestions) {
      res.status(200).json({
        done: true,
        message: 'All questions asked. Please call /finish to complete the interview.',
        totalQuestions,
      });
      return;
    }

    const { stage, stageIndex } = getCurrentStage(totalQuestions);
    const previousQuestions = interview.questions.map((q) => q.content);
    const interviewConfig = getInterviewConfigFromReportData(interview.reportData, {
      category: interview.category,
      language: interview.language,
    });
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
    } catch (err: any) {
      console.error('Gemini AI failed to generate question, using fallback:', err);
    }


    // 2. Persist question
    const question = await prisma.question.create({
      data: {
        interviewId,
        content: generatedQuestion.question,
        order: totalQuestions + 1,
      },
    });

    // 3. Optionally convert question to speech
    let ttsResult = null;
    if (speakQuestion) {
      const langCode = getLanguageCode(interview.language);
      ttsResult = await textToSpeech(generatedQuestion.question, langCode);
    }

    const isLastQuestion = totalQuestions + 1 >= maxQuestions;

    res.status(201).json({
      question,
      stage,
      stageIndex,
      totalStages: INTERVIEW_STAGES.length,
      questionNumber: totalQuestions + 1,
      totalQuestions: maxQuestions,
      questionMeta: generatedQuestion,
      isLastQuestion,
      tts: ttsResult,
    });
  } catch (error) {
    next(error);
  }
};

// ─── PHASE 2: POST /api/questions/:id/evaluate ────────────────────────────────
// Evaluate an already-submitted answer using Gemini AI.
// Can also be called immediately after submit if evaluate=true in the answer body.
export const evaluateQuestionAnswer = async (
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
        interview: {
          select: { userId: true, category: true, language: true },
        },
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
      res.status(404).json({ message: 'No answer found for this question. Submit an answer first.' });
      return;
    }

    const stageIndex = Math.min(
      Math.floor((question.order - 1) / QUESTIONS_PER_STAGE),
      INTERVIEW_STAGES.length - 1
    );
    const stage = INTERVIEW_STAGES[stageIndex];

    let feedback = EVALUATION_FALLBACK;
    try {
      feedback = await evaluateAnswer({
        answer: question.answer.content,
        category: question.interview.category,
        language: question.interview.language,
        question: question.content,
        stage,
      });
    } catch (err: any) {
      console.error('Gemini AI failed to evaluate answer, using fallback:', err);
    }

    // Update the answer with AI evaluation
    const updatedAnswer = await prisma.answer.update({
      where: { id: question.answer.id },
      data: {
        score: feedback.score,
        evaluation: JSON.stringify(feedback),
      },
    });

    res.status(200).json({
      message: 'Answer evaluated successfully',
      answer: updatedAnswer,
      evaluation: feedback,
    });
  } catch (error) {
    next(error);
  }
};

// ─── PHASE 3: POST /api/ai/transcribe ─────────────────────────────────────────
// Accepts a multipart audio upload and returns the Whisper transcription.
export const transcribeAudioFile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No audio file provided' });
      return;
    }

    const result = await transcribeBuffer(req.file.buffer, req.file.mimetype);

    res.status(200).json({
      message: 'Transcription complete',
      transcription: result,
    });
  } catch (error) {
    next(error);
  }
};

// ─── PHASE 4: POST /api/ai/speak ──────────────────────────────────────────────
// Converts text to speech. If no TTS key is available, returns stub
// so the client can use the browser's Web Speech API.
export const speakText = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { text, language = 'English' } = req.body;

    if (!text || text.trim().length === 0) {
      res.status(400).json({ message: 'text is required' });
      return;
    }

    const langCode = getLanguageCode(language);
    const result = await textToSpeech(text, langCode);

    res.status(200).json({
      message: 'Text-to-speech conversion complete',
      tts: result,
    });
  } catch (error) {
    next(error);
  }
};

// ─── PHASE 5: POST /api/interviews/:id/next-turn ─────────────────────────────
// Full interview loop:
//   1. Save the user's spoken/typed answer to the current question
//   2. Evaluate it (Gemini)
//   3. Generate the next question (Gemini)
//   4. Convert it to speech
//   Returns everything in one response for optimized frontend usage.
export const nextInterviewTurn = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const interviewId = req.params.id as string;
    const {
      questionId,        // The question being answered
      answerContent,     // Plain text answer (from STT or typed)
      speakNextQuestion = true,
    } = req.body;

    if (!questionId || !answerContent) {
      res.status(400).json({ message: 'questionId and answerContent are required' });
      return;
    }

    // ── 1. Validate and save answer ───────────────────────────────────────────
    const question = await prisma.question.findFirst({
      where: { id: questionId },
      include: {
        interview: true,
        answer: true,
      },
    });

    if (!question || question.interview.userId !== userId || question.interview.id !== interviewId) {
      res.status(404).json({ message: 'Question not found or access denied' });
      return;
    }

    if (question.answer) {
      res.status(409).json({ message: 'This question has already been answered' });
      return;
    }

    // Persist the raw answer first (evaluation may take a moment)
    const savedAnswer = await prisma.answer.create({
      data: {
        questionId,
        content: answerContent,
        score: null,
      },
    });

    // ── 2. Evaluate answer using Gemini with Fallback ──────────
    const stageIndex = Math.min(
      Math.floor((question.order - 1) / QUESTIONS_PER_STAGE),
      INTERVIEW_STAGES.length - 1
    );
    const stage = INTERVIEW_STAGES[stageIndex];

    let feedback = EVALUATION_FALLBACK;
    try {
      feedback = await evaluateAnswer({
        answer: answerContent,
        category: question.interview.category,
        language: question.interview.language,
        question: question.content,
        stage,
      });
    } catch (err: any) {
      console.error('Gemini AI failed to evaluate answer, using fallback:', err);
    }

    // Persist evaluation
    const evaluatedAnswer = await prisma.answer.update({
      where: { id: savedAnswer.id },
      data: { 
        score: feedback.score, 
        evaluation: JSON.stringify(feedback), 
      },
    });

    // ── 3. Stitch live transcript ──────────────────────────────────────────────
    const transcriptChunk = `Q: ${question.content}\nA: ${answerContent}`;
    const existingTranscript = await prisma.transcript.findUnique({ where: { interviewId } });
    if (existingTranscript) {
      await prisma.transcript.update({
        where: { interviewId },
        data: { text: existingTranscript.text + '\n\n' + transcriptChunk },
      });
    } else {
      await prisma.transcript.create({ data: { interviewId, text: transcriptChunk } });
    }

    // ── 4. Determine follow-up vs new question ────────────────────────────────
    const currentInterview = await prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        resume: true,
        questions: { orderBy: { order: 'asc' }, include: { answer: true } },
      },
    });

    const totalAsked = currentInterview!.questions.length;
    const maxQuestions = INTERVIEW_STAGES.length * QUESTIONS_PER_STAGE;
    const interviewConfig = getInterviewConfigFromReportData(currentInterview!.reportData, {
      category: currentInterview!.category,
      language: currentInterview!.language,
    });
    const resumeSummary = extractResumeContext(
      currentInterview!.resume.parsedData,
      currentInterview!.resume.fileName,
      interviewConfig.category
    );

    let nextQuestion = null;
    let nextQuestionMeta = null;
    let tts = null;
    let interviewDone = false;
    let isFollowUp = false;

    if (totalAsked < maxQuestions) {
      // Read follow-up count from lightweight metadata stored in reportData.followUpMap
      const reportMeta = (currentInterview!.reportData as any) ?? {};
      const followUpMap: Record<string, number> = reportMeta.followUpMap ?? {};
      const currentFollowUpCount = followUpMap[questionId] ?? 0;

      const { stage: nextStage } = getCurrentStage(totalAsked);
      const previousQuestions = currentInterview!.questions.map((q) => q.content);

      let generatedQuestion = buildQuestionFallback({
        interviewConfig,
        stage: nextStage,
      });

      if (currentFollowUpCount < MAX_FOLLOW_UPS) {
        // ── Generate follow-up based on the last answer ───────────────────────
        try {
          generatedQuestion = await generateFollowUpQuestion({
            followUpCount: currentFollowUpCount,
            interviewConfig,
            lastQuestion: question.content,
            resumeSummary,
            stage,
            userAnswer: answerContent,
          });
          isFollowUp = true;

          // Persist updated follow-up count
          const updatedFollowUpMap = { ...followUpMap, [questionId]: currentFollowUpCount + 1 };
          await prisma.interview.update({
            where: { id: interviewId },
            data: { reportData: { ...reportMeta, followUpMap: updatedFollowUpMap } as any },
          });
        } catch (err: any) {
          console.error('[FollowUp] Follow-up generation failed, advancing to new question:', err);
          isFollowUp = false;
        }
      }

      if (!isFollowUp) {
        // ── Follow-up cap reached — generate fresh main question ─────────────
        try {
          generatedQuestion = await generateInterviewQuestion({
            interviewConfig,
            previousQuestions,
            resumeSummary,
            stage: nextStage,
          });
        } catch (err: any) {
          console.error('[Question] New question generation failed, using fallback:', err);
        }
      }

      nextQuestion = await prisma.question.create({
        data: {
          interviewId,
          content: generatedQuestion.question,
          order: totalAsked + 1,
        },
      });
      nextQuestionMeta = generatedQuestion;

      // ── 5. Speak the next question ──────────────────────────────────────────
      if (speakNextQuestion) {
        const langCode = getLanguageCode(currentInterview!.language);
        tts = await textToSpeech(generatedQuestion.question, langCode);
      }
    } else {
      interviewDone = true;
    }


    res.status(200).json({
      answeredQuestion: {
        id: question.id,
        content: question.content,
        stage,
      },
      evaluation: feedback,
      evaluatedAnswer,
      nextQuestion,
      nextQuestionMeta,
      tts,
      interviewDone,
      message: interviewDone
        ? 'All questions answered. Call /finish to complete the interview.'
        : 'Answer saved and next question generated.',
    });
  } catch (error) {
    next(error);
  }
};
