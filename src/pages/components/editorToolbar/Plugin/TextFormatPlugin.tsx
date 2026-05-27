import { type LexicalEditor } from 'lexical';
import {
  handleBoldToggle,
  handleItalicToggle,
  handleUnderlineToggle,
  handleStrikethroughToggle,
} from '../handlers';

interface TextFormatControlsProps {
  editor: LexicalEditor;
  isBoldActive: boolean;
  isItalicActive: boolean;
  isUnderlineActive: boolean;
  isStrikethroughActive: boolean;
}

export default function TextFormatControls({
  editor,
  isBoldActive,
  isItalicActive,
  isUnderlineActive,
  isStrikethroughActive,
}: TextFormatControlsProps) {
  return (
    <>
      <button
        type="button"
        className={`tbtn ${isBoldActive ? 'active' : ''}`}
        onClick={(e) => handleBoldToggle(editor, e)}
        onMouseDown={(e) => e.preventDefault()}>
        B
      </button>

      <button
        type="button"
        className={`tbtn ${isItalicActive ? 'active' : ''}`}
        onClick={(e) => handleItalicToggle(editor, e)}
        onMouseDown={(e) => e.preventDefault()}>
        I
      </button>

      <button
        type="button"
        className={`tbtn ${isUnderlineActive ? 'active' : ''}`}
        onClick={(e) => handleUnderlineToggle(editor, e)}
        onMouseDown={(e) => e.preventDefault()}>
        U
      </button>

      <button
        type="button"
        className={`tbtn ${isStrikethroughActive ? 'active' : ''}`}
        onClick={(e) => handleStrikethroughToggle(editor, e)}
        onMouseDown={(e) => e.preventDefault()}>
        S
      </button>
    </>
  );
}
