'use client';

import React, { useMemo } from 'react';
import './SplitText.css';

export interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  textAlign?: 'left' | 'center' | 'right';
  tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div';
  style?: React.CSSProperties;
}

const SplitText: React.FC<SplitTextProps> = ({
  text,
  className = '',
  delay = 35,
  textAlign = 'left',
  tag: Tag = 'span',
  style,
}) => {
  const characters = useMemo(() => Array.from(text), [text]);

  return (
    <Tag
      className={`split-parent ${className}`.trim()}
      style={{ textAlign, ...style }}
      aria-label={text}
    >
      {characters.map((char, index) => (
        <span
          key={`${char}-${index}`}
          className="split-char"
          style={{
            animationDelay: `${index * delay}ms`,
            whiteSpace: char === ' ' ? 'pre' : 'normal',
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </Tag>
  );
};

export default SplitText;
