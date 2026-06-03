// @ts-nocheck
import { Delta } from './delta'
import { getOpLength } from './utils'
import { getCodeBlockLangAt, deleteRange } from './delta-ops'

/**
 * PasteHandler - 粘贴事件处理
 *
 * 处理粘贴内容：图片、URL、纯文本、代码块内多行粘贴。
 */
export class PasteHandler {
  private editor: any

  constructor(editor: any) {
    this.editor = editor
  }

  handle(e: ClipboardEvent) {
    e.preventDefault()
    const ed = this.editor
    ed.selection.syncFromDOM()
    const range = ed.selection.getRange()

    // 优先处理粘贴的图片文件
    const files = e.clipboardData.files
    if (files && files.length > 0) {
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader()
          reader.onload = (ev) => {
            ed.insertEmbed(range.index, 'image', ev.target.result)
            ed.emit('text-change')
          }
          reader.readAsDataURL(file)
          return
        }
      }
    }

    const text = e.clipboardData.getData('text/plain')
    if (!text) return

    const codeBlockLang = getCodeBlockLangAt(ed.delta, range.index)
    const inCodeBlock = codeBlockLang !== null

    const urlRegex = /^https?:\/\/\S+$/i
    if (urlRegex.test(text.trim())) {
      ed.insertText(range.index, text.trim())
      ed.format('link', text.trim())
      ed.selection.index = range.index + text.trim().length
      ed.selection.length = 0
    } else if (inCodeBlock && text.includes('\n')) {
      this._pasteMultiLineInCodeBlock(range.index, text, codeBlockLang)
    } else {
      ed.insertText(range.index, text)
    }
    ed.emit('text-change')
  }

  /** 代码块内粘贴多行文本 */
  private _pasteMultiLineInCodeBlock(index: number, text: string, lang: string) {
    const ed = this.editor
    ed.historyManager.record()
    const lines = text.split('\n')
    const newOps = []
    let currentIndex = 0
    let inserted = false
    let trailingOp = null

    for (const op of ed.delta.ops) {
      const opLength = getOpLength(op)
      if (inserted || currentIndex + opLength <= index) {
        newOps.push({ ...op })
      } else if (typeof op.insert === 'string') {
        const splitAt = index - currentIndex
        if (splitAt > 0) {
          newOps.push({
            insert: op.insert.slice(0, splitAt),
            ...(op.attributes ? { attributes: op.attributes } : {})
          })
        }
        for (let i = 0; i < lines.length; i++) {
          if (i > 0) {
            newOps.push({ insert: '\n', attributes: { 'code-block': lang } })
          }
          newOps.push({ insert: lines[i] })
        }
        if (splitAt < op.insert.length) {
          trailingOp = {
            insert: op.insert.slice(splitAt),
            ...(op.attributes ? { attributes: op.attributes } : {})
          }
        }
        inserted = true
      } else {
        newOps.push({ ...op })
      }
      currentIndex += opLength
    }

    if (!inserted) {
      for (let i = 0; i < lines.length; i++) {
        if (i > 0) {
          newOps.push({ insert: '\n', attributes: { 'code-block': lang } })
        }
        newOps.push({ insert: lines[i] })
      }
    }

    const needsTrailingNewline = !trailingOp || !trailingOp.insert.startsWith('\n')
    if (needsTrailingNewline) {
      newOps.push({ insert: '\n', attributes: { 'code-block': lang } })
    }
    if (trailingOp) {
      newOps.push(trailingOp)
    }

    ed.delta = new Delta(newOps)
    ed.selection.index = index + text.length + (needsTrailingNewline ? 1 : 0)
    ed.selection.length = 0
    ed.historyManager.record()
    ed.render()
  }
}
