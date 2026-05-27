import { type LexicalEditor } from 'lexical';
import { handleAlignment } from '../handlers';

type Alignment = 'left' | 'center' | 'right' | 'justify';

interface AlignmentControlsProps {
  editor: LexicalEditor;
  alignment: Alignment;
}

export default function AlignmentControls({
  editor,
  alignment,
}: AlignmentControlsProps) {
  return (
    <>
      <button
        className={`tbtn ${alignment === 'left' ? 'active' : ''}`}
        onClick={() => handleAlignment(editor, 'left')}
        onMouseDown={(e) => e.preventDefault()}>
        ⬅
      </button>
      <button
        className={`tbtn ${alignment === 'center' ? 'active' : ''}`}
        onClick={() => handleAlignment(editor, 'center')}
        onMouseDown={(e) => e.preventDefault()}>
        ↔
      </button>
      <button
        className={`tbtn ${alignment === 'right' ? 'active' : ''}`}
        onClick={() => handleAlignment(editor, 'right')}
        onMouseDown={(e) => e.preventDefault()}>
        ➡
      </button>
      <button
        className={`tbtn ${alignment === 'justify' ? 'active' : ''}`}
        onClick={() => handleAlignment(editor, 'justify')}
        onMouseDown={(e) => e.preventDefault()}>
        ☰
      </button>
    </>
  );
}
