import React from 'react';

const renderInline = (text) => {
    return String(text ?? '')
        .split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
        .filter(part => part !== '')
        .map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index}>{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('`') && part.endsWith('`')) {
                return <code key={index}>{part.slice(1, -1)}</code>;
            }
            if (part.startsWith('*') && part.endsWith('*')) {
                return <em key={index}>{part.slice(1, -1)}</em>;
            }
            return <React.Fragment key={index}>{part}</React.Fragment>;
        });
};

const TABLE_DIVIDER = /^\s*\|?[\s]*:?-{2,}:?[\s]*(?:\|[\s]*:?-{2,}:?[\s]*)*\|?\s*$/;

const isTableRow = (line) => {
    const trimmed = line.trim();
    return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 1;
};

const isTableDivider = (line) => isTableRow(line) && TABLE_DIVIDER.test(line);

const splitTableRow = (line) => line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map(cell => cell.trim());

const renderMarkdown = (text) => {
    const lines = String(text ?? '').split('\n');
    const blocks = [];
    let list = null;

    const flushList = () => {
        if (list) {
            blocks.push(list);
            list = null;
        }
    };

    let index = 0;
    while (index < lines.length) {
        const line = lines[index].replace(/\s+$/, '');

        if (!line.trim()) {
            flushList();
            index++;
            continue;
        }

        if (isTableRow(line) && isTableDivider(lines[index + 1] || '')) {
            flushList();
            const header = splitTableRow(line);
            const rows = [];
            index += 2;
            while (index < lines.length && isTableRow(lines[index])) {
                rows.push(splitTableRow(lines[index]));
                index++;
            }
            blocks.push({ type: 'table', header, rows });
            continue;
        }

        const heading = line.match(/^(#{1,4})\s+(.*)$/);
        if (heading) {
            flushList();
            blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] });
            index++;
            continue;
        }

        const bullet = line.match(/^\s*[-*+]\s+(.*)$/);
        if (bullet) {
            if (!list || list.type !== 'ul') {
                flushList();
                list = { type: 'ul', items: [] };
            }
            list.items.push(bullet[1]);
            index++;
            continue;
        }

        const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
        if (numbered) {
            if (!list || list.type !== 'ol') {
                flushList();
                list = { type: 'ol', items: [] };
            }
            list.items.push(numbered[1]);
            index++;
            continue;
        }

        flushList();
        blocks.push({ type: 'paragraph', text: line });
        index++;
    }

    flushList();

    return blocks;
};

const RichText = ({ text, className = '' }) => {
    const blocks = renderMarkdown(text);

    return (
        <div className={className}>
            {blocks.map((block, blockIndex) => {
                if (block.type === 'heading') {
                    const Tag = `h${Math.min(4, block.level + 2)}`;
                    return <Tag key={blockIndex}>{renderInline(block.text)}</Tag>;
                }

                if (block.type === 'paragraph') {
                    return <p key={blockIndex}>{renderInline(block.text)}</p>;
                }

                if (block.type === 'table') {
                    return (
                        <div className="message-table-wrap" key={blockIndex}>
                            <table className="message-table">
                                <thead>
                                    <tr>
                                        {block.header.map((cell, cellIndex) => <th key={cellIndex}>{renderInline(cell)}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {block.rows.map((row, rowIndex) => (
                                        <tr key={rowIndex}>
                                            {row.map((cell, cellIndex) => <td key={cellIndex}>{renderInline(cell)}</td>)}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    );
                }

                const ListTag = block.type === 'ol' ? 'ol' : 'ul';
                return (
                    <ListTag key={blockIndex}>
                        {block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item)}</li>)}
                    </ListTag>
                );
            })}
        </div>
    );
};

export default RichText;