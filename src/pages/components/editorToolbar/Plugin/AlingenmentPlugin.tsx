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
        id='align-left-button'
        className={`toolbar-button ${alignment === 'left' ? 'active' : ''}`}
        onClick={() => handleAlignment(editor, 'left')}
        onMouseDown={(e) => e.preventDefault()}>
        <i className='fa fa-align-left'>左对齐</i>
      </button>
      <button
        id='align-center-button'
        className={`toolbar-button ${alignment === 'center' ? 'active' : ''}`}
        onClick={() => handleAlignment(editor, 'center')}
        onMouseDown={(e) => e.preventDefault()}>
        <i className='fa fa-align-center'>中</i>
      </button>
      <button
        id='align-right-button'
        className={`toolbar-button ${alignment === 'right' ? 'active' : ''}`}
        onClick={() => handleAlignment(editor, 'right')}
        onMouseDown={(e) => e.preventDefault()}>
        <i className='fa fa-align-right'>右</i>
      </button>
      <button
        id='align-justify-button'
        className={`toolbar-button ${alignment === 'justify' ? 'active' : ''}`}
        onClick={() => handleAlignment(editor, 'justify')}
        onMouseDown={(e) => e.preventDefault()}>
        <i className='fa fa-align-justify'>两端</i>
      </button>
      <div className='toolbar-divider'></div>
    </>
  );
}