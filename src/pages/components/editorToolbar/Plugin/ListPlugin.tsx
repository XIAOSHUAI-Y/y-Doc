import { type LexicalEditor } from 'lexical';
import { handleUnorderedList, handleOrderedList } from '../handlers';

type ListType = 'bullet' | 'number' | null;

interface ListControlsProps {
  editor: LexicalEditor;
  listType: ListType;
}

export default function ListControls({ editor, listType }: ListControlsProps) {
  return (
    <>
      <button
        id='bullet-list-button'
        className={`toolbar-button ${listType === 'bullet' ? 'active' : ''}`}
        onClick={(e) => handleUnorderedList(editor, listType, e)}
        onMouseDown={(e) => e.preventDefault()}>
        <i className='fa fa-list-ul'>无序</i>
      </button>
      <button
        id='number-list-button'
        className={`toolbar-button ${listType === 'number' ? 'active' : ''}`}
        onClick={(e) => handleOrderedList(editor, listType, e)}
        onMouseDown={(e) => e.preventDefault()}>
        <i className='fa fa-list-ol'>有序</i>
      </button>
      <button id='checklist-button' className='toolbar-button'>
        <i className='fa fa-tasks'>待办</i>
      </button>
      <div className='toolbar-divider'></div>
    </>
  );
}