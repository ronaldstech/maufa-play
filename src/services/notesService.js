import axios from 'axios';
import { askJson, askText, requireApiKey, FETCH_PROXY_URL } from './groqClient';

export const NOTES_CONTEXT_LIMIT = 14000;
export const MIN_NOTES_LENGTH = 120;

const clamp = (value, min, max, fallback) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return Math.max(min, Math.min(max, Math.round(num)));
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const clean = (value) => (typeof value === 'string' ? value.trim() : '');

/** Trims lecture material to the window the model can reliably read. */
export const prepareNotes = (raw) => {
    const text = typeof raw === 'string' ? raw.trim() : '';
    return text.slice(0, NOTES_CONTEXT_LIMIT);
};

export const hasEnoughNotes = (raw) => prepareNotes(raw).length >= MIN_NOTES_LENGTH;

/**
 * Rewrites a Google Slides / Drive link into the plain-text export endpoint, which
 * proxies can read far more reliably than the HTML editor view.
 */
export const normaliseSlidesUrl = (input) => {
    const trimmed = clean(input);
    if (!trimmed) return '';

    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

    try {
        const url = new URL(withProtocol);
        const slides = url.pathname.match(/\/presentation\/d\/([a-zA-Z0-9-_]+)/);

        if (slides) {
            url.pathname = `/presentation/d/${slides[1]}/export/txt`;
            url.search = '';
            url.hash = '';
            return url.toString();
        }

        return withProtocol;
    } catch {
        return withProtocol;
    }
};

const stripHtml = (html) => html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/**
 * Best-effort read of a linked document (slides, docs, PDF).
 *
 * Browsers cannot fetch these directly, so a proxy must be configured via
 * VITE_FETCH_PROXY_URL. Without one the UI falls back to paste/upload.
 *
 * @param {string} link
 * @returns {Promise<{text: string, sourceUrl: string}>}
 */
export const fetchLinkedNotes = async (link) => {
    requireApiKey();

    const sourceUrl = normaliseSlidesUrl(link);
    if (!sourceUrl) {
        throw new Error('Paste a link to your slides first.');
    }

    if (!FETCH_PROXY_URL) {
        throw new Error('Link import is not configured. Add VITE_FETCH_PROXY_URL to your .env file, or export the slides and upload them instead.');
    }

    const target = FETCH_PROXY_URL.includes('{url}')
        ? FETCH_PROXY_URL.replace('{url}', encodeURIComponent(sourceUrl))
        : `${FETCH_PROXY_URL}${sourceUrl}`;

    try {
        const response = await axios.get(target, {
            timeout: 30000,
            headers: { Accept: 'text/plain, text/html;q=0.9, */*;q=0.8' }
        });

        const raw = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        const text = /<html|<body|<div/i.test(raw.slice(0, 2000)) ? stripHtml(raw) : raw;

        const prepared = prepareNotes(text);

        if (!hasEnoughNotes(prepared)) {
            throw new Error('That link did not return readable text. Try publishing the slides for "anyone with the link", or upload the file instead.');
        }

        return { text: prepared, sourceUrl };
    } catch (error) {
        if (error.message?.startsWith('That link')) throw error;
        if (error.response) {
            throw new Error(`Could not read that link (${error.response.status}). Publish the slides publicly or upload the file instead.`);
        }
        throw new Error(error.message || 'Could not read that link. Upload the file instead.');
    }
};

const buildGrounding = (notes) => `LECTURE MATERIAL - every observation must come from this:
"""
${notes}
"""`;

/**
 * First pass: the lecture skeleton, glossary, gaps and misconceptions.
 *
 * @param {{notes: string, hints?: string}} input
 */
export const analyseLecture = async ({ notes, hints = '' }) => {
    requireApiKey();

    const prepared = prepareNotes(notes);
    if (!hasEnoughNotes(prepared)) {
        throw new Error(`Add more detail first — at least ${MIN_NOTES_LENGTH} characters of notes.`);
    }

    const systemPrompt = `You are the analysis engine behind MaufaLab's Notes Lab. You turn raw lecture material into a clear, teachable structure.

${buildGrounding(prepared)}

${hints ? `STUDENT CONTEXT: ${clean(hints)}\n` : ''}
RULES:
1. Only use material that is present in the lecture. Never introduce outside facts as if they were taught here.
2. "importance" is how much a section matters for an exam: 1 = incidental, 5 = almost certainly assessed.
3. "studyMinutes" is a realistic estimate for a student who has not read it before.
4. Gaps are things the notes hint at but never explain. Misconceptions are things students commonly get wrong about THIS material.
5. Glossary terms must be the actual terminology used in the lecture, not generic words.

Respond ONLY with a valid JSON object. No markdown fences, no commentary.

JSON Structure:
{
  "title": "A short accurate name for this lecture",
  "subject": "The academic subject or course area",
  "summary": "One or two sentences: what this lecture covers and why it matters",
  "sections": [
    {
      "heading": "Section title as taught",
      "summary": "Two sentences on what this section establishes",
      "importance": 1,
      "studyMinutes": 10,
      "keyTerms": ["2 to 5 terms introduced here"],
      "hasFormula": false
    }
  ],
  "glossary": [
    { "term": "Term", "definition": "One sentence definition", "whyItMatters": "One sentence on why a student needs it", "example": "A concrete example or instance" }
  ],
  "gaps": [
    { "item": "What is missing", "severity": "high", "note": "One sentence on the consequence of not understanding it" }
  ],
  "misconceptions": [
    { "myth": "The wrong belief", "reality": "What is actually true in this lecture" }
  ]
}

RULES:
1. 4 to 10 "sections" in the order they are taught.
2. 6 to 16 "glossary" entries, most important first.
3. "severity" is "high", "medium" or "low".
4. If the notes genuinely have no gaps or misconceptions, return empty arrays rather than inventing filler.`;

    const parsed = await askJson(systemPrompt, [
        { role: 'user', content: `Analyse these lecture notes.${hints ? ` Student context: ${clean(hints)}` : ''}` }
    ], { temperature: 0.4, maxTokens: 3200 });

    const sections = asArray(parsed?.sections)
        .filter((section) => clean(section?.heading))
        .map((section, index) => ({
            id: `section-${index + 1}`,
            heading: clean(section.heading),
            summary: clean(section.summary),
            importance: clamp(section.importance, 1, 5, 3),
            studyMinutes: clamp(section.studyMinutes, 1, 120, 10),
            keyTerms: asArray(section.keyTerms).map(clean).filter(Boolean).slice(0, 6),
            hasFormula: section.hasFormula === true
        }));

    if (sections.length < 2) {
        throw new Error('These notes were too thin to break down. Add more detail and try again.');
    }

    return {
        title: clean(parsed?.title) || 'Lecture notes',
        subject: clean(parsed?.subject),
        summary: clean(parsed?.summary),
        sections,
        glossary: asArray(parsed?.glossary)
            .filter((entry) => clean(entry?.term) && clean(entry?.definition))
            .map((entry) => ({
                term: clean(entry.term),
                definition: clean(entry.definition),
                whyItMatters: clean(entry.whyItMatters),
                example: clean(entry.example)
            })),
        gaps: asArray(parsed?.gaps)
            .filter((entry) => clean(entry?.item))
            .map((entry) => ({
                item: clean(entry.item),
                severity: ['high', 'medium', 'low'].includes(entry.severity) ? entry.severity : 'medium',
                note: clean(entry.note)
            })),
        misconceptions: asArray(parsed?.misconceptions)
            .filter((entry) => clean(entry?.myth) && clean(entry?.reality))
            .map((entry) => ({ myth: clean(entry.myth), reality: clean(entry.reality) }))
    };
};

/**
 * Second pass: exam pack, concept graph and timeline. Loaded lazily by the UI.
 *
 * @param {{notes: string, analysis: object}} input
 */
export const buildExamPack = async ({ notes, analysis }) => {
    requireApiKey();

    const prepared = prepareNotes(notes);
    const sectionTitles = asArray(analysis?.sections).map((section) => section.heading).join(' | ');

    const systemPrompt = `You are the exam and visualisation engine behind MaufaLab's Notes Lab.

${buildGrounding(prepared)}

LECTURE SECTIONS: ${sectionTitles || 'not available'}

RULES:
1. Exam questions must be answerable from this lecture alone.
2. Cover the high-importance sections first.
3. The concept map must be a small directed acyclic graph: 5 to 12 nodes, 6 to 18 links. Use short labels (one or two words).
4. Use "concept", "formula", "example" or "term" as each node's "kind".
5. Only produce a timeline when the material is genuinely chronological or process-based. Otherwise return an empty array.

Respond ONLY with a valid JSON object.

JSON Structure:
{
  "examQuestions": [
    { "question": "Question text", "answer": "Model answer", "marks": 5, "difficulty": "easy", "topic": "Section heading" }
  ],
  "conceptMap": {
    "nodes": [ { "id": "n1", "label": "Label", "kind": "concept" } ],
    "links": [ { "from": "n1", "to": "n2" } ]
  },
  "timeline": [ { "label": "Stage or date", "detail": "What happens at this stage" } ]
}

RULES:
1. 8 to 12 "examQuestions". "marks" is 1 to 15. "difficulty" is "easy", "medium" or "hard".
2. Every link must reference node ids that exist in "nodes". Never create a cycle.
3. Keep node labels under 24 characters.`;

    const parsed = await askJson(systemPrompt, [
        { role: 'user', content: 'Build the exam pack, concept map and timeline for this lecture.' }
    ], { temperature: 0.45, maxTokens: 3200 });

    const rawNodes = asArray(parsed?.conceptMap?.nodes).filter((node) => clean(node?.id) && clean(node?.label));
    const nodeIds = new Set(rawNodes.map((node) => String(node.id)));

    const nodes = rawNodes.slice(0, 14).map((node, index) => ({
        id: String(node.id) || `n${index + 1}`,
        label: clean(node.label),
        kind: ['concept', 'formula', 'example', 'term'].includes(node.kind) ? node.kind : 'concept'
    }));

    const seenLinks = new Set();

    const links = asArray(parsed?.conceptMap?.links)
        .filter((link) => link && nodeIds.has(String(link.from)) && nodeIds.has(String(link.to)))
        .filter((link) => link.from !== link.to)
        .map((link) => `${link.from}->${link.to}`)
        .filter((key) => {
            if (seenLinks.has(key)) return false;
            seenLinks.add(key);
            return true;
        })
        .slice(0, 20)
        .map((key) => {
            const [from, to] = key.split('->');
            return { from, to };
        });

    return {
        examQuestions: asArray(parsed?.examQuestions)
            .filter((item) => clean(item?.question) && clean(item?.answer))
            .map((item) => ({
                question: clean(item.question),
                answer: clean(item.answer),
                marks: clamp(item.marks, 1, 15, 5),
                difficulty: ['easy', 'medium', 'hard'].includes(item.difficulty) ? item.difficulty : 'medium',
                topic: clean(item.topic)
            })),
        conceptMap: { nodes, links },
        timeline: asArray(parsed?.timeline)
            .filter((item) => clean(item?.label))
            .slice(0, 10)
            .map((item) => ({ label: clean(item.label), detail: clean(item.detail) }))
    };
};

/**
 * Plain-English deep dive for one section of the lecture.
 *
 * @param {{notes: string, section: object, analysis?: object}} input
 */
export const explainSection = async ({ notes, section }) => {
    requireApiKey();

    const prepared = prepareNotes(notes);
    const heading = clean(section?.heading);

    if (!heading) {
        throw new Error('Pick a section first.');
    }

    const systemPrompt = `You are a master teacher rewriting one part of a lecture so a student who missed it can still understand.

${buildGrounding(prepared)}

SECTION TO EXPLAIN: "${heading}"

STRUCTURE YOUR REPLY AS MARKDOWN WITH THESE EXACT HEADINGS:
### In plain words
Two or three sentences with no jargon.

### The mental model
An analogy the student can picture. Say what the analogy breaks down at.

### Worked through
Show how the idea actually works. Use the lecture's own examples, numbers or cases where they exist. Walk through it step by step.

### Watch out
The mistake students make here, and why it is tempting.

### Prove it to yourself
One short question the student can answer to check they really got it, then the answer collapsed below it.

RULES:
1. Stay strictly inside the lecture's material.
2. If the lecture does not actually explain something, say so plainly instead of inventing it.
3. Under 450 words.`;

    return askText(systemPrompt, [
        { role: 'user', content: `Explain the "${heading}" section of these notes.` }
    ], { temperature: 0.5, maxTokens: 1500 });
};

/**
 * Goes deeper on a single glossary term.
 *
 * @param {{notes: string, term: string, definition?: string}} input
 */
export const explainTerm = async ({ notes, term, definition = '' }) => {
    requireApiKey();

    const prepared = prepareNotes(notes);
    const termText = clean(term);

    if (!termText) {
        throw new Error('Pick a term first.');
    }

    const systemPrompt = `You are a master teacher expanding one term from a student's lecture notes.

${buildGrounding(prepared)}

TERM: "${termText}"
${definition ? `THE LECTURE'S OWN DEFINITION: "${clean(definition)}"` : ''}

STRUCTURE YOUR REPLY AS MARKDOWN WITH THESE EXACT HEADINGS:
### What it actually means
Expand the definition in plain language, staying true to this lecture.

### Where it shows up
The contexts in this lecture where the term does work. Be specific.

### Example from the material
A worked example using the lecture's own subject matter.

### Quick self-check
One question, then a collapsed answer.

RULES:
1. Stay inside the lecture's material. Never import outside facts.
2. Under 300 words.`;

return askText(systemPrompt, [
        { role: 'user', content: `Explain "${termText}" in more depth.` }
    ], { temperature: 0.5, maxTokens: 1100 });
};

/** Builds a source string that pins generation to one section of the lecture. */
export const buildScopedSource = (notes, section) => {
    const base = prepareNotes(notes);
    if (!section?.heading) return base;

    return `${base}

=== STUDENT FOCUS ===
Explain, quiz and test ONLY this section of the lecture and nothing else:
"${clean(section.heading)}"
${section.summary ? `It covers: ${clean(section.summary)}` : ''}`;
};

/**
 * Explains every section of the lecture, in small parallel batches so nothing gets
 * truncated. Progress is reported as sections land.
 *
 * @param {{notes: string, sections: Array<object>, onProgress?: (done: number, total: number) => void}} input
 * @returns {Promise<Array<{id: string, heading: string, markdown: string}>>}
 */
export const explainSections = async ({ notes, sections, onProgress, batchSize = 3 }) => {
    const targets = asArray(sections).filter((section) => clean(section?.heading));
    if (!targets.length) return [];

    const chunks = [];
    for (let index = 0; index < targets.length; index += batchSize) {
        chunks.push(targets.slice(index, index + batchSize));
    }

    const results = [];

    for (const chunk of chunks) {
        const batch = await Promise.all(chunk.map(async (section) => ({
            id: section.id,
            heading: clean(section.heading),
            markdown: await explainSection({ notes, section })
        })));

        results.push(...batch);
        onProgress?.(results.length, targets.length);
    }

    return results;
};

const sanitiseTreeNode = (node, depth = 0, budget = { count: 0 }) => {
    const label = clean(node?.label);
    if (!label || depth > 2 || budget.count >= 26) return null;

    budget.count += 1;

    return {
        id: clean(node.id) || `node-${budget.count}`,
        label: label.slice(0, 46),
        kind: ['topic', 'term', 'formula', 'example', 'critical'].includes(node.kind) ? node.kind : 'topic',
        note: clean(node.note).slice(0, 320),
        children: asArray(node.children)
            .slice(0, 6)
            .map((child) => sanitiseTreeNode(child, depth + 1, budget))
            .filter(Boolean)
    };
};

/**
 * Builds a hierarchical concept tree plus the lecture's build sequence.
 *
 * @param {{notes: string, analysis: object}} input
 */
export const buildConceptTree = async ({ notes, analysis }) => {
    requireApiKey();

    const prepared = prepareNotes(notes);
    const sectionTitles = asArray(analysis?.sections).map((section) => section.heading);

    const systemPrompt = `You are the visualisation engine behind MaufaLab's Notes Lab. You turn a lecture into a concept tree a student can navigate.

${buildGrounding(prepared)}

${sectionTitles.length ? `SECTIONS, IN TEACHING ORDER:\n${sectionTitles.map((title) => `- ${title}`).join('\n')}` : ''}

RULES:
1. The root node is the whole lecture topic. Its children must be the lecture's main sections, in teaching order.
2. Three levels maximum: root, section, detail.
3. Every node's "note" is one plain sentence saying what that node means. Never leave it empty.
4. "kind" is "topic" for the root and sections, then "term", "formula", "example" or "critical".
5. Only include what the lecture actually covers.
6. Produce a "timeline" only when the material is genuinely sequential or process-like. Otherwise return [].

Respond ONLY with a valid JSON object.

JSON Structure:
{
  "tree": {
    "id": "root",
    "label": "Lecture topic",
    "kind": "topic",
    "note": "What this lecture is about",
    "children": [
      { "id": "s1", "label": "Section", "kind": "topic", "note": "One sentence", "children": [
        { "id": "s1a", "label": "Detail or term", "kind": "term", "note": "One sentence", "children": [] }
      ]}
    ]
  },
  "timeline": [ { "label": "Stage", "detail": "What happens here" } ]
}

RULES:
1. At most 6 children per node and at most 26 nodes in total.
2. Node labels are one to four words.`;

    const parsed = await askJson(systemPrompt, [
        { role: 'user', content: 'Build the concept tree for this lecture.' }
    ], { temperature: 0.4, maxTokens: 2600 });

    const tree = sanitiseTreeNode(parsed?.tree);

    return {
        tree,
        timeline: asArray(parsed?.timeline)
            .filter((item) => clean(item?.label))
            .slice(0, 10)
            .map((item) => ({ label: clean(item.label), detail: clean(item.detail) }))
    };
};

/**
 * Builds the puzzle-method pack: word scrambles and fill-in-the-blank checks per section.
 *
 * @param {{notes: string, analysis: object}} input
 */
export const buildPuzzleMethod = async ({ notes, analysis }) => {
    requireApiKey();

    const prepared = prepareNotes(notes);
    const sections = asArray(analysis?.sections).filter((section) => clean(section?.heading));

    if (!sections.length) {
        throw new Error('Analyse the lecture first.');
    }

    const sectionList = sections
        .map((section, index) => `${index + 1}. "${clean(section.heading)}" — ${clean(section.summary)}`)
        .join('\n');

    const systemPrompt = `You are the puzzle engine behind MaufaLab's Notes Lab. You turn each section of a lecture into something the student has to solve.

${buildGrounding(prepared)}

SECTIONS:
${sectionList}

RULES:
1. Scramble words are the section's own key terms and formulas, taken verbatim from the lecture. Never invent vocabulary.
2. Cloze sentences must be taken from the lecture's own explanation of that section, with exactly one key term removed and replaced by ____.
3. Every "answer" is the word that fills the blank. Every "hint" gives a clue without giving the word away.
4. If a section has too little material for puzzles, return empty arrays for it rather than inventing content.

Respond ONLY with a valid JSON object.

JSON Structure:
{
  "sections": [
    {
      "sectionId": "section-1",
      "heading": "Section heading as it appears above",
      "scramble": [ { "word": "photosynthesis", "hint": "Clue for the word" } ],
      "cloze": [ { "before": "Sentence text up to the blank ", "answer": "word", "after": " and the rest of the sentence.", "hint": "Clue" } ]
    }
  ]
}

RULES:
1. "sectionId" must match one of the section ids given to you in the numbered list.
2. 2 to 5 scramble words and 2 to 3 cloze sentences per section.
3. Scramble words are 5 characters or longer.`;

    const parsed = await askJson(systemPrompt, [
        { role: 'user', content: 'Build the puzzle pack for every listed section.' }
    ], { temperature: 0.5, maxTokens: 3000 });

    const validIds = new Set(sections.map((section) => section.id));

    const puzzleSections = asArray(parsed?.sections)
        .filter((item) => validIds.has(clean(item?.sectionId)))
        .map((item) => ({
            sectionId: clean(item.sectionId),
            heading: clean(item.heading),
            scramble: asArray(item.scramble)
                .filter((entry) => clean(entry?.word) && clean(entry.word).replace(/[^a-zA-Z]/g, '').length >= 5)
                .slice(0, 6)
                .map((entry) => ({ word: clean(entry.word).replace(/[^a-zA-Z-]/g, ''), hint: clean(entry.hint) })),
            cloze: asArray(item.cloze)
                .filter((entry) => clean(entry?.answer) && (clean(entry.before) || clean(entry.after)))
                .slice(0, 4)
                .map((entry) => ({
                    before: clean(entry.before),
                    after: clean(entry.after),
                    answer: clean(entry.answer),
                    hint: clean(entry.hint)
                }))
        }))
        .filter((item) => item.scramble.length || item.cloze.length);

    if (!puzzleSections.length) {
        throw new Error('Not enough detail in these notes to build puzzles yet.');
    }

    return { sections: puzzleSections };
};
