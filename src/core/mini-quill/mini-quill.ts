// @ts-nocheck
import { Delta } from './delta'
import { Renderer } from './renderer'
import { SelectionManager } from './selection'
import { Formatter } from './formatter'
import { getOpLength } from './utils'
import { HistoryManager } from './history'
import { KeyboardHandler } from './keyboard'
import { PasteHandler } from './paste'
import { syncFromDOM } from './dom-sync'
import { convertQuillCodeBlockOps, getLineRange, getCodeBlockRange, deleteRange } from './delta-ops'

/**
 * MiniQuill - 轻量级富文本编辑器
 */
export class MiniQuill {
  container: HTMLElement
  renderer: any
  selection: any
  formatter: any
  delta: any
  historyManager: HistoryManager
  keyboardHandler: KeyboardHandler
  pasteHandler: PasteHandler
  isRendering: boolean
  highlightDebounceMs: number
  highlightDebounceTimer: any

  constructor(container) {
    this.container = container
    this.container.innerHTML = ''

    this.renderer = new Renderer(container)
    this.selection = new SelectionManager(container)
    this.formatter = new Formatter(new Delta([{ insert: '\n' }]))

    this.delta = new Delta([{ insert: 'Hello World\n' }])
    this.isRendering = false
    this.highlightDebounceMs = 500
    this.highlightDebounceTimer = null

    this.historyManager = new HistoryManager(this)
    this.keyboardHandler = new KeyboardHandler(this)
    this.pasteHandler = new PasteHandler(this)

    this.recordHistory()
    this.setupListeners()
    this.render()
  }

  /** 触发复制成功事件 */
  showCopyToast() {
    this.container.dispatchEvent(new CustomEvent('copy-toast'))
  }

  /** 防抖重新高亮代码块 */
  scheduleHighlight() {
    if (this.highlightDebounceTimer) {
      clearTimeout(this.highlightDebounceTimer)
    }
    this.highlightDebounceTimer = setTimeout(() => {
      this.highlightDebounceTimer = null
      const range = this.selection.getRange()
      this.container.querySelectorAll('.code-block-container').forEach(container => {
        if (container.dataset.lang && container.dataset.lang !== 'plaintext') {
          this.renderer.highlightCodeBlock(container)
        }
      })
      this.selection.setSelection(range.index, range.length)
    }, this.highlightDebounceMs)
  }

  /** 记录当前 Delta 到历史栈 */
  recordHistory() {
    this.historyManager.record()
  }

  /** 撤销 */
  undo() {
    this.historyManager.undo()
  }

  /** 重做 */
  redo() {
    this.historyManager.redo()
  }

  /** 设置事件监听器 */
  setupListeners() {
    this.container.addEventListener('input', () => {
      if (this.isRendering) return
      syncFromDOM(this)
      this.emit('text-change')
      this.scheduleHighlight()
    })

    this.container.addEventListener('mouseup', () => {
      this.selection.syncFromDOM()
      this.selection.save()
    })

    this.container.addEventListener('keyup', (e) => {
      if (e.key.startsWith('Shift') || e.key.startsWith('Arrow') || e.key === 'End' || e.key === 'Home') {
        this.selection.syncFromDOM()
      }
    })

    this.container.addEventListener('blur', () => {
      this.selection.save()
    })

    document.addEventListener('selectionchange', () => {
      const sel = window.getSelection()
      if (sel.rangeCount > 0 && this.container.contains(sel.getRangeAt(0).startContainer)) {
        this.selection.syncFromDOM()
      }
    })

    this.container.addEventListener('keydown', (e) => {
      this.keyboardHandler.handle(e)
    })

    // 代码块交互事件委托
    this.container.addEventListener('click', (e) => {
      const toggle = e.target.closest('.code-block-toggle')
      if (toggle) {
        e.preventDefault()
        const wrapper = toggle.closest('.code-block-wrapper')
        const collapsed = wrapper.dataset.collapsed === 'true'
        wrapper.dataset.collapsed = String(!collapsed)
        toggle.textContent = !collapsed ? '▶' : '▼'
        const body = wrapper.querySelector('.code-block-body')
        if (body) body.style.display = !collapsed ? 'none' : 'flex'
        return
      }

      const copyBtn = e.target.closest('.code-block-copy')
      if (copyBtn) {
        e.preventDefault()
        const wrapper = copyBtn.closest('.code-block-wrapper')
        const container = wrapper.querySelector('.code-block-container')
        if (container) {
          const lines = container.querySelectorAll('.code-block')
          const text = Array.from(lines).map(line => line.textContent).join('\n')
          navigator.clipboard.writeText(text).then(() => {
            this.showCopyToast()
          }).catch(() => {})
        }
        return
      }
    })

    this.container.addEventListener('change', (e) => {
      if (e.target.classList.contains('code-block-lang')) {
        const wrapper = e.target.closest('.code-block-wrapper')
        const container = wrapper.querySelector('.code-block-container')
        if (container) {
          container.dataset.lang = e.target.value
          syncFromDOM(this)
          this.emit('text-change')
          this.render()
        }
      }
    })

    this.container.addEventListener('paste', (e) => {
      this.pasteHandler.handle(e)
    })
  }

  /**
   * 对当前选区应用格式
   */
  format(name, value) {
    this.selection.restore()
    this.selection.syncFromDOM()
    let range = this.selection.getRange()

    const blockFormats = ['header', 'list', 'blockquote', 'code-block']
    const isBlockFormat = blockFormats.includes(name)

    if (range.length === 0) {
      if (isBlockFormat) {
        range = getLineRange(this.delta, range.index)
        this.selection.setSelection(range.index, range.length)
      } else {
        return
      }
    }

    if (isBlockFormat) {
      const startLine = getLineRange(this.delta, range.index)
      const endLine = getLineRange(this.delta, range.index + range.length)
      range = {
        index: startLine.index,
        length: (endLine.index + endLine.length) - startLine.index
      }
      this.selection.setSelection(range.index, range.length)
    }

    // 防御性截断
    const totalLength = this.delta.ops.reduce((sum, op) => sum + getOpLength(op), 0)
    if (range.index + range.length > totalLength) {
      range.length = Math.max(0, totalLength - range.index)
    }

    this.recordHistory()
    const formatter = new Formatter(this.delta)

    if (isBlockFormat) {
      formatter.formatBlock(range.index, range.length, { [name]: value })
    } else {
      formatter.format(range.index, range.length, { [name]: value })
    }

    this.delta = formatter.delta
    this.render()
  }

  /**
   * 在指定位置插入纯文本
   */
  insertText(index, text) {
    const newOps = []
    let currentIndex = 0
    let inserted = false

    for (const op of this.delta.ops) {
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
        newOps.push({ insert: text })
        if (splitAt < op.insert.length) {
          newOps.push({
            insert: op.insert.slice(splitAt),
            ...(op.attributes ? { attributes: op.attributes } : {})
          })
        }
        inserted = true
      } else {
        newOps.push({ ...op })
      }
      currentIndex += opLength
    }

    if (!inserted) {
      newOps.push({ insert: text })
    }

    this.delta = new Delta(newOps)
    this.selection.index = index + text.length
    this.selection.length = 0
    this.recordHistory()
    this.render()
  }

  /**
   * 在指定位置插入 embed（图片等）
   */
  insertEmbed(index, type, value) {
    const newOps = []
    let currentIndex = 0
    let inserted = false

    for (const op of this.delta.ops) {
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
        newOps.push({ insert: { [type]: value } })
        if (splitAt < op.insert.length) {
          newOps.push({
            insert: op.insert.slice(splitAt),
            ...(op.attributes ? { attributes: op.attributes } : {})
          })
        }
        inserted = true
      } else {
        newOps.push({ ...op })
      }
      currentIndex += opLength
    }

    if (!inserted) {
      newOps.push({ insert: { [type]: value } })
    }

    this.delta = new Delta(newOps)
    this.selection.index = index + 1
    this.selection.length = 0
    this.recordHistory()
    this.render()
  }

  /**
   * 删除当前光标所在的代码块
   */
  deleteCodeBlock() {
    this.selection.syncFromDOM()
    const range = this.selection.getRange()
    const blockRange = getCodeBlockRange(this.delta, range.index)

    if (blockRange) {
      this.recordHistory()
      this.delta = deleteRange(this.delta, blockRange.index, blockRange.length)
      this.selection.index = blockRange.index
      this.selection.length = 0
      this.render()
      this.emit('text-change')
    }
  }

  /** 将当前 Delta 渲染到页面 */
  render() {
    const range = this.selection.getRange()

    const codeBlockStates = new Map()
    this.container.querySelectorAll('.code-block-wrapper').forEach((el) => {
      const container = el.querySelector('.code-block-container')
      if (container) {
        codeBlockStates.set(container.textContent.slice(0, 200), el.dataset.collapsed === 'true')
      }
    })

    this.isRendering = true
    const compressed = new Delta(JSON.parse(JSON.stringify(this.delta.ops)))
    compressed.compress()
    const convertedOps = convertQuillCodeBlockOps(compressed.ops)
    const convertedDelta = new Delta(convertedOps)
    window.getSelection().removeAllRanges()
    this.renderer.render(convertedDelta)
    this.isRendering = false

    this.container.querySelectorAll('.code-block-wrapper').forEach((el) => {
      const container = el.querySelector('.code-block-container')
      if (container) {
        const key = container.textContent.slice(0, 200)
        if (codeBlockStates.has(key)) {
          const collapsed = codeBlockStates.get(key)
          el.dataset.collapsed = String(collapsed)
          const toggle = el.querySelector('.code-block-toggle')
          if (toggle) toggle.textContent = collapsed ? '▶' : '▼'
          const body = el.querySelector('.code-block-body')
          if (body) body.style.display = collapsed ? 'none' : 'flex'
        }
      }
    })

    this.selection.setSelection(range.index, range.length)
  }

  /** 触发自定义事件 */
  emit(event) {
    this.container.dispatchEvent(new CustomEvent(event))
  }
}
