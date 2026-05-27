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
      className={`tbtn ${isInCodeBlock ? 'active' : ''}`}
      onClick={(e) => handleInsertCodeBlock(editor, currentCodeLanguage, e)}
      onMouseDown={(e) => e.preventDefault()}>
      <span>{ } 代码</span>
    </button>
  );
}
