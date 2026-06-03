import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { MiniQuill } from '../mini-quill/mini-quill'
import { QuillShim } from '../mini-quill/QuillShim'
import { QuillBinding } from 'y-quill'
import { RemoteCursorManager } from '../mini-quill/RemoteCursorManager'

const DEV_COLLABORATION_URL = 'ws://localhost:3001'
const PROD_COLLABORATION_URL = 'wss://doc-backend-rho.vercel.app'
const COLLABORATION_URL = __DEV__ ? DEV_COLLABORATION_URL : PROD_COLLABORATION_URL

export interface MiniQuillEditorRef {
  editor: MiniQuill | null
}

interface MiniQuillEditorProps {
  docId?: string
}

const MiniQuillEditor = forwardRef<MiniQuillEditorRef, MiniQuillEditorProps>(
  ({ docId }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const editorRef = useRef<MiniQuill | null>(null)
    const bindingRef = useRef<QuillBinding | null>(null)
    const providerRef = useRef<WebsocketProvider | null>(null)
    const cursorManagerRef = useRef<RemoteCursorManager | null>(null)

    useImperativeHandle(ref, () => ({
      get editor() {
        return editorRef.current
      },
    }))

    useEffect(() => {
      const container = containerRef.current
      if (!container) return

      container.setAttribute('contenteditable', 'true')

      const editor = new MiniQuill(container)
      editorRef.current = editor

      // 协同
      let binding: QuillBinding | null = null
      let provider: WebsocketProvider | null = null
      let ydoc: Y.Doc | null = null

      if (docId) {
        ydoc = new Y.Doc()
        const ytext = ydoc.getText('mini-quill')

        provider = new WebsocketProvider(
          `${COLLABORATION_URL}/collab`,
          docId,
          ydoc,
          { connect: false }
        )
        providerRef.current = provider

        provider.on('status', (event: { status: string }) => {
          console.log('协作连接状态:', event.status)
        })

        provider.on('connection-error', (error: unknown) => {
          console.error('协作连接错误:', error)
        })

        provider.awareness.setLocalState({
          name: 'User-' + Math.random().toString(36).substring(2, 8),
          color: getRandomCursorColor(),
        })

        const shim = new QuillShim(editor)
        binding = new QuillBinding(ytext, shim, provider.awareness)
        bindingRef.current = binding as any

        // 启动远端光标同步
        const cursorManager = new RemoteCursorManager(editor, provider.awareness)
        cursorManagerRef.current = cursorManager

        provider.connect()
      }

      return () => {
        cursorManagerRef.current?.destroy()
        cursorManagerRef.current = null
        binding?.destroy()
        provider?.disconnect()
        ydoc?.destroy()
        container.innerHTML = ''
        editorRef.current = null
      }
    }, [docId])

    return (
      <div
        ref={containerRef}
        className='editor-input'
        style={{ outline: 'none', minHeight: '50vh' }}
      />
    )
  }
)

MiniQuillEditor.displayName = 'MiniQuillEditor'

function getRandomCursorColor() {
  const r = Math.floor(Math.random() * 56) + 200
  const g = Math.floor(Math.random() * 101) + 100
  const b = Math.floor(Math.random() * 101)
  return (
    '#' +
    r.toString(16).padStart(2, '0') +
    g.toString(16).padStart(2, '0') +
    b.toString(16).padStart(2, '0')
  )
}

export default MiniQuillEditor
