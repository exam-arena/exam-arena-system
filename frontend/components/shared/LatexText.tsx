import React, { useMemo } from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface LatexTextProps {
  content: string;
}

export function LatexText({ content }: LatexTextProps) {
  const elements = useMemo(() => {
    if (!content) return null;
    if (!content.includes('$')) return <>{content}</>;

    // Regex to match block math $$...$$ or inline math $...$
    const regex = /(\$\$?)(.+?)\1/gs;

    const els = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      // Add text before the math
      if (match.index > lastIndex) {
        els.push(<span key={`text-${lastIndex}`}>{content.substring(lastIndex, match.index)}</span>);
      }

      const isBlock = match[1] === '$$';
      const mathExp = match[2];

      if (isBlock) {
        els.push(
          <span className="block my-2 w-full text-center" key={`math-${match.index}`}>
            <BlockMath math={mathExp} />
          </span>
        );
      } else {
        els.push(<InlineMath key={`math-${match.index}`} math={mathExp} />);
      }

      lastIndex = regex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      els.push(<span key={`text-${lastIndex}`}>{content.substring(lastIndex)}</span>);
    }

    return els;
  }, [content]);

  return <div className="leading-relaxed whitespace-pre-line inline">{elements}</div>;
}
