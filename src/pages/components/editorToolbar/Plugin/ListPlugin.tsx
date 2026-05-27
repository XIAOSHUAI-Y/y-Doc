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
        className={`tbtn ${listType === 'bullet' ? 'active' : ''}`}
        onClick={(e) => handleUnorderedList(editor, listType, e)}
        onMouseDown={(e) => e.preventDefault()}>
        • 列表
      </button>
      <button
        className={`tbtn ${listType === 'number' ? 'active' : ''}`}
        onClick={(e) => handleOrderedList(editor, listType, e)}
        onMouseDown={(e) => e.preventDefault()}>
        1. 列表
      </button>
    </>
  );
}
