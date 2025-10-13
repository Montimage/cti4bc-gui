import React from 'react';

const JsonViewer = ({ data }) => {
    const formattedLines = formatJsonLines(data);

    return (
        <div className="json-view-container"
        style={{
            overflow: "auto",
            backgroundColor: "#1e1e1e",
            borderRadius: "8px",
            padding: "20px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            margin: "15px 0",
            fontSize: '14px',
            fontFamily: "'Fira Code', 'Consolas', monospace",
            lineHeight: '1.5',
            color: '#d4d4d4',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
        }}
        >
            {formattedLines.map((line, index) => (
                <div key={index}>
                    {line.map((part, i) => (
                        <span key={i} style={{ color: part.color }}>
                            {part.text}
                        </span>
                    ))}
                </div>
            ))}
        </div>
    );
};

const formatJsonLines = (data) => {
    const jsonString = JSON.stringify(data, null, 2);
    const lines = jsonString.split('\n');

    return lines.map((line) => {
        const parts = [];

        const regex =
            /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^"\\])*"(\s*:)?|\b(true|false|null)\b|-?\d+(\.\d+)?([eE][+-]?\d+)?)/g;

        let lastIndex = 0;
        let match;

        while ((match = regex.exec(line)) !== null) {
            if (match.index > lastIndex) {
                parts.push({
                    text: line.substring(lastIndex, match.index),
                    color: '#d4d4d4'
                });
            }

            const token = match[0];
            let color = '#9cdcfe';

            if (/^"/.test(token)) {
                color = /:$/.test(token) ? '#9cdcfe' : '#ce9178';
            } else if (/true|false/.test(token)) {
                color = '#569cd6';
            } else if (/null/.test(token)) {
                color = '#569cd6';
            } else {
                color = '#b5cea8';
            }

            parts.push({ text: token, color });
            lastIndex = regex.lastIndex;
        }

        if (lastIndex < line.length) {
            parts.push({
                text: line.substring(lastIndex),
                color: '#d4d4d4'
            });
        }

        return parts;
    });
};

export default JsonViewer;