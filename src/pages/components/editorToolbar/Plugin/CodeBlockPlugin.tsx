import { useRef } from 'react';
import { type LexicalEditor } from 'lexical';
import { handleInsertCodeBlock } from '../handlers';

interface CodeBlockControlsProps {
  editor: LexicalEditor;
  isInCodeBlock: boolean;
  currentCodeLanguage: string;
}

export default function CodeBlockControls({
  editor,
  isInCodeBlock,
  currentCodeLanguage,
}: CodeBlockControlsProps) {
  return (
    <button
      id='insert-code-button'
      className={`toolbar-button ${isInCodeBlock ? 'active' : ''}`}
      onClick={(e) => handleInsertCodeBlock(editor, currentCodeLanguage, e)}
      onMouseDown={(e) => e.preventDefault()}>
      <i className='fa fa-code'>代码块</i>
    </button>
  );
}