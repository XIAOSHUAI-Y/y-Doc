import { useRef } from 'react'
import MiniQuillEditor, { type MiniQuillEditorRef } from './MiniQuillEditor'
import Toolbar from '../../pages/components/editorToolbar/index'
import './editor.css'

export function Editor({ docId }: { docId?: string }) {
  const editorRef = useRef<MiniQuillEditorRef>(null)

  return (
    <>
      <Toolbar editorRef={editorRef} />
      <div className='editor-wrap'>
        <div className='editor-sheet'>
          <MiniQuillEditor ref={editorRef} docId={docId} />
        </div>
      </div>
    </>
  )
}
