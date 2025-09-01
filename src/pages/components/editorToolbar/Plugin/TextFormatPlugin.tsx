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
        id='bold-button'
        className={`toolbar-button ${isBoldActive ? 'active' : ''}`}
        onClick={(e) => handleBoldToggle(editor, e)}
        onMouseDown={(e) => e.preventDefault()}>
        <i className='fa fa-bold'>B</i>
      </button>

      <button
        id='italic-button'
        className={`toolbar-button ${isItalicActive ? 'active' : ''}`}
        onClick={(e) => handleItalicToggle(editor, e)}
        onMouseDown={(e) => e.preventDefault()}>
        <i className='fa fa-italic'>I</i>
      </button>

      <button
        id='underline-button'
        className={`toolbar-button ${isUnderlineActive ? 'active' : ''}`}
        onClick={(e) => handleUnderlineToggle(editor, e)}
        onMouseDown={(e) => e.preventDefault()}>
        <i className='fa fa-underline'>U</i>
      </button>

      <button
        id='strikethrough-button'
        className={`toolbar-button ${isStrikethroughActive ? 'active' : ''}`}
        onClick={(e) => handleStrikethroughToggle(editor, e)}
        onMouseDown={(e) => e.preventDefault()}>
        <i className='fa fa-strikethrough'>删除</i>
      </button>

      <div className='toolbar-divider'></div>

      <button id='text-color-button' className='toolbar-button'>
        <i className='fa fa-font'>画笔</i>
      </button>
      <button id='highlight-button' className='toolbar-button'>
        <i className='fa fa-highlighter'>A</i>
      </button>
      <div className='toolbar-divider'></div>
    </>
  );
}