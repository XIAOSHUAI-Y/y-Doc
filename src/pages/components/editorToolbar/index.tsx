import { useState, useEffect, useRef, type RefObject } from 'react'
import './toolbar.css'
import type { MiniQuillEditorRef } from '../../../core/editor/MiniQuillEditor'

interface ToolbarProps {
  editorRef: RefObject<MiniQuillEditorRef | null>
}

export default function Toolbar({ editorRef }: ToolbarProps) {
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const [isStrike, setIsStrike] = useState(false)
  const [heading, setHeading] = useState<string>('正文')
  const [listType, setListType] = useState<'bullet' | 'ordered' | null>(null)
  const [isBlockquote, setIsBlockquote] = useState(false)
  const [isCodeBlock, setIsCodeBlock] = useState(false)

  const syncState = () => {
    const editor = editorRef.current?.editor
    if (!editor) return

    const range = editor.selection.getRange()
    const ops = editor.delta.ops

    let currentIndex = 0
    let boldActive = false
    let italicActive = false
    let underlineActive = false
    let strikeActive = false

    let lineStart = 0
    let lineFormat: Record<string, any> = {}

    for (const op of ops) {
      const len = typeof op.insert === 'string' ? op.insert.length : 1
      const opStart = currentIndex
      const opEnd = currentIndex + len

      // Inline format detection for selection
      if (typeof op.insert === 'string' && range.length > 0) {
        const overlapStart = Math.max(opStart, range.index)
        const overlapEnd = Math.min(opEnd, range.index + range.length)
        if (overlapEnd > overlapStart && op.attributes) {
          if (op.attributes.bold) boldActive = true
          if (op.attributes.italic) italicActive = true
          if (op.attributes.underline) underlineActive = true
          if (op.attributes.strike) strikeActive = true
        }
      } else if (range.length === 0 && opStart <= range.index && range.index < opEnd) {
        // Collapsed cursor: check the op at cursor position
        if (op.attributes) {
          if (op.attributes.bold) boldActive = true
          if (op.attributes.italic) italicActive = true
          if (op.attributes.underline) underlineActive = true
          if (op.attributes.strike) strikeActive = true
        }
      }

      // Block format detection for the line containing the cursor
      if (typeof op.insert === 'string') {
        for (let i = 0; i < op.insert.length; i++) {
          if (op.insert[i] === '\n') {
            const pos = currentIndex + i
            if (lineStart <= range.index && range.index <= pos + 1) {
              lineFormat = op.attributes || {}
            }
            lineStart = pos + 1
          }
        }
      }

      currentIndex += len
    }

    // Also check if cursor is after the last newline
    if (lineStart <= range.index && range.index <= currentIndex) {
      const lastOp = ops[ops.length - 1]
      if (lastOp && typeof lastOp.insert === 'string' && !lastOp.insert.includes('\n')) {
        lineFormat = lastOp.attributes || {}
      }
    }

    setIsBold(boldActive)
    setIsItalic(italicActive)
    setIsUnderline(underlineActive)
    setIsStrike(strikeActive)

    if (lineFormat.header) {
      setHeading(`H${lineFormat.header}`)
    } else {
      setHeading('正文')
    }

    if (lineFormat.list === 'bullet') {
      setListType('bullet')
    } else if (lineFormat.list === 'ordered') {
      setListType('ordered')
    } else {
      setListType(null)
    }

    setIsBlockquote(!!lineFormat.blockquote)
    setIsCodeBlock(!!lineFormat['code-block'])
  }

  useEffect(() => {
    const editor = editorRef.current?.editor
    if (!editor) return

    const onChange = () => syncState()
    editor.container.addEventListener('text-change', onChange)
    document.addEventListener('selectionchange', onChange)

    return () => {
      editor.container.removeEventListener('text-change', onChange)
      document.removeEventListener('selectionchange', onChange)
    }
  }, [editorRef])

  const format = (name: string, value: any) => {
    editorRef.current?.editor?.format(name, value)
    setTimeout(syncState, 0)
  }

  const toggleList = (type: 'bullet' | 'ordered') => {
    const current = listType
    format('list', current === type ? null : type)
  }

  return (
    <div className='toolbar'>
      <div className='toolbar-group'>
        <button
          className={`tbtn ${heading !== '正文' ? 'active' : ''}`}
          onClick={() => format('header', heading === '正文' ? 1 : null)}
        >
          <span>{heading}</span>
        </button>
        <button className='tbtn' onClick={() => format('header', 1)}>H1</button>
        <button className='tbtn' onClick={() => format('header', 2)}>H2</button>
        <button className='tbtn' onClick={() => format('header', null)}>正文</button>
      </div>

      <div className='toolbar-group'>
        <button
          className={`tbtn ${isBold ? 'active' : ''}`}
          onClick={() => format('bold', true)}
        >
          <strong>B</strong>
        </button>
        <button
          className={`tbtn ${isItalic ? 'active' : ''}`}
          onClick={() => format('italic', true)}
        >
          <em>I</em>
        </button>
        <button
          className={`tbtn ${isUnderline ? 'active' : ''}`}
          onClick={() => format('underline', true)}
        >
          <u>U</u>
        </button>
        <button
          className={`tbtn ${isStrike ? 'active' : ''}`}
          onClick={() => format('strike', true)}
        >
          <s>S</s>
        </button>
      </div>

      <div className='toolbar-group'>
        <button
          className={`tbtn ${listType === 'bullet' ? 'active' : ''}`}
          onClick={() => toggleList('bullet')}
        >
          <span>• 列表</span>
        </button>
        <button
          className={`tbtn ${listType === 'ordered' ? 'active' : ''}`}
          onClick={() => toggleList('ordered')}
        >
          <span>1. 列表</span>
        </button>
        <button
          className={`tbtn ${isBlockquote ? 'active' : ''}`}
          onClick={() => format('blockquote', isBlockquote ? null : true)}
        >
          <span>" 引用</span>
        </button>
        <button
          className={`tbtn ${isCodeBlock ? 'active' : ''}`}
          onClick={() => format('code-block', isCodeBlock ? null : true)}
        >
          <span>{'</>'} 代码</span>
        </button>
      </div>

      <div className='toolbar-group'>
        <button className='tbtn' onClick={() => editorRef.current?.editor?.undo()}>
          <span>↩ 撤销</span>
        </button>
        <button className='tbtn' onClick={() => editorRef.current?.editor?.redo()}>
          <span>↪ 重做</span>
        </button>
      </div>
    </div>
  )
}
