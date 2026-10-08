import { useState } from 'react';
import { FileText, Link2, Upload, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import PDFWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { fetchLinkedNotes, prepareNotes, hasEnoughNotes, MIN_NOTES_LENGTH } from '../services/notesService';

pdfjsLib.GlobalWorkerOptions.workerSrc = PDFWorker;

const SOURCES = [
    { id: 'paste', label: 'Paste notes', icon: FileText },
    { id: 'link', label: 'Slides link', icon: Link2 },
    { id: 'pdf', label: 'PDF upload', icon: Upload }
];

const extractPdfText = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';

    for (let page = 1; page <= Math.min(pdf.numPages, 12); page += 1) {
        const pdfPage = await pdf.getPage(page);
        const content = await pdfPage.getTextContent();
        text += `${content.items.map((item) => item.str).join(' ')}\n`;
    }

    if (text.trim().length < 100) {
        throw new Error('Could not extract enough text from this PDF. It is probably scanned or image-based.');
    }

    return text;
};

const ImportBar = ({ notes, sourceLabel, onNotesChange, onAnalyse, isAnalysing, error }) => {
    const [mode, setMode] = useState('paste');
    const [link, setLink] = useState('');
    const [isReading, setIsReading] = useState(false);
    const [fileName, setFileName] = useState('');
    const [localError, setLocalError] = useState('');

    const shownError = localError || error;
    const prepared = prepareNotes(notes);
    const canAnalyse = hasEnoughNotes(notes) && !isAnalysing && !isReading;
    const shortfall = MIN_NOTES_LENGTH - prepared.length;

    const handleLinkRead = async () => {
        if (!link.trim()) {
            setLocalError('Paste a link to your slides or document first.');
            return;
        }

        setIsReading(true);
        setLocalError('');

        try {
            const { text, sourceUrl } = await fetchLinkedNotes(link);
            onNotesChange(text, sourceUrl);
        } catch (readError) {
            setLocalError(readError.message || 'Could not read that link.');
        } finally {
            setIsReading(false);
        }
    };

    const handleFile = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        setIsReading(true);
        setLocalError('');

        try {
            const text = await extractPdfText(file);
            onNotesChange(text, file.name);
        } catch (extractError) {
            setLocalError(extractError.message || 'Could not read that PDF.');
        } finally {
            setIsReading(false);
            event.target.value = '';
        }
    };

    const busy = isAnalysing || isReading;

    return (
        <section className="nl-import">
            <div className="nl-import-head">
                <div>
                    <span className="nl-eyebrow">Step 1</span>
                    <h2 className="nl-import-title">Bring your lecture</h2>
                </div>
                {sourceLabel && <span className="nl-source-chip">{sourceLabel}</span>}
            </div>

            <div className="nl-source-tabs" role="tablist" aria-label="Note source">
                {SOURCES.map((source) => {
                    const Icon = source.icon;
                    return (
                        <button
                            key={source.id}
                            type="button"
                            role="tab"
                            aria-selected={mode === source.id}
                            className={`nl-source-tab ${mode === source.id ? 'is-active' : ''}`}
                            onClick={() => { setMode(source.id); setLocalError(''); }}
                        >
                            <Icon size={15} strokeWidth={2} />
                            {source.label}
                        </button>
                    );
                })}
            </div>

            {mode === 'paste' && (
                <div className="nl-field">
                    <textarea
                        className="nl-textarea"
                        value={notes}
                        onChange={(event) => onNotesChange(event.target.value, '')}
                        placeholder={'Paste your lecture notes here. Bullet points, lecture transcripts and rough handwriting-style notes all work — MaufaLab finds the structure behind them.'}
                        rows={9}
                    />
                    <div className="nl-field-foot">
                        <span className={prepared.length < MIN_NOTES_LENGTH ? 'nl-count is-low' : 'nl-count'}>
                            {prepared.length.toLocaleString()} characters
                            {prepared.length > 14000 && ' (first 14,000 used)'}
                        </span>
                        {!hasEnoughNotes(notes) && prepared.length > 0 && (
                            <span className="nl-hint">{shortfall} more to go</span>
                        )}
                    </div>
                </div>
            )}

            {mode === 'link' && (
                <div className="nl-field">
                    <div className="nl-link-row">
                        <Link2 size={18} className="nl-link-icon" strokeWidth={1.8} />
                        <input
                            className="nl-input"
                            type="url"
                            value={link}
                            onChange={(event) => setLink(event.target.value)}
                            onKeyDown={(event) => { if (event.key === 'Enter') handleLinkRead(); }}
                            placeholder="https://docs.google.com/presentation/d/..."
                        />
                        <button type="button" className="nl-btn-ghost" onClick={handleLinkRead} disabled={busy}>
                            {isReading ? <Loader2 size={16} className="nl-spin" /> : 'Read link'}
                        </button>
                    </div>
                    <p className="nl-note">
                        Slides must be shared as &ldquo;anyone with the link&rdquo;. If the link cannot be read,
                        export them as a PDF or text file and use that tab instead.
                    </p>
                    {prepared.length > 0 && (
                        <div className="nl-preview">
                            <span className="nl-preview-label">Read {prepared.length.toLocaleString()} characters</span>
                            <p>{prepared.slice(0, 260)}…</p>
                        </div>
                    )}
                </div>
            )}

            {mode === 'pdf' && (
                <div className="nl-field">
                    <label className={`nl-dropzone ${isReading ? 'is-busy' : ''}`}>
                        <Upload size={26} strokeWidth={1.5} />
                        <strong>{fileName || 'Choose a lecture PDF'}</strong>
                        <span>{isReading ? 'Reading the pages…' : 'Up to 12 pages, first 14,000 characters used'}</span>
                        <input type="file" accept="application/pdf,.pdf" onChange={handleFile} hidden />
                    </label>
                    {prepared.length > 0 && (
                        <div className="nl-preview">
                            <span className="nl-preview-label">Read {prepared.length.toLocaleString()} characters</span>
                            <p>{prepared.slice(0, 260)}…</p>
                        </div>
                    )}
                </div>
            )}

            {shownError && (
                <div className="nl-alert">
                    <AlertCircle size={16} strokeWidth={2} />
                    <span>{shownError}</span>
                </div>
            )}

            <button type="button" className="nl-btn-primary" onClick={onAnalyse} disabled={!canAnalyse}>
                {isAnalysing ? <Loader2 size={18} className="nl-spin" /> : <Sparkles size={18} strokeWidth={2} />}
                {isAnalysing ? 'Breaking it down…' : 'Break it down'}
            </button>
        </section>
    );
};

export default ImportBar;