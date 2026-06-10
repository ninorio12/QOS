'use client'

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

/**
 * Source viewer styled like a VS Code editor pane: dark background,
 * monospace font, line-number gutter and syntax highlighting.
 * Shows the raw file contents — not a rendered markdown preview.
 */
export default function CodeView({
  text,
  language = 'markdown',
  className = '',
}: {
  text: string
  language?: string
  className?: string
}) {
  return (
    <div className={`text-[12.5px] leading-relaxed ${className}`} style={{ background: '#1e1e1e' }}>
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        showLineNumbers
        wrapLines={false}
        wrapLongLines={false}
        customStyle={{
          margin: 0,
          padding: '16px 12px',
          background: '#1e1e1e',
          fontSize: '12.5px',
          overflowX: 'auto',
          whiteSpace: 'pre',
        }}
        lineNumberStyle={{
          minWidth: '2.5em',
          paddingRight: '1em',
          color: '#858585',
          userSelect: 'none',
        }}
        codeTagProps={{
          style: {
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            whiteSpace: 'pre',
            display: 'inline-block',
            minWidth: '100%',
          },
        }}
      >
        {text}
      </SyntaxHighlighter>
    </div>
  )
}
