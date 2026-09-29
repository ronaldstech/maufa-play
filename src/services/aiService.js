import axios from 'axios';

const GROQ_API_URL = '/api/groq/chat/completions';
const GROQ_MODEL = 'openai/gpt-oss-120b';
const API_KEY = import.meta.env.VITE_GROQ_API_KEY || import.meta.env.VITE_GROK_API_KEY;

const BOSS_DIFFICULTY_ORDER = ['easy', 'medium', 'hard'];

const parseJsonLoose = (raw) => {
    if (typeof raw !== 'string') return raw;

    const trimmed = raw.trim();
    try {
        return JSON.parse(trimmed);
    } catch {
        const start = trimmed.indexOf('{');
        const end = trimmed.lastIndexOf('}');
        if (start !== -1 && end > start) {
            return JSON.parse(trimmed.slice(start, end + 1));
        }
        throw new Error("AI returned invalid JSON format.");
    }
};

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
