import axios from 'axios';

const GROQ_API_URL = '/api/groq/chat/completions';
const API_KEY = import.meta.env.VITE_GROQ_API_KEY || import.meta.env.VITE_GROK_API_KEY;

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
                model: 'llama-3.3-70b-versatile',
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

    const systemPrompt = isQuiz
        ? `You are an expert academic quiz generator for MaufaLab. 
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
           3. Ensure questions are diverse and cover the main points of the notes.`
        : `You are an expert educational AI assistant for the MaufaLab platform. Your task is to generate perfectly structured academic content for a game called "${gameType}". 
        
           Guidelines:
           1. Extract key concepts, definitions, and facts from the user's provided notes.
           2. Format the output specifically for the "${gameType}" game mode format.
           3. Output your response in clean markdown.`;

    try {
        const response = await axios.post(
            GROQ_API_URL,
            {
                model: 'llama-3.3-70b-versatile',
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
                response_format: isQuiz ? { type: "json_object" } : undefined
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                }
            }
        );

        const content = response.data.choices[0].message.content;

        if (isQuiz) {
            try {
                // Return parsed JSON for quizzes
                const parsed = JSON.parse(content);
                // Handle case where AI wraps array in an object (common with json_object mode)
                if (parsed.questions && Array.isArray(parsed.questions)) return parsed.questions;
                if (parsed.data && Array.isArray(parsed.data)) return parsed.data;
                if (Array.isArray(parsed)) return parsed;
                return [parsed]; // Fallback
            } catch (e) {
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
