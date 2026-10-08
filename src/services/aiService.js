import axios from 'axios';
import { API_KEY, GROQ_API_URL, GROQ_MODEL, parseJsonLoose } from './groqClient';

const BOSS_DIFFICULTY_ORDER = ['easy', 'medium', 'hard'];

const findQuestionsArray = (parsed) => {
    if (Array.isArray(parsed)) return parsed;
    if (!parsed || typeof parsed !== 'object') return [];

    for (const key of ['questions', 'rounds', 'quiz', 'items', 'data']) {
        if (Array.isArray(parsed[key])) return parsed[key];
    }
    return Object.values(parsed).find(val => Array.isArray(val)) || [];
};

const normalizeDifficulty = (value) => {
    const level = String(value || '').toLowerCase();
    return BOSS_DIFFICULTY_ORDER.includes(level) ? level : 'medium';
};

const normalizeBossBattle = (parsed) => {
    const questions = findQuestionsArray(parsed)
        .map(q => {
            const options = Array.isArray(q.options) ? q.options : (Array.isArray(q.choices) ? q.choices : []);
            if (!q || !q.question || options.length < 2) return null;

            const correctAnswer = Number.isInteger(q.correctAnswer) ? q.correctAnswer : 0;
            return {
                question: q.question,
                options,
                correctAnswer: Math.min(Math.max(correctAnswer, 0), options.length - 1),
                difficulty: normalizeDifficulty(q.difficulty),
                taunt: typeof q.taunt === 'string' ? q.taunt : ''
            };
        })
        .filter(Boolean)
        .sort((a, b) => BOSS_DIFFICULTY_ORDER.indexOf(a.difficulty) - BOSS_DIFFICULTY_ORDER.indexOf(b.difficulty));

    if (!questions.length) {
        throw new Error("The AI could not build a boss battle from this content. Try adding more detail to your notes.");
    }

    return {
        bossName: parsed?.bossName || 'The Gatekeeper',
        bossTitle: parsed?.bossTitle || 'Guardian of the Unknown',
        bossIntro: parsed?.bossIntro || 'A challenge stands between you and mastery.',
        questions
    };
};

/**
 * Analyzes the source data to determine the maximum number of high-quality questions
 * that can be generated and identifies the core topic.
 * 
 * @param {string} sourceData - The raw notes
 * @returns {Promise<{maxQuestions: number, topic: string, summary: string}>}
 */
export const analyzeContent = async (sourceData) => {
    if (!API_KEY) {
        throw new Error("API key is missing.");
    }

    try {
        const response = await axios.post(
            GROQ_API_URL,
            {
                model: GROQ_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: `Analyze the following notes and provide an intelligent assessment:
                        1. maxQuestions: Based on the depth and unique concepts in the content, determine the maximum number of high-quality, non-repetitive multiple choice questions that can realistically be generated. 
                           - For short notes (< 500 words), aim for 5-10.
                           - For medium notes (500-1500 words), aim for 10-20.
                           - For long materials (> 1500 words), suggest up to 30.
                           - Ensure this number reflects the actual breadth of information.
                        2. topic: A short, professional title for the content (max 5 words).
                        3. summary: A concise 1-sentence overview of the main theme.
                        
                        Respond ONLY in valid JSON format:
                        {
                          "maxQuestions": number,
                          "topic": "string",
                          "summary": "string"
                        }`
                    },
                    {
                        role: 'user',
                        content: sourceData
                    }
                ],
                temperature: 0.3,
                response_format: { type: "json_object" }
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                }
            }
        );

        return JSON.parse(response.data.choices[0].message.content);
    } catch (error) {
        console.error("Error analyzing content:", error);
        if (error.response) {
            throw new Error(`API Error: ${error.response.status} - ${error.response.data?.error?.message || error.message}`);
        }
        throw new Error("Failed to analyze content. Please ensure the notes are substantial.");
    }
};

/**
 * Generates game content using the Grok API based on provided source material.
 * 
 * @param {string} gameType - The type of game (e.g., "AI Quiz Generator")
 * @param {string} sourceData - The raw content/notes provided by the user
 * @param {object} options - Optional parameters like questionCount
 * @returns {Promise<any>} - The generated content (String or JSON object)
 */
export const generateGameContent = async (gameType, sourceData, options = {}) => {
    if (!API_KEY) {
        throw new Error("API key is missing. Please set VITE_GROQ_API_KEY in your .env file.");
    }

    const { questionCount = 5 } = options;
    const isQuiz = gameType === "AI Quiz Generator";
    const isFlashcards = gameType === "AI Flashcard Battle";
    const isPuzzle = gameType === "AI Puzzle Generator";
    const isBoss = gameType === "AI Boss Battle";
    const isStructured = isQuiz || isFlashcards || isPuzzle || isBoss;

    let systemPrompt = '';

    if (isQuiz) {
        systemPrompt = `You are an expert academic quiz generator for MaufaLab. 
           Your task is to analyze the user's notes and generate exactly ${questionCount} multiple choice questions.
           
           OUTPUT FORMAT:
           You must respond ONLY with a valid JSON array of objects. Do not include any markdown formatting, backticks, or extra text.
           
           JSON Structure:
           [
             {
               "question": "The question text here?",
               "options": ["Option A", "Option B", "Option C", "Option D"],
               "correctAnswer": 0
             }
           ]
           
           Rules:
           1. Every question must have exactly 4 options.
           2. "correctAnswer" must be the 0-indexed integer of the correct option.
           3. Ensure questions are diverse and cover the main points of the notes.`;
    } else if (isFlashcards) {
        systemPrompt = `You are an expert academic tutor for MaufaLab. 
           Your task is to analyze the user's notes and generate exactly ${questionCount} high-quality flashcards.
           
           Each flashcard should follow a "Front" (Concept/Term/Question) and "Back" (Answer/Definition/Explanation) format.
           
           OUTPUT FORMAT:
           You must respond ONLY with a valid JSON array of objects. Do not include any markdown formatting, backticks, or extra text.
           
           JSON Structure:
           [
             {
               "front": "Term or Concept name here?",
               "back": "Detailed but concise definition or explanation."
             }
           ]
           
           Rules:
           1. Ensure terms are significant to the content.
           2. Keep the "back" informative but easy to read quickly.`;
    } else if (isPuzzle) {
        systemPrompt = `You are an expert academic challenge designer for MaufaLab. 
           Your task is to analyze the user's notes and generate exactly ${questionCount} key terms or phrases for a Word Scramble puzzle.
           
           Each item should have a "word" (the term to unscramble) and a "hint" (a concise clue about what the word is).
           
           OUTPUT FORMAT:
           You must respond ONLY with a valid JSON array of objects. Do not include any markdown formatting, backticks, or extra text.
           
           JSON Structure:
           [
             {
               "word": "TermName",
               "hint": "A concise clue or definition of the term."
             }
           ]
           
           Rules:
           1. The "word" should be a significant concept from the material.
           2. Keep the "hint" helpful but not too easy.
           3. Words should be primarily single words or short compound terms (max 2-3 words).`;
    } else if (isBoss) {
        systemPrompt = `You are the game master for MaufaLab's "AI Boss Battle".
           Using the learner's notes, invent a single BOSS and a gauntlet of exactly ${questionCount} multiple choice questions that the learner must answer to defeat it.

           OUTPUT FORMAT:
           Respond ONLY with a valid JSON object. No markdown, no backticks, no extra text.

           JSON Structure:
           {
             "bossName": "Short, memorable villain name",
             "bossTitle": "A title/epithet for the boss (max 6 words)",
             "bossIntro": "One menacing sentence introducing the boss and the stakes.",
             "questions": [
               {
                 "question": "The question text here?",
                 "options": ["Option A", "Option B", "Option C", "Option D"],
                 "correctAnswer": 0,
                 "difficulty": "easy" | "medium" | "hard",
                 "taunt": "A short one-line taunt the boss says after this question."
               }
             ]
           }

           Rules:
           1. Every question must have exactly 4 options.
           2. "correctAnswer" must be the 0-indexed integer of the correct option.
           3. "questions" must be ordered easiest first and hardest last. Difficulty must genuinely escalate.
           4. Later questions must be meaningfully harder than the earlier ones, not repeats with different wording.
           5. "taunt" must be under 15 words and reference the learner's likely mistake.
           6. Every question must be answerable from the learner's notes.
           7. "bossName", "bossTitle" and "bossIntro" must relate to the subject matter of the notes.`;
    } else {
        systemPrompt = `You are an expert educational AI assistant for the MaufaLab platform. Your task is to generate perfectly structured academic content for a game called "${gameType}". 
        
           Guidelines:
           1. Extract key concepts, definitions, and facts from the user's provided notes.
           2. Format the output specifically for the "${gameType}" game mode format.
           3. Output your response in clean markdown.`;
    }

    try {
        const response = await axios.post(
            GROQ_API_URL,
            {
                model: GROQ_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: `Notes:\n\n${sourceData}`
                    }
                ],
                temperature: 0.7,
                response_format: isStructured ? { type: "json_object" } : undefined
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                }
            }
        );

        const content = response.data.choices[0].message.content;

        if (isBoss) {
            return normalizeBossBattle(parseJsonLoose(content));
        }

        if (isQuiz || isFlashcards || isPuzzle) {
            try {
                // Return parsed JSON for structured games
                const parsed = JSON.parse(content);
                // Handle case where AI wraps array in an object
                const arrayKey = isQuiz ? 'questions' : (isFlashcards ? 'flashcards' : 'puzzles');
                if (parsed[arrayKey] && Array.isArray(parsed[arrayKey])) return parsed[arrayKey];

                // Extra fallback: check for common variations of keys
                const alternativeKeys = isQuiz ? ['quiz', 'data', 'items'] : (isFlashcards ? ['cards', 'deck', 'data', 'items'] : ['puzzles', 'words', 'data', 'items']);
                for (const key of alternativeKeys) {
                    if (parsed[key] && Array.isArray(parsed[key])) return parsed[key];
                }

                if (parsed.data && Array.isArray(parsed.data)) return parsed.data;
                if (Array.isArray(parsed)) return parsed;

                // Look for ANY array in the object
                const firstArray = Object.values(parsed).find(val => Array.isArray(val));
                if (firstArray) {
                    // Standardize objects to { front, back } or { question, options, correctAnswer }
                    return firstArray.map(item => {
                        if (isQuiz) {
                            return {
                                question: item.question || item.q || '',
                                options: item.options || item.choices || [],
                                correctAnswer: typeof item.correctAnswer === 'number' ? item.correctAnswer : 0
                            };
                        } else if (isFlashcards) {
                            return {
                                front: item.front || item.term || item.title || item.question || '',
                                back: item.back || item.definition || item.answer || item.description || ''
                            };
                        } else { // isPuzzle
                            return {
                                word: item.word || item.term || item.text || '',
                                hint: item.hint || item.clue || item.definition || ''
                            };
                        }
                    }).filter(item => isQuiz ? item.question : (isFlashcards ? (item.front || item.back) : (item.word || item.hint)));
                }

                return []; // Fallback empty array
            } catch {
                // Fallback for weird AI formatting
                const jsonMatch = content.match(/\[[\s\S]*\]/);
                if (jsonMatch) return JSON.parse(jsonMatch[0]);
                throw new Error("AI returned invalid JSON format.");
            }
        }

        return content;
    } catch (error) {
        console.error("Error generating content from Groq:", error);
        if (error.response) {
            throw new Error(`API Error: ${error.response.status} - ${error.response.data?.error?.message || error.message}`);
        }
        throw new Error(error.message || "Failed to connect to the AI service.");
    }
};

export const COMPANION_MODES = [
    {
        id: 'chat',
        label: 'Chat',
        instruction: 'Answer normally. Be encouraging and concise unless the student asks for depth.'
    },
    {
        id: 'simple',
        label: 'Explain Simply',
        instruction: 'Explain using plain everyday language. No jargon, or jargon defined immediately. Prefer short sentences and one clear analogy per idea.'
    },
    {
        id: 'quiz',
        label: 'Quiz Me',
        instruction: 'Act as an examiner. Ask ONE question at a time and then wait for the student to reply. Never reveal the answer before they have committed to one. After they answer, tell them whether they were right, explain why in a sentence, then move to the next question. Vary difficulty and cover the material broadly.'
    },
    {
        id: 'examples',
        label: 'Examples',
        instruction: 'Answer using concrete real-world examples, analogies and worked mini-cases. Ground every abstract idea in something the student can picture.'
    },
    {
        id: 'plan',
        label: 'Study Plan',
        instruction: 'Produce a structured study plan as a markdown list: topics in order, an estimated time for each, what "mastering it" means, and a short self-check question per topic. Base it on the material provided.'
    },
    {
        id: 'summarize',
        label: 'Summarize',
        instruction: 'Summarise tightly. Lead with a one-sentence takeaway, then a short markdown bullet list of the key points. No preamble.'
    }
];

export const COMPANION_CONTEXT_LIMIT = 4000;

const buildCompanionSystemPrompt = (mode, context, studentName) => {
    const modeConfig = COMPANION_MODES.find(m => m.id === mode) || COMPANION_MODES[0];
    const sections = [
        `You are Study Companion, a patient and rigorous academic tutor built into MaufaLab.${studentName ? ` You are talking to ${studentName}.` : ''}`,
        `CURRENT MODE: ${modeConfig.label}. ${modeConfig.instruction}`,
        'Formatting: you may use markdown. Prefer short paragraphs and bullet lists. Use bold for key terms. Never use headings deeper than level 3.',
        'Never invent facts that are absent from the reference material. If something is not covered, say so plainly instead of guessing.',
        'Keep replies under 250 words unless the student explicitly asks for more depth.'
    ];

    if (context && context.trim()) {
        sections.push(`REFERENCE MATERIAL (ground every answer in this when it is relevant):\n"""\n${context.trim().slice(0, COMPANION_CONTEXT_LIMIT)}\n"""`);
    }

    return sections.join('\n\n');
};

/**
 * Sends a turn to the AI Study Companion and returns the tutor's reply.
 *
 * @param {Array<{role: 'user'|'assistant', content: string}>} history - Prior turns, oldest first.
 * @param {{mode?: string, context?: string, studentName?: string}} options
 * @returns {Promise<string>}
 */
export const sendCompanionMessage = async (history, options = {}) => {
    if (!API_KEY) {
        throw new Error("API key is missing. Please set VITE_GROQ_API_KEY in your .env file.");
    }

    const { mode = 'chat', context = '', studentName = '' } = options;
    const systemPrompt = buildCompanionSystemPrompt(mode, context, studentName);

    const trimmedHistory = history
        .filter(turn => turn && typeof turn.content === 'string' && turn.content.trim())
        .slice(-16)
        .map(turn => ({
            role: turn.role === 'assistant' ? 'assistant' : 'user',
            content: turn.content
        }));

    if (!trimmedHistory.length) {
        throw new Error("Add a message before sending.");
    }

    try {
        const response = await axios.post(
            GROQ_API_URL,
            {
                model: GROQ_MODEL,
                messages: [{ role: 'system', content: systemPrompt }, ...trimmedHistory],
                temperature: 0.7,
                max_tokens: 1024
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                }
            }
        );

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error("Error talking to the study companion:", error);
        if (error.response) {
            throw new Error(`API Error: ${error.response.status} - ${error.response.data?.error?.message || error.message}`);
        }
        throw new Error(error.message || "Failed to connect to the AI service.");
    }
};

export const DEBATE_CONTEXT_LIMIT = 4000;

export const DEBATE_DIFFICULTIES = {
    easy: {
        id: 'easy',
        label: 'Friendly',
        blurb: 'A supportive sparring partner who praises good reasoning.',
        maxRounds: 3
    },
    medium: {
        id: 'medium',
        label: 'Competitive',
        blurb: 'A sharp opponent who hunts for weak spots in your logic.',
        maxRounds: 5
    },
    hard: {
        id: 'hard',
        label: 'Ruthless',
        blurb: 'An elite debater who names every fallacy you commit.',
        maxRounds: 7
    }
};

export const DEBATE_VERDICT_MARGIN = 5;

const clampScore = (value, fallback = 0) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return Math.max(0, Math.min(10, num));
};

const buildDebateGrounding = (context) => {
    if (context && context.trim()) {
        return `REFERENCE MATERIAL - this is the learner's own study material. Anchor the motion and every argument in it. Do not invent facts that are absent from it.
"""
${context.trim().slice(0, DEBATE_CONTEXT_LIMIT)}
"""`;
    }

    return 'No reference material was supplied. Choose a well-known academic or general-knowledge motion that a learner could argue on either side without needing citations.';
};

const buildDebateRoster = ({ difficulty, studentName }) => {
    const level = DEBATE_DIFFICULTIES[difficulty] ? difficulty : 'medium';
    const personas = {
        easy: 'You are a warm, encouraging sparring partner. You make solid points, praise what worked in the learner\'s argument, and concede generously when a point genuinely lands.',
        medium: 'You are a skilled competitive debater. You press weak spots and thin evidence, but you concede cleanly when out-argued.',
        hard: 'You are an elite debate coach playing the opponent role. You identify fallacies by name, demand evidence for every claim, and hold ground you have genuinely won. You are uncompromising but never dishonest.'
    };

    return `DIFFICULTY: ${level}. ${personas[level]}

${studentName ? `The learner's name is ${studentName}. Address them naturally.` : ''}

SCORING HONESTY: score the learner's actual argument, not their side. A weak argument for a strong position scores low and a strong argument for a weak position scores high. Never rig the result in either direction.`;
};

/**
 * Creates a debate motion and the AI opponent's opening statement.
 *
 * @param {{topic?: string, context?: string, userSide?: 'pro'|'con', difficulty?: string, studentName?: string}} options
 * @returns {Promise<{motion: string, topicLabel: string, aiSideLabel: string, userSideLabel: string, openingStatement: string, aiKeyPoints: string[]}>}
 */
export const createDebate = async (options = {}) => {
    if (!API_KEY) {
        throw new Error("API key is missing. Please set VITE_GROQ_API_KEY in your .env file.");
    }

    const { topic = '', context = '', userSide = 'pro', difficulty = 'medium', studentName = '' } = options;

    const systemPrompt = `You are the game master for MaufaLab's "AI Debate Game". Set up a formal parliamentary-style debate and then argue the opening statement yourself.

${buildDebateGrounding(context)}

${buildDebateRoster({ difficulty, studentName })}

The learner will argue ${userSide === 'pro' ? 'FOR / in favour of' : 'AGAINST / opposing'} the motion. You will argue the opposite position.

OUTPUT FORMAT:
Respond ONLY with a valid JSON object. No markdown, no backticks, no extra text.

JSON Structure:
{
  "motion": "The debate motion, phrased formally and neutrally as a proposition (for example: 'This house would grant legal personhood to rivers.')",
  "topicLabel": "Short human-readable topic name (max 4 words)",
  "userSideLabel": "The learner's side, e.g. 'In favour'",
  "aiSideLabel": "Your side, e.g. 'Opposed'",
  "openingStatement": "Your full opening argument as markdown: 2 short paragraphs setting out your position, then a bullet list of 3 to 4 core points. No headings above level 2.",
  "aiKeyPoints": ["The 3 to 4 strongest points of your opening, each under 20 words"]
}

Rules:
1. The motion must be genuinely arguable on BOTH sides. Never pick a settled fact.
2. "userSideLabel" and "aiSideLabel" must be opposite to each other.
3. The opening statement must argue your assigned side, not the learner's side.
4. Do not mention scores, rounds, difficulty settings, or being an AI inside the opening statement.
5. Stay under 220 words.`;

    try {
        const response = await axios.post(
            GROQ_API_URL,
            {
                model: GROQ_MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    {
                        role: 'user',
                        content: topic && topic.trim()
                            ? `Set the debate on this topic: "${topic.trim()}"\n\n${buildDebateGrounding(context)}`
                            : buildDebateGrounding(context)
                    }
                ],
                temperature: 0.7,
                max_tokens: 1200,
                response_format: { type: "json_object" }
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                }
            }
        );

        const parsed = parseJsonLoose(response.data.choices[0].message.content);
        const motion = typeof parsed?.motion === 'string' ? parsed.motion.trim() : '';
        const openingStatement = typeof parsed?.openingStatement === 'string' ? parsed.openingStatement.trim() : '';

        if (!motion || !openingStatement) {
            throw new Error("The AI could not open this debate. Try rephrasing your topic.");
        }

        return {
            motion,
            topicLabel: parsed?.topicLabel || topic || 'Debate',
            userSideLabel: parsed?.userSideLabel || (userSide === 'pro' ? 'In favour' : 'Opposed'),
            aiSideLabel: parsed?.aiSideLabel || (userSide === 'pro' ? 'Opposed' : 'In favour'),
            openingStatement,
            aiKeyPoints: Array.isArray(parsed?.aiKeyPoints)
                ? parsed.aiKeyPoints.filter(point => typeof point === 'string').slice(0, 5)
                : []
        };
    } catch (error) {
        console.error("Error creating debate:", error);
        if (error.message?.startsWith("The AI could not")) throw error;
        if (error.response) {
            throw new Error(`API Error: ${error.response.status} - ${error.response.data?.error?.message || error.message}`);
        }
        throw new Error(error.message || "Failed to start the debate.");
    }
};

/**
 * Submits the learner's argument and returns the AI's counter plus a scored critique.
 *
 * @param {Array<{role: 'user'|'assistant', content: string}>} transcript - Debate so far, oldest first.
 * @param {{motion: string, userSideLabel: string, difficulty?: string, roundNumber?: number, totalRounds?: number, studentName?: string}} options
 */
export const submitDebateArgument = async (transcript, options = {}) => {
    if (!API_KEY) {
        throw new Error("API key is missing. Please set VITE_GROQ_API_KEY in your .env file.");
    }

    const { motion = '', userSideLabel = 'your side', difficulty = 'medium', roundNumber = 1, totalRounds = 3, studentName = '' } = options;

    const history = (transcript || [])
        .filter(turn => turn && typeof turn.content === 'string' && turn.content.trim())
        .slice(-14)
        .map(turn => ({
            role: turn.role === 'user' ? 'user' : 'assistant',
            content: turn.content
        }));

    if (!history.length) {
        throw new Error("The debate has not started yet.");
    }

    const systemPrompt = `You are arguing the opposite side in MaufaLab's "AI Debate Game". The learner has just delivered their argument. Reply as their opponent.

${buildDebateRoster({ difficulty, studentName })}

MOTION: ${motion}
THE LEARNER ARGUES: ${userSideLabel}
THIS IS ROUND ${roundNumber} OF ${totalRounds}.

The last message in the conversation is the learner's argument. Do not repeat your previous speeches. Attack a specific point they actually made, do not strawman them.

OUTPUT FORMAT:
Respond ONLY with a valid JSON object. No markdown, no backticks, no extra text.

JSON Structure:
{
  "counterArgument": "Your rebuttal as markdown: 2 short paragraphs, then a bullet list of 3 key points. Under 180 words. No headings above level 2.",
  "aiKeyPoints": ["Your 3 strongest counter points, each under 20 words"],
  "scores": {
    "logic": 0,
    "evidence": 0,
    "rebuttal": 0,
    "clarity": 0
  },
  "feedback": "Two sentences addressing the learner's argument directly. Say what worked and what did not.",
  "strongestPoint": "The single best thing in the learner's argument (one sentence)",
  "weakestPoint": "The single most vulnerable part of the learner's argument (one sentence)"
}

RULES:
1. Every score is an integer from 0 to 10, judged against strong student debate work, not against your own side.
2. Be specific in feedback. Reference their actual words. Never give generic praise like "good point".
3. If their argument was genuinely empty, short, or only asserted without reasoning, score it low (0-3) and say why plainly.
4. Stay under 180 words for the rebuttal itself.`;

    try {
        const response = await axios.post(
            GROQ_API_URL,
            {
                model: GROQ_MODEL,
                messages: [{ role: 'system', content: systemPrompt }, ...history],
                temperature: 0.7,
                max_tokens: 1000,
                response_format: { type: "json_object" }
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                }
            }
        );

        const parsed = parseJsonLoose(response.data.choices[0].message.content);
        const counterArgument = typeof parsed?.counterArgument === 'string' ? parsed.counterArgument.trim() : '';

        if (!counterArgument) {
            throw new Error("The AI could not produce a rebuttal. Try submitting again.");
        }

        const rawScores = parsed?.scores || {};

        return {
            counterArgument,
            aiKeyPoints: Array.isArray(parsed?.aiKeyPoints)
                ? parsed.aiKeyPoints.filter(point => typeof point === 'string').slice(0, 4)
                : [],
            scores: {
                logic: Math.round(clampScore(rawScores.logic, 5)),
                evidence: Math.round(clampScore(rawScores.evidence, 5)),
                rebuttal: Math.round(clampScore(rawScores.rebuttal, 5)),
                clarity: Math.round(clampScore(rawScores.clarity, 5))
            },
            feedback: typeof parsed?.feedback === 'string' ? parsed.feedback.trim() : '',
            strongestPoint: typeof parsed?.strongestPoint === 'string' ? parsed.strongestPoint.trim() : '',
            weakestPoint: typeof parsed?.weakestPoint === 'string' ? parsed.weakestPoint.trim() : ''
        };
    } catch (error) {
        console.error("Error submitting debate argument:", error);
        if (error.message?.startsWith("The AI could not")) throw error;
        if (error.response) {
            throw new Error(`API Error: ${error.response.status} - ${error.response.data?.error?.message || error.message}`);
        }
        throw new Error(error.message || "Failed to get a rebuttal.");
    }
};

/**
 * Closes the debate: AI closing statement plus a final judged verdict.
 *
 * @param {Array<{role: 'user'|'assistant', content: string}>} transcript
 * @param {{motion: string, userSideLabel: string, difficulty?: string, roundCount?: number, studentName?: string}} options
 */
export const concludeDebate = async (transcript, options = {}) => {
    if (!API_KEY) {
        throw new Error("API key is missing. Please set VITE_GROQ_API_KEY in your .env file.");
    }

    const { motion = '', userSideLabel = 'your side', difficulty = 'medium', roundCount = 3, studentName = '' } = options;

    const history = (transcript || [])
        .filter(turn => turn && typeof turn.content === 'string' && turn.content.trim())
        .slice(-18)
        .map(turn => ({
            role: turn.role === 'user' ? 'user' : 'assistant',
            content: turn.content
        }));

    if (!history.length) {
        throw new Error("There is nothing to conclude.");
    }

    const systemPrompt = `You are the adjudicator AND the final speaker in MaufaLab's "AI Debate Game". The final round is over. Deliver your closing argument, then judge the whole debate fairly.

${buildDebateRoster({ difficulty, studentName })}

MOTION: ${motion}
THE LEARNER ARGUED: ${userSideLabel}
ROUNDS FOUGHT: ${roundCount}

OUTPUT FORMAT:
Respond ONLY with a valid JSON object. No markdown, no backticks, no extra text.

JSON Structure:
{
  "closingStatement": "Your closing argument as markdown: one short paragraph plus a bullet list of 3 points. Under 150 words.",
  "userScore": 0,
  "aiScore": 0,
  "reasoning": "Two or three sentences weighing how each side argued. Reference actual points from the debate.",
  "yourStrengths": ["2 to 3 specific things the learner did well"],
  "yourImprovements": ["2 to 3 specific things the learner should practise next time"],
  "coachingTip": "One concrete, actionable sentence of advice for their next debate"
}

RULES:
1. "userScore" and "aiScore" are integers from 0 to 100 measuring argument quality: reasoning, evidence, rebuttal of the other side, and clarity.
2. The two scores must be within 25 points of each other unless one side genuinely argued far better.
3. Judge the arguing, never the position. A learner who argues a weak side well can outscore you.
4. Every item in "yourStrengths" and "yourImprovements" must reference something that actually happened in this debate.
5. Do not declare a winner. The app decides the verdict from your two scores.`;

    try {
        const response = await axios.post(
            GROQ_API_URL,
            {
                model: GROQ_MODEL,
                messages: [{ role: 'system', content: systemPrompt }, ...history],
                temperature: 0.6,
                max_tokens: 1100,
                response_format: { type: "json_object" }
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                }
            }
        );

        const parsed = parseJsonLoose(response.data.choices[0].message.content);
        const closingStatement = typeof parsed?.closingStatement === 'string' ? parsed.closingStatement.trim() : '';

        if (!closingStatement) {
            throw new Error("The AI could not close the debate. Try again.");
        }

        const toScore = (value, fallback) => {
            const num = Number(value);
            return Number.isFinite(num) ? Math.max(0, Math.min(100, Math.round(num))) : fallback;
        };

        return {
            closingStatement,
            userScore: toScore(parsed?.userScore, 50),
            aiScore: toScore(parsed?.aiScore, 50),
            reasoning: typeof parsed?.reasoning === 'string' ? parsed.reasoning.trim() : '',
            yourStrengths: Array.isArray(parsed?.yourStrengths)
                ? parsed.yourStrengths.filter(item => typeof item === 'string').slice(0, 4)
                : [],
            yourImprovements: Array.isArray(parsed?.yourImprovements)
                ? parsed.yourImprovements.filter(item => typeof item === 'string').slice(0, 4)
                : [],
            coachingTip: typeof parsed?.coachingTip === 'string' ? parsed.coachingTip.trim() : ''
        };
    } catch (error) {
        console.error("Error concluding debate:", error);
        if (error.message?.startsWith("The AI could not")) throw error;
        if (error.response) {
            throw new Error(`API Error: ${error.response.status} - ${error.response.data?.error?.message || error.message}`);
        }
        throw new Error(error.message || "Failed to conclude the debate.");
    }
};

/**
 * Derives the verdict from the two final scores so the UI can never contradict itself.
 *
 * @param {number} userScore
 * @param {number} aiScore
 * @returns {'you'|'ai'|'draw'}
 */
export const getDebateVerdict = (userScore, aiScore) => {
    const diff = Number(userScore) - Number(aiScore);
    if (diff >= DEBATE_VERDICT_MARGIN) return 'you';
    if (diff <= -DEBATE_VERDICT_MARGIN) return 'ai';
    return 'draw';
};

export const SCENARIO_CONTEXT_LIMIT = 4000;

export const SCENARIO_CRITERIA = {
    judgment: 'Judgment',
    foresight: 'Foresight',
    empathy: 'Empathy',
    pragmatism: 'Pragmatism'
};

export const SCENARIO_DIFFICULTIES = {
    easy: {
        id: 'easy',
        label: 'Training',
        blurb: 'Clear options, forgiving consequences, visible hints.',
        decisions: 3
    },
    medium: {
        id: 'medium',
        label: 'Realistic',
        blurb: 'Trade-offs in every choice, no obviously safe option.',
        decisions: 5
    },
    hard: {
        id: 'hard',
        label: 'Crisis',
        blurb: 'Ambiguous briefs, harsh consequences, competing pressures.',
        decisions: 7
    }
};

const clampMeter = (value, fallback = 0) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return Math.max(0, Math.min(100, Math.round(num)));
};

const clampDelta = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    return Math.max(-60, Math.min(60, Math.round(num)));
};

const normalizeMeters = (meters) => (Array.isArray(meters) ? meters : [])
    .filter(meter => meter && typeof meter.name === 'string' && meter.name.trim())
    .slice(0, 4)
    .map(meter => ({
        name: meter.name.trim().slice(0, 40),
        value: clampMeter(meter.value, 50)
    }));

const normalizeChoices = (choices) => {
    if (!Array.isArray(choices)) return [];
    return choices
        .filter(choice => choice && typeof choice.text === 'string' && choice.text.trim())
        .slice(0, 3)
        .map((choice, index) => ({
            id: typeof choice.id === 'string' && choice.id.trim() ? choice.id.trim() : String(index),
            text: choice.text.trim(),
            hint: typeof choice.hint === 'string' ? choice.hint.trim() : ''
        }));
};

const normalizeCriteria = (raw, fallback = 5) => {
    const source = raw || {};
    return Object.keys(SCENARIO_CRITERIA).reduce((acc, key) => {
        acc[key] = clampScore(source[key], fallback);
        return acc;
    }, {});
};

export const averageCriteria = (scores) => {
    const values = Object.values(scores || {});
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const buildScenarioGrounding = (context) => {
    if (context && context.trim()) {
        return `REFERENCE MATERIAL - build the scenario out of this. The situation, the professional domain, and any technical detail must come from here. Never invent facts that contradict it.
"""
${context.trim().slice(0, SCENARIO_CONTEXT_LIMIT)}
"""`;
    }

    return 'No reference material was supplied. Use a well-known professional or academic domain where a learner can plausibly be dropped into a realistic high-stakes decision.';
};

/**
 * Generates a scenario briefing plus the first set of decisions.
 *
 * @param {{topic?: string, context?: string, difficulty?: string, decisionCount?: number, studentName?: string}} options
 */
export const createScenario = async (options = {}) => {
    if (!API_KEY) {
        throw new Error("API key is missing. Please set VITE_GROQ_API_KEY in your .env file.");
    }

    const { topic = '', context = '', difficulty = 'medium', decisionCount = 5, studentName = '' } = options;

    const systemPrompt = `You are the simulation designer for MaufaLab's "AI Scenario Simulator". Place the learner inside a realistic, consequential situation where they must make a series of judgement calls.

${buildScenarioGrounding(context)}

DIFFICULTY: ${difficulty}.
The scenario will run for ${decisionCount} decisions, and you supply the next decision each time.

WRITING RULES:
1. Write in second person ("You are...", "You notice..."). The learner is the protagonist.
2. Every choice must be a genuine judgement call. Never include a filler or obviously dominant option.
3. Choices must be concrete actions someone in this role could actually take.
4. Do not reveal which choice is best. Do not hint at the outcome.
5. Do not mention scores, meters, difficulty settings, or that you are an AI inside the narrative.
6. Never resolve the scenario in the briefing. It must stop at the first decision.

OUTPUT FORMAT:
Respond ONLY with a valid JSON object. No markdown, no backticks, no extra text.

JSON Structure:
{
  "title": "Short evocative scenario name, max 5 words",
  "role": "The learner's job title in this scenario",
  "setting": "One sentence: the place and moment",
  "stakes": "One sentence: what is lost if this goes wrong",
  "briefing": "Two short markdown paragraphs of setup that ends at the first decision point. Under 150 words.",
  "meters": [
    { "name": "Short meter name (max 3 words)", "value": 0 }
  ],
  "choices": [
    { "id": "a", "text": "A concrete action the learner could take", "hint": "One short clause on what this risks or costs" }
  ]
}

RULES:
1. "meters" must be exactly 3 trackers that matter in this specific scenario. Their "value" is the starting value from 0 to 100.
2. "choices" must be exactly 3.
3. Meter names must be concrete to this scenario. Never use generic words like "Score" or "Reputation" unless reputation is genuinely the point.
4. Each "hint" is under 12 words and describes risk, never correctness.
5. Starting values must reflect the situation BEFORE the learner acts, and must not all be identical. Default to somewhere between 35 and 70. Only start a meter below 30 when the briefing establishes that it is already in trouble, and never start more than one meter below 30.`;

    try {
        const response = await axios.post(
            GROQ_API_URL,
            {
                model: GROQ_MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    {
                        role: 'user',
                        content: topic && topic.trim()
                            ? `Build the scenario around this topic: "${topic.trim()}"\n\n${buildScenarioGrounding(context)}`
                            : buildScenarioGrounding(context)
                    }
                ],
                temperature: 0.8,
                max_tokens: 1400,
                response_format: { type: "json_object" }
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                }
            }
        );

        const parsed = parseJsonLoose(response.data.choices[0].message.content);
        const briefing = typeof parsed?.briefing === 'string' ? parsed.briefing.trim() : '';
        const meters = normalizeMeters(parsed?.meters);
        const choices = normalizeChoices(parsed?.choices);

        if (!briefing || meters.length < 2 || choices.length < 2) {
            throw new Error("The AI could not build a scenario from this content. Try adding more detail to your notes.");
        }

        return {
            title: typeof parsed?.title === 'string' && parsed.title.trim() ? parsed.title.trim() : (topic || 'Simulation'),
            role: typeof parsed?.role === 'string' ? parsed.role.trim() : 'You',
            setting: typeof parsed?.setting === 'string' ? parsed.setting.trim() : '',
            stakes: typeof parsed?.stakes === 'string' ? parsed.stakes.trim() : '',
            briefing,
            meters,
            choices,
            studentName: studentName || ''
        };
    } catch (error) {
        console.error("Error creating scenario:", error);
        if (error.message?.startsWith("The AI could not")) throw error;
        if (error.response) {
            throw new Error(`API Error: ${error.response.status} - ${error.response.data?.error?.message || error.message}`);
        }
        throw new Error(error.message || "Failed to build the scenario.");
    }
};

/**
 * Resolves the learner's chosen decision and returns the next decision set.
 *
 * @param {Array<{role: 'user'|'assistant', content: string}>} history - Simulation so far, oldest first.
 * @param {{scenario: object, meters: Array, choice: object, decisionNumber: number, totalDecisions: number}} options
 */
export const resolveScenarioChoice = async (history, options = {}) => {
    if (!API_KEY) {
        throw new Error("API key is missing. Please set VITE_GROQ_API_KEY in your .env file.");
    }

    const { scenario = {}, meters = [], choice = {}, decisionNumber = 1, totalDecisions = 5 } = options;
    const isFinal = decisionNumber >= totalDecisions;

    const cleanHistory = (history || [])
        .filter(turn => turn && typeof turn.content === 'string' && turn.content.trim())
        .slice(-12)
        .map(turn => ({
            role: turn.role === 'user' ? 'user' : 'assistant',
            content: turn.content
        }));

    if (!cleanHistory.length) {
        throw new Error("The scenario has not started yet.");
    }

    const meterState = meters.map(meter => `${meter.name}: ${meter.value}/100`).join(' | ');

    const systemPrompt = `You are the simulation engine for MaufaLab's "AI Scenario Simulator". The learner just chose an action. Narrate what happens, then present the next decision.

SCENARIO: ${scenario.title || 'Untitled'}
ROLE: ${scenario.role || 'the protagonist'}
STAKES: ${scenario.stakes || 'failure'}
CURRENT METERS: ${meterState}

${buildScenarioGrounding(scenario.context || '')}

THIS IS DECISION ${decisionNumber} OF ${totalDecisions}.
THE LEARNER CHOSE: "${choice.text}"

NARRATIVE RULES:
1. Write in second person. Stay inside the scenario's world and never mention being an AI, meters, scores, or difficulty.
2. Consequences must follow logically from the choice. A cautious choice carries risk; a bold choice carries exposure. Nothing is free.
3. Do not judge the choice as good or bad inside "outcome". Show the consequence and let it land. The feedback field is where you critique.
4. Stay under 130 words for "outcome".

${isFinal
            ? 'THIS IS THE FINAL DECISION. After narrating it, set "nextChoices" to an empty array. Do not offer more choices.'
            : 'End "outcome" at the next decision point, then give exactly 3 new choices for the following step. The new choices must react to what just happened.'}

OUTPUT FORMAT:
Respond ONLY with a valid JSON object. No markdown, no backticks, no extra text.

JSON Structure:
{
  "consequence": "One short sentence headline of what this choice caused",
  "outcome": "Narrative consequence as markdown. Under 130 words.",
  "meterDeltas": { "Exact meter name from current meters": 0 },
  "scores": { "judgment": 0, "foresight": 0, "empathy": 0, "pragmatism": 0 },
  "feedback": "Two sentences explaining what this choice achieved and what it cost.",
  "lesson": "One transferable sentence the learner could apply to a different situation.",
  "nextChoices": [
    { "id": "a", "text": "A concrete action", "hint": "One short clause on what this risks or costs" }
  ]
}

RULES:
1. "meterDeltas" MUST use the exact meter names given in CURRENT METERS. Each delta is a signed integer from -60 to 60. Include every meter, using 0 where nothing changed.
2. Every score is an integer 0 to 10, judged on the quality of the decision in context. A reasonable but unlucky choice can score well; a reckless choice that happens to work cannot score above 5.
3. Scores are about decision quality, never about whether the scenario went well.
4. "nextChoices" is ${isFinal ? 'an empty array' : 'exactly 3 items'}. Never reveal the best option.`;

    try {
        const response = await axios.post(
            GROQ_API_URL,
            {
                model: GROQ_MODEL,
                messages: [{ role: 'system', content: systemPrompt }, ...cleanHistory],
                temperature: 0.75,
                max_tokens: 1300,
                response_format: { type: "json_object" }
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                }
            }
        );

        const parsed = parseJsonLoose(response.data.choices[0].message.content);
        const outcome = typeof parsed?.outcome === 'string' ? parsed.outcome.trim() : '';

        if (!outcome) {
            throw new Error("The AI could not resolve that decision. Try choosing again.");
        }

        const rawDeltas = parsed?.meterDeltas || {};
        const meterDeltas = meters.map(meter => clampDelta(rawDeltas[meter.name]));

        return {
            consequence: typeof parsed?.consequence === 'string' ? parsed.consequence.trim() : '',
            outcome,
            meterDeltas,
            scores: normalizeCriteria(parsed?.scores, 5),
            feedback: typeof parsed?.feedback === 'string' ? parsed.feedback.trim() : '',
            lesson: typeof parsed?.lesson === 'string' ? parsed.lesson.trim() : '',
            nextChoices: isFinal ? [] : normalizeChoices(parsed?.nextChoices)
        };
    } catch (error) {
        console.error("Error resolving scenario choice:", error);
        if (error.message?.startsWith("The AI could not")) throw error;
        if (error.response) {
            throw new Error(`API Error: ${error.response.status} - ${error.response.data?.error?.message || error.message}`);
        }
        throw new Error(error.message || "Failed to resolve that decision.");
    }
};

/**
 * Wraps up the simulation with a final outcome and lessons.
 *
 * @param {Array<{role: 'user'|'assistant', content: string}>} history
 * @param {{scenario: object, meters: Array, decisions: number, decisionScores: Array}} options
 */
export const concludeScenario = async (history, options = {}) => {
    if (!API_KEY) {
        throw new Error("API key is missing. Please set VITE_GROQ_API_KEY in your .env file.");
    }

    const { scenario = {}, meters = [], decisions = 3 } = options;

    const cleanHistory = (history || [])
        .filter(turn => turn && typeof turn.content === 'string' && turn.content.trim())
        .slice(-16)
        .map(turn => ({
            role: turn.role === 'user' ? 'user' : 'assistant',
            content: turn.content
        }));

    if (!cleanHistory.length) {
        throw new Error("There is nothing to conclude.");
    }

    const meterState = meters.map(meter => `${meter.name}: ${meter.value}/100`).join(' | ');

    const systemPrompt = `You are the debrief officer for MaufaLab's "AI Scenario Simulator". The simulation is over. Summarise how it ended and teach the learner something transferable.

SCENARIO: ${scenario.title || 'Untitled'}
ROLE: ${scenario.role || 'the protagonist'}
ORIGINAL STAKES: ${scenario.stakes || 'failure'}
DECISIONS MADE: ${decisions}
FINAL METERS: ${meterState}

RULES:
1. Judge the learner's decisions, not their luck. A decision that led to a good outcome can still have been poorly judged, and you should say so.
2. Reference specific choices they actually made. No generic advice.
3. Never mention meters, scores, difficulty settings, or being an AI inside the narrative.
4. Stay under 160 words for "finalNarration".

OUTPUT FORMAT:
Respond ONLY with a valid JSON object. No markdown, no backticks, no extra text.

JSON Structure:
{
  "finalNarration": "How the situation resolved, as markdown. Under 160 words.",
  "summary": "One sentence summarising how the learner handled the situation.",
  "strengths": ["2 to 3 specific things they did well"],
  "mistakes": ["2 to 3 specific things that cost them"],
  "transferableLesson": "One concrete rule they should carry into the next real situation they face."
}

RULES:
1. "strengths" and "mistakes" must each reference real moments from this simulation.
2. Do not declare success or failure. The app decides the outcome from the final meters.`;

    try {
        const response = await axios.post(
            GROQ_API_URL,
            {
                model: GROQ_MODEL,
                messages: [{ role: 'system', content: systemPrompt }, ...cleanHistory],
                temperature: 0.6,
                max_tokens: 1000,
                response_format: { type: "json_object" }
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                }
            }
        );

        const parsed = parseJsonLoose(response.data.choices[0].message.content);
        const finalNarration = typeof parsed?.finalNarration === 'string' ? parsed.finalNarration.trim() : '';

        if (!finalNarration) {
            throw new Error("The AI could not write the debrief. Try again.");
        }

        return {
            finalNarration,
            summary: typeof parsed?.summary === 'string' ? parsed.summary.trim() : '',
            strengths: Array.isArray(parsed?.strengths)
                ? parsed.strengths.filter(item => typeof item === 'string').slice(0, 4)
                : [],
            mistakes: Array.isArray(parsed?.mistakes)
                ? parsed.mistakes.filter(item => typeof item === 'string').slice(0, 4)
                : [],
            transferableLesson: typeof parsed?.transferableLesson === 'string' ? parsed.transferableLesson.trim() : ''
        };
    } catch (error) {
        console.error("Error concluding scenario:", error);
        if (error.message?.startsWith("The AI could not")) throw error;
        if (error.response) {
            throw new Error(`API Error: ${error.response.status} - ${error.response.data?.error?.message || error.message}`);
        }
        throw new Error(error.message || "Failed to write the debrief.");
    }
};

/**
 * Derives the final outcome from the learner's meter performance so the app never
 * contradicts the meters the learner watched change all game.
 *
 * @param {Array<{name: string, value: number}>} meters
 * @param {number} averageDecisionScore - 0 to 10 average across decisions.
 * @returns {{outcome: 'success'|'partial'|'failure', score: number}}
 */
export const getScenarioOutcome = (meters, averageDecisionScore) => {
    const values = (Array.isArray(meters) ? meters : []).map(meter => clampMeter(meter.value, 0));
    const meterAverage = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    const decisionAvg = clampScore(averageDecisionScore, 5);
    const score = Math.round(meterAverage * 0.6 + decisionAvg * 10 * 0.4);

    let outcome;
    if (meterAverage >= 65 && decisionAvg >= 6) outcome = 'success';
    else if (meterAverage >= 40 && decisionAvg >= 4) outcome = 'partial';
    else outcome = 'failure';

    return { outcome, score: Math.max(0, Math.min(100, score)) };
};
