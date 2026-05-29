// @ts-nocheck
import { Delta } from './delta'
import { Registry } from './registry'
import { Renderer } from './renderer'
import { SelectionManager } from './selection'
import { Formatter } from './formatter'

/**
 * MiniQuill - 轻量级富文本编辑器
 *
 * 整合 Delta、Renderer、SelectionManager 和 Formatter，
 * 提供完整的富文本编辑功能：
 * - 文本输入和渲染
 * - 选区管理
 * - 格式应用（加粗、斜体、下划线、删除线）
 * - 撤销 / 重做
 * - 粘贴纯文本
 *
 * 使用方式：
 * const editor = new MiniQuill(document.getElementById('editor'))
 *
 * 快捷键：
 * - Ctrl/Cmd + B: 加粗
 * - Ctrl/Cmd + I: 斜体
 * - Ctrl/Cmd + U: 下划线
 * - Ctrl/Cmd + Z: 撤销
 * - Ctrl/Cmd + Shift + Z / Ctrl+Y: 重做
 */
export class MiniQuill {
  container: HTMLElement
  registry: any
  renderer: any
  selection: any
  formatter: any
  delta: any
  history: any[]
  redoStack: any[]
  maxHistory: number
  isRendering: boolean
  highlightDebounceMs: number
  highlightDebounceTimer: any

  /**
   * @param {HTMLElement} container - 编辑器容器元素
   */
  constructor(container) {
    this.container = container
    // 清空 HTML 中可能存在的初始文本（如 <div>Hello World</div>），避免与 render 结果重复
    this.container.innerHTML = ''

    this.registry = new Registry()
    this.renderer = new Renderer(container, this.registry)
    this.selection = new SelectionManager(container)
    this.formatter = new Formatter(new Delta([{ insert: '\n' }]))

    // 初始化内容
    this.delta = new Delta([{ insert: 'Hello World\n' }])

    // 操作历史栈
    this.history = []
    this.redoStack = []
    this.maxHistory = 100
    this.isRendering = false
    this.highlightDebounceMs = 500
    this.highlightDebounceTimer = null
    this.recordHistory()

    this.setupListeners()
    this.render()
  }

  /** 显示复制成功弹窗 */
  showCopyToast() {
    const toast = document.getElementById('copy-toast')
    if (!toast) return
    toast.classList.add('show')
    setTimeout(() => {
      toast.classList.remove('show')
    }, 2000)
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
    this.history.push(JSON.parse(JSON.stringify(this.delta.ops)))
    if (this.history.length > this.maxHistory) {
      this.history.shift()
    }
    this.redoStack = []
  }

  /** 撤销 */
  undo() {
    if (this.history.length <= 1) return
    const current = this.history.pop()
    this.redoStack.push(current)
    const previous = this.history[this.history.length - 1]
    this.delta = new Delta(JSON.parse(JSON.stringify(previous)))
    this.render()
  }

  /** 重做 */
  redo() {
    if (this.redoStack.length === 0) return
    const next = this.redoStack.pop()
    this.history.push(JSON.parse(JSON.stringify(next)))
    this.delta = new Delta(JSON.parse(JSON.stringify(next)))
    this.render()
  }

  /** 设置事件监听器 */
  setupListeners() {
    // 输入事件：同步 DOM 变化到 Delta
    this.container.addEventListener('input', () => {
      if (this.isRendering) return
      this.syncFromDOM()
      this.emit('text-change')
      this.scheduleHighlight()
    })

    // 鼠标释放事件：同步选区
    this.container.addEventListener('mouseup', () => {
      this.selection.syncFromDOM()
      this.selection.save()
    })

    // 键盘事件：Shift+方向键等也会改变选区
    this.container.addEventListener('keyup', (e) => {
      if (e.key.startsWith('Shift') || e.key.startsWith('Arrow') || e.key === 'End' || e.key === 'Home') {
        this.selection.syncFromDOM()
      }
    })

    // 失去焦点时：保存选区供后续恢复
    this.container.addEventListener('blur', () => {
      this.selection.save()
    })

    // 全局选区变化时同步（更可靠地追踪选区）
    document.addEventListener('selectionchange', () => {
      const sel = window.getSelection()
      if (sel.rangeCount > 0 && this.container.contains(sel.getRangeAt(0).startContainer)) {
        this.selection.syncFromDOM()
      }
    })

    // 键盘事件：处理格式化快捷键
    this.container.addEventListener('keydown', (e) => {
      // 代码块内空行 Backspace / Delete 删除当前行
      if (e.key === 'Backspace' || e.key === 'Delete') {
        const selection = window.getSelection()
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)
          let node = range.startContainer
          if (node.nodeType === Node.TEXT_NODE) node = node.parentElement
          const codeBlockContainer = node.closest('.code-block-container')
          if (codeBlockContainer) {
            const codeBlock = node.closest('.code-block')
            const isEmptyLine = codeBlock && codeBlock.textContent === ''
            const isEmptyBlock = codeBlockContainer.textContent === ''
            if (isEmptyLine || isEmptyBlock) {
              e.preventDefault()
              this.selection.syncFromDOM()
              const selRange = this.selection.getRange()
              const lineRange = this.getLineRange(selRange.index)
              this.recordHistory()
              this.deleteRange(lineRange.index, lineRange.length)
              // 光标回到被删除行的起始位置
              this.selection.index = Math.max(0, lineRange.index - lineRange.length)
              this.selection.length = 0
              this.render()
              this.emit('text-change')
              return
            }
          }
        }
      }

      // 列表内 Backspace 处理：光标在空列表项开头时取消列表
      if (e.key === 'Backspace') {
        const selection = window.getSelection()
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)
          let node = range.startContainer
          if (node.nodeType === Node.TEXT_NODE) node = node.parentElement
          const li = node.closest('li')
          if (li) {
            this.selection.syncFromDOM()
            const selRange = this.selection.getRange()
            const lineRange = this.getLineRange(selRange.index)
            if (selRange.index === lineRange.index && lineRange.length === 1) {
              e.preventDefault()
              this.recordHistory()
              const formatter = new Formatter(this.delta)
              formatter.formatBlock(lineRange.index, lineRange.length, { list: null })
              this.delta = formatter.delta
              this._removeIndent(lineRange.index, lineRange.length)
              this.selection.index = lineRange.index
              this.selection.length = 0
              this.recordHistory()
              this.render()
              this.emit('text-change')
              return
            }
          }
        }
      }

      // 引用块内 Backspace 处理：光标在空引用行开头时取消引用
      if (e.key === 'Backspace') {
        const selection = window.getSelection()
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)
          let node = range.startContainer
          if (node.nodeType === Node.TEXT_NODE) node = node.parentElement
          const blockquote = node.closest('blockquote')
          if (blockquote) {
            this.selection.syncFromDOM()
            const selRange = this.selection.getRange()
            const lineRange = this.getLineRange(selRange.index)
            if (selRange.index === lineRange.index && lineRange.length === 1) {
              e.preventDefault()
              this.recordHistory()
              const formatter = new Formatter(this.delta)
              formatter.formatBlock(lineRange.index, lineRange.length, { blockquote: null })
              this.delta = formatter.delta
              this.selection.index = lineRange.index
              this.selection.length = 0
              this.recordHistory()
              this.render()
              this.emit('text-change')
              return
            }
          }
        }
      }

      // 代码块内 Enter 处理：连续两个空行退出代码块（官方 Quill 行为）
      if (e.key === 'Enter') {
        const selection = window.getSelection()
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)
          let node = range.startContainer
          if (node.nodeType === Node.TEXT_NODE) node = node.parentElement
          const codeBlockContainer = node.closest('.code-block-container')
          if (codeBlockContainer) {
            e.preventDefault()
            this.selection.syncFromDOM()
            const selRange = this.selection.getRange()
            const lang = codeBlockContainer.dataset.lang || 'plaintext'

            let lineRange = this.getLineRange(selRange.index)
            // 光标恰好在 \n 之后时，getLineRange 返回 length=0，回退检查前一个位置
            if (lineRange.length === 0 && selRange.index > 0) {
              lineRange = this.getLineRange(selRange.index - 1)
            }

            // 当前行为空 code-block 行，且前一行也是空 code-block 行 → 退出代码块
            if (lineRange.length === 1 && this._lineHasCodeBlock(lineRange.index)) {
              if (lineRange.index > 0) {
                const prevLineRange = this.getLineRange(lineRange.index - 1)
                if (prevLineRange.length === 1 && this._lineHasCodeBlock(prevLineRange.index)) {
                  this.recordHistory()
                  const formatter = new Formatter(this.delta)
                  formatter.formatBlock(prevLineRange.index, prevLineRange.length, { 'code-block': null })
                  this.delta = formatter.delta
                  this.deleteRange(lineRange.index, lineRange.length)
                  this.selection.index = prevLineRange.index
                  this.selection.length = 0
                  this.recordHistory()
                  this.render()
                  this.emit('text-change')
                  return
                }
              }
            }

            // 非退出场景：手动插入带 code-block 属性的换行，避免浏览器创建脱离容器的 div
            this.recordHistory()
            const ops = []
            let currentIndex = 0
            let inserted = false
            for (const op of this.delta.ops) {
              const opLength = typeof op.insert === 'string'
                ? op.insert.length
                : (op.insert ? 1 : (op.retain || op.delete || 0))
              if (inserted || currentIndex + opLength <= selRange.index) {
                ops.push({ ...op })
              } else if (typeof op.insert === 'string') {
                const splitAt = selRange.index - currentIndex
                if (splitAt > 0) {
                  ops.push({
                    insert: op.insert.slice(0, splitAt),
                    ...(op.attributes ? { attributes: { ...op.attributes } } : {})
                  })
                }
                ops.push({ insert: '\n', attributes: { 'code-block': lang } })
                if (splitAt < op.insert.length) {
                  ops.push({
                    insert: op.insert.slice(splitAt),
                    ...(op.attributes ? { attributes: { ...op.attributes } } : {})
                  })
                }
                inserted = true
              } else {
                ops.push({ ...op })
                if (currentIndex === selRange.index) {
                  ops.push({ insert: '\n', attributes: { 'code-block': lang } })
                  inserted = true
                }
              }
              currentIndex += opLength
            }
            if (!inserted) {
              ops.push({ insert: '\n', attributes: { 'code-block': lang } })
            }
            this.delta = new Delta(ops)
            this.selection.index = selRange.index + 1
            this.selection.length = 0
            this.recordHistory()
            this.render()
            this.emit('text-change')
          }
        }
      }

      // 列表内 Enter 处理：空列表项退出列表，非空则分裂并继承格式
      if (e.key === 'Enter') {
        const selection = window.getSelection()
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)
          let node = range.startContainer
          if (node.nodeType === Node.TEXT_NODE) node = node.parentElement
          const li = node.closest('li')
          if (li) {
            e.preventDefault()
            this.selection.syncFromDOM()
            const selRange = this.selection.getRange()
            const lineRange = this.getLineRange(selRange.index)

            // 空列表项 → 退出列表（移除 list 和 indent）
            if (lineRange.length === 1) {
              this.recordHistory()
              const formatter = new Formatter(this.delta)
              formatter.formatBlock(lineRange.index, lineRange.length, { list: null })
              this.delta = formatter.delta
              this._removeIndent(lineRange.index, lineRange.length)
              this.selection.index = lineRange.index
              this.selection.length = 0
              this.recordHistory()
              this.render()
              this.emit('text-change')
              return
            }

            // 非空列表项 → 分裂当前行，新行继承 list + indent
            this.recordHistory()
            const lineFormat = this._getLineFormat(selRange.index)
            const ops = []
            let currentIndex = 0
            let inserted = false
            for (const op of this.delta.ops) {
              const opLength = typeof op.insert === 'string'
                ? op.insert.length
                : (op.insert ? 1 : (op.retain || op.delete || 0))
              if (inserted || currentIndex + opLength <= selRange.index) {
                ops.push({ ...op })
              } else if (typeof op.insert === 'string') {
                const splitAt = selRange.index - currentIndex
                if (splitAt > 0) {
                  ops.push({
                    insert: op.insert.slice(0, splitAt),
                    ...(op.attributes ? { attributes: { ...op.attributes } } : {})
                  })
                }
                const newLineAttrs = {}
                if (lineFormat.list) newLineAttrs.list = lineFormat.list
                if (lineFormat.indent) newLineAttrs.indent = lineFormat.indent
                ops.push({ insert: '\n', ...(Object.keys(newLineAttrs).length > 0 ? { attributes: newLineAttrs } : {}) })
                if (splitAt < op.insert.length) {
                  ops.push({
                    insert: op.insert.slice(splitAt),
                    ...(op.attributes ? { attributes: { ...op.attributes } } : {})
                  })
                }
                inserted = true
              } else {
                ops.push({ ...op })
                if (currentIndex === selRange.index) {
                  const newLineAttrs = {}
                  if (lineFormat.list) newLineAttrs.list = lineFormat.list
                  if (lineFormat.indent) newLineAttrs.indent = lineFormat.indent
                  ops.push({ insert: '\n', ...(Object.keys(newLineAttrs).length > 0 ? { attributes: newLineAttrs } : {}) })
                  inserted = true
                }
              }
              currentIndex += opLength
            }
            if (!inserted) {
              const newLineAttrs = {}
              if (lineFormat.list) newLineAttrs.list = lineFormat.list
              if (lineFormat.indent) newLineAttrs.indent = lineFormat.indent
              ops.push({ insert: '\n', ...(Object.keys(newLineAttrs).length > 0 ? { attributes: newLineAttrs } : {}) })
            }
            this.delta = new Delta(ops)
            this.selection.index = selRange.index + 1
            this.selection.length = 0
            this.recordHistory()
            this.render()
            this.emit('text-change')
          }
        }
      }

      // 引用块内 Enter 处理：非空行保持引用，空行退出引用
      if (e.key === 'Enter') {
        const selection = window.getSelection()
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)
          let node = range.startContainer
          if (node.nodeType === Node.TEXT_NODE) node = node.parentElement
          const blockquote = node.closest('blockquote')
          if (blockquote) {
            e.preventDefault()
            this.selection.syncFromDOM()
            const selRange = this.selection.getRange()
            const lineRange = this.getLineRange(selRange.index)

            // 空引用行 → 退出引用块
            if (lineRange.length === 1) {
              this.recordHistory()
              const formatter = new Formatter(this.delta)
              formatter.formatBlock(lineRange.index, lineRange.length, { blockquote: null })
              this.delta = formatter.delta
              this.selection.index = lineRange.index
              this.selection.length = 0
              this.recordHistory()
              this.render()
              this.emit('text-change')
              return
            }

            // 非空引用行 → 分裂当前行，新行保持引用
            this.recordHistory()
            const ops = []
            let currentIndex = 0
            let inserted = false
            for (const op of this.delta.ops) {
              const opLength = typeof op.insert === 'string'
                ? op.insert.length
                : (op.insert ? 1 : (op.retain || op.delete || 0))
              if (inserted || currentIndex + opLength <= selRange.index) {
                ops.push({ ...op })
              } else if (typeof op.insert === 'string') {
                const splitAt = selRange.index - currentIndex
                if (splitAt > 0) {
                  ops.push({
                    insert: op.insert.slice(0, splitAt),
                    ...(op.attributes ? { attributes: { ...op.attributes } } : {})
                  })
                }
                ops.push({ insert: '\n', attributes: { blockquote: true } })
                if (splitAt < op.insert.length) {
                  ops.push({
                    insert: op.insert.slice(splitAt),
                    ...(op.attributes ? { attributes: { ...op.attributes } } : {})
                  })
                }
                inserted = true
              } else {
                ops.push({ ...op })
                if (currentIndex === selRange.index) {
                  ops.push({ insert: '\n', attributes: { blockquote: true } })
                  inserted = true
                }
              }
              currentIndex += opLength
            }
            if (!inserted) {
              ops.push({ insert: '\n', attributes: { blockquote: true } })
            }
            this.delta = new Delta(ops)
            this.selection.index = selRange.index + 1
            this.selection.length = 0
            this.recordHistory()
            this.render()
            this.emit('text-change')
            return
          }
        }
      }

      // 列表内 Tab 处理：增加/减少缩进
      if (e.key === 'Tab') {
        const selection = window.getSelection()
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)
          let node = range.startContainer
          if (node.nodeType === Node.TEXT_NODE) node = node.parentElement
          const li = node.closest('li')
          if (li) {
            e.preventDefault()
            this.selection.syncFromDOM()
            const selRange = this.selection.getRange()
            const lineRange = this.getLineRange(selRange.index)
            const lineFormat = this._getLineFormat(selRange.index)

            if (e.shiftKey) {
              // Shift+Tab：减少缩进
              if (lineFormat.indent && lineFormat.indent > 0) {
                this.recordHistory()
                this._setIndent(lineRange.index, lineRange.length, lineFormat.indent - 1)
                this.recordHistory()
                this.render()
                this.emit('text-change')
              } else if (lineFormat.list) {
                // 缩进为 0 时取消列表
                this.recordHistory()
                const formatter = new Formatter(this.delta)
                formatter.formatBlock(lineRange.index, lineRange.length, { list: null })
                this.delta = formatter.delta
                this._removeIndent(lineRange.index, lineRange.length)
                this.selection.index = selRange.index
                this.selection.length = 0
                this.recordHistory()
                this.render()
                this.emit('text-change')
              }
            } else {
              // Tab：增加缩进（max 8）
              const newIndent = Math.min((lineFormat.indent || 0) + 1, 8)
              this.recordHistory()
              this._setIndent(lineRange.index, lineRange.length, newIndent)
              this.recordHistory()
              this.render()
              this.emit('text-change')
            }
          }
        }
      }

      if (e.ctrlKey || e.metaKey) {
        // Undo / Redo
        if (e.key === 'z') {
          e.preventDefault()
          if (e.shiftKey) {
            this.redo()
          } else {
            this.undo()
          }
          return
        }
        if (e.key === 'y') {
          e.preventDefault()
          this.redo()
          return
        }

        switch (e.key) {
          case 'b':
            e.preventDefault()
            this.format('bold', true)
            break
          case 'i':
            e.preventDefault()
            this.format('italic', true)
            break
          case 'u':
            e.preventDefault()
            this.format('underline', true)
            break
        }
      }
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
          this.syncFromDOM()
          this.emit('text-change')
          this.render()
        }
      }
    })

    // 粘贴事件：阻止默认粘贴，处理文本、链接和图片
    this.container.addEventListener('paste', (e) => {
      e.preventDefault()
      this.selection.syncFromDOM()
      const range = this.selection.getRange()

      // 优先处理粘贴的图片文件
      const files = e.clipboardData.files
      if (files && files.length > 0) {
        for (const file of files) {
          if (file.type.startsWith('image/')) {
            const reader = new FileReader()
            reader.onload = (ev) => {
              this.insertEmbed(range.index, 'image', ev.target.result)
              this.emit('text-change')
            }
            reader.readAsDataURL(file)
            return
          }
        }
      }

      const text = e.clipboardData.getData('text/plain')
      if (!text) return

      // 检测光标是否在代码块中（优先用 Delta 数据，比 DOM 选区更可靠）
      let codeBlockLang = this._getCodeBlockLangAt(range.index)
      let inCodeBlock = codeBlockLang !== null

      // 备用：Delta 判断失败时回退到 DOM 检查
      if (!inCodeBlock) {
        const selection = window.getSelection()
        if (selection.rangeCount > 0) {
          let node = selection.getRangeAt(0).startContainer
          if (node.nodeType === Node.TEXT_NODE) node = node.parentElement
          const codeBlockContainer = node.closest('.code-block-container')
          if (codeBlockContainer) {
            inCodeBlock = true
            codeBlockLang = codeBlockContainer.dataset.lang || 'plaintext'
          }
        }
      }

      // 如果粘贴的是单个 URL，自动转为链接
      const urlRegex = /^https?:\/\/\S+$/i
      if (urlRegex.test(text.trim())) {
        this.insertText(range.index, text.trim())
        this.format('link', text.trim())
        this.selection.index = range.index + text.trim().length
        this.selection.length = 0
      } else if (inCodeBlock && text.includes('\n')) {
        // 代码块内粘贴多行文本：按行分割，每行带 code-block 属性
        this.recordHistory()
        const lines = text.split('\n')
        const newOps = []
        let currentIndex = 0
        let inserted = false
        let trailingOp = null

        for (const op of this.delta.ops) {
          const opLength = typeof op.insert === 'string'
            ? op.insert.length
            : (op.insert ? 1 : (op.retain || op.delete || 0))

          if (inserted || currentIndex + opLength <= range.index) {
            newOps.push({ ...op })
          } else if (typeof op.insert === 'string') {
            const splitAt = range.index - currentIndex
            if (splitAt > 0) {
              newOps.push({
                insert: op.insert.slice(0, splitAt),
                ...(op.attributes ? { attributes: op.attributes } : {})
              })
            }
            for (let i = 0; i < lines.length; i++) {
              if (i > 0) {
                newOps.push({ insert: '\n', attributes: { 'code-block': codeBlockLang } })
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
              newOps.push({ insert: '\n', attributes: { 'code-block': codeBlockLang } })
            }
            newOps.push({ insert: lines[i] })
          }
        }

        // 确保最后一行以 \n 结尾，否则它不会被识别为独立的代码块行
        const needsTrailingNewline = !trailingOp || !trailingOp.insert.startsWith('\n')
        if (needsTrailingNewline) {
          newOps.push({ insert: '\n', attributes: { 'code-block': codeBlockLang } })
        }

        if (trailingOp) {
          newOps.push(trailingOp)
        }

        this.delta = new Delta(newOps)
        this.selection.index = range.index + text.length + (needsTrailingNewline ? 1 : 0)
        this.selection.length = 0
        this.recordHistory()
        this.render()
      } else {
        this.insertText(range.index, text)
      }
      this.emit('text-change')
    })

  }

  /**
   * 将 Quill 风格的 code-block Delta 转换为 mini-quill 内部格式
   * Quill 格式：代码行无 code-block 属性，末尾空 insert 带 code-block
   * mini-quill 格式：每行 \n 都带 code-block 属性
   * @param {Array} ops
   * @returns {Array}
   */
  _convertQuillCodeBlockOps(ops) {
    const newOps = []
    let i = 0
    while (i < ops.length) {
      const op = ops[i]
      // 检查是否是 Quill 风格的 code-block 标记（空 insert + code-block）
      if (typeof op.insert === 'string' && op.insert === '' && op.attributes && op.attributes['code-block'] !== undefined) {
        const lang = op.attributes['code-block']
        // 回溯前面的 ops，给以 \n 结尾的连续 op 加上 code-block
        let j = newOps.length - 1
        while (j >= 0) {
          const prevOp = newOps[j]
          if (typeof prevOp.insert === 'string' && prevOp.insert.endsWith('\n')) {
            if (!prevOp.attributes) prevOp.attributes = {}
            prevOp.attributes['code-block'] = lang
            j--
          } else {
            break
          }
        }
        // 如果没有找到前面的 \n 行，说明是空代码块
        if (j === newOps.length - 1) {
          newOps.push({ insert: '\n', attributes: { 'code-block': lang } })
        }
      } else {
        newOps.push({
          insert: op.insert,
          ...(op.attributes ? { attributes: { ...op.attributes } } : {})
        })
      }
      i++
    }
    return newOps
  }

  /**
   * 获取包含指定位置的行的范围
   * @param {number} index
   * @returns {{index: number, length: number}}
   */
  getLineRange(index) {
    let currentIndex = 0
    let lineStart = 0
    for (const op of this.delta.ops) {
      const opLength = typeof op.insert === 'string'
        ? op.insert.length
        : (op.insert ? 1 : (op.retain || op.delete || 0))
      if (typeof op.insert === 'string') {
        for (let i = 0; i < op.insert.length; i++) {
          const pos = currentIndex + i
          if (op.insert[i] === '\n') {
            if (pos >= index) {
              return { index: lineStart, length: pos + 1 - lineStart }
            }
            lineStart = pos + 1
          }
        }
      }
      currentIndex += opLength
    }
    return { index: lineStart, length: currentIndex - lineStart }
  }

  /**
   * 获取包含指定位置的连续 code-block 范围
   * @param {number} index
   * @returns {{index: number, length: number} | null}
   */
  getCodeBlockRange(index) {
    let currentIndex = 0
    let blockStart = -1
    let blockEnd = -1
    let inBlock = false

    for (const op of this._convertQuillCodeBlockOps(this.delta.ops)) {
      const opLength = typeof op.insert === 'string'
        ? op.insert.length
        : (op.insert ? 1 : (op.retain || op.delete || 0))

      if (typeof op.insert === 'string') {
        for (let i = 0; i < op.insert.length; i++) {
          if (op.insert[i] === '\n') {
            const pos = currentIndex + i
            const isCodeBlock = op.attributes && op.attributes['code-block'] !== undefined

            if (isCodeBlock) {
              if (!inBlock) {
                blockStart = pos
                inBlock = true
              }
              blockEnd = pos + 1
            } else {
              if (inBlock) {
                if (blockStart <= index && index < blockEnd) {
                  return { index: blockStart, length: blockEnd - blockStart }
                }
                inBlock = false
                blockStart = -1
                blockEnd = -1
              }
            }
          }
        }
      }

      currentIndex += opLength
    }

    if (inBlock && blockStart <= index && index < blockEnd) {
      return { index: blockStart, length: blockEnd - blockStart }
    }

    return null
  }

  /**
   * 获取指定位置的行格式（块级属性）
   * @param {number} index
   * @returns {Object}
   */
  _getLineFormat(index) {
    const lineRange = this.getLineRange(index)
    const endPos = lineRange.index + lineRange.length - 1
    let currentIndex = 0
    for (const op of this.delta.ops) {
      const opLength = typeof op.insert === 'string'
        ? op.insert.length
        : (op.insert ? 1 : (op.retain || op.delete || 0))
      if (typeof op.insert === 'string') {
        for (let i = 0; i < op.insert.length; i++) {
          if (op.insert[i] === '\n' && currentIndex + i === endPos) {
            return op.attributes || {}
          }
        }
      }
      currentIndex += opLength
    }
    return {}
  }

  /**
   * 为指定行设置 indent
   * @param {number} index
   * @param {number} length
   * @param {number} indent
   */
  _setIndent(index, length, indent) {
    const newOps = []
    let currentIndex = 0

    for (const op of this.delta.ops) {
      const opLength = typeof op.insert === 'string'
        ? op.insert.length
        : (op.insert ? 1 : (op.retain || op.delete || 0))

      if (typeof op.insert === 'string' && op.insert.includes('\n')) {
        let textStart = 0
        for (let i = 0; i < op.insert.length; i++) {
          if (op.insert[i] === '\n') {
            if (textStart < i) {
              newOps.push({
                insert: op.insert.slice(textStart, i),
                ...(op.attributes ? { attributes: { ...op.attributes } } : {})
              })
            }

            const pos = currentIndex + i
            const overlapStart = Math.max(pos, index)
            const overlapEnd = Math.min(pos + 1, index + length)

            if (overlapEnd > overlapStart) {
              const attrs = op.attributes ? { ...op.attributes } : {}
              if (indent > 0) {
                attrs.indent = indent
              } else {
                delete attrs.indent
              }
              if (Object.keys(attrs).length > 0) {
                newOps.push({ insert: '\n', attributes: attrs })
              } else {
                newOps.push({ insert: '\n' })
              }
            } else {
              newOps.push({
                insert: '\n',
                ...(op.attributes ? { attributes: { ...op.attributes } } : {})
              })
            }
            textStart = i + 1
          }
        }
        if (textStart < op.insert.length) {
          newOps.push({
            insert: op.insert.slice(textStart),
            ...(op.attributes ? { attributes: { ...op.attributes } } : {})
          })
        }
      } else if (op.insert === '\n') {
        const overlapStart = Math.max(currentIndex, index)
        const overlapEnd = Math.min(currentIndex + opLength, index + length)
        if (overlapEnd > overlapStart) {
          const attrs = op.attributes ? { ...op.attributes } : {}
          if (indent > 0) {
            attrs.indent = indent
          } else {
            delete attrs.indent
          }
          if (Object.keys(attrs).length > 0) {
            newOps.push({ insert: '\n', attributes: attrs })
          } else {
            newOps.push({ insert: '\n' })
          }
        } else {
          newOps.push({ ...op })
        }
      } else {
        newOps.push({ ...op })
      }
      currentIndex += opLength
    }

    this.delta = new Delta(newOps)
  }

  /**
   * 移除指定行的 indent
   * @param {number} index
   * @param {number} length
   */
  _removeIndent(index, length) {
    this._setIndent(index, length, 0)
  }

  /**
   * 删除 Delta 中指定范围的内容
   * @param {number} index
   * @param {number} length
   */
  deleteRange(index, length) {
    const newOps = []
    let currentIndex = 0

    for (const op of this.delta.ops) {
      const opLength = typeof op.insert === 'string'
        ? op.insert.length
        : (op.insert ? 1 : (op.retain || op.delete || 0))

      if (currentIndex + opLength <= index || currentIndex >= index + length) {
        newOps.push({ ...op })
      } else if (typeof op.insert === 'string') {
        const startInOp = Math.max(0, index - currentIndex)
        const endInOp = Math.min(opLength, index + length - currentIndex)

        if (startInOp > 0) {
          newOps.push({
            insert: op.insert.slice(0, startInOp),
            ...(op.attributes ? { attributes: op.attributes } : {})
          })
        }
        if (endInOp < opLength) {
          newOps.push({
            insert: op.insert.slice(endInOp),
            ...(op.attributes ? { attributes: op.attributes } : {})
          })
        }
      }

      currentIndex += opLength
    }

    if (newOps.length === 0) {
      newOps.push({ insert: '\n' })
    }

    this.delta = new Delta(newOps)
  }

  /**
   * 检查指定位置所在的行是否有 code-block 属性
   * @param {number} index
   * @returns {boolean}
   */
  _lineHasCodeBlock(index) {
    let currentIndex = 0
    for (const op of this._convertQuillCodeBlockOps(this.delta.ops)) {
      const opLength = typeof op.insert === 'string'
        ? op.insert.length
        : (op.insert ? 1 : (op.retain || op.delete || 0))

      if (currentIndex <= index && index < currentIndex + opLength) {
        return op.attributes && op.attributes['code-block'] !== undefined
      }
      currentIndex += opLength
    }
    return false
  }

  /**
   * 获取指定位置所在代码块的语言
   * @param {number} index
   * @returns {string|null}
   */
  _getCodeBlockLangAt(index) {
    let currentIndex = 0
    for (const op of this._convertQuillCodeBlockOps(this.delta.ops)) {
      const opLength = typeof op.insert === 'string'
        ? op.insert.length
        : (op.insert ? 1 : (op.retain || op.delete || 0))

      if (currentIndex <= index && index < currentIndex + opLength) {
        if (op.attributes && op.attributes['code-block'] !== undefined) {
          const lang = op.attributes['code-block']
          return typeof lang === 'string' ? lang : 'plaintext'
        }
      }
      currentIndex += opLength
    }
    return null
  }

  /**
   * 删除当前光标所在的代码块
   */
  deleteCodeBlock() {
    this.selection.syncFromDOM()
    const range = this.selection.getRange()
    const blockRange = this.getCodeBlockRange(range.index)

    if (blockRange) {
      this.recordHistory()
      this.deleteRange(blockRange.index, blockRange.length)
      this.selection.index = blockRange.index
      this.selection.length = 0
      this.render()
      this.emit('text-change')
    }
  }

  /**
   * 对当前选区应用格式
   * @param {string} name - 格式名称（bold, italic, underline, strike）
   * @param {*} value - 格式值（通常为 true）
   */
  format(name, value) {
    this.selection.restore()
    this.selection.syncFromDOM()
    let range = this.selection.getRange()

    const blockFormats = ['header', 'list', 'blockquote', 'code-block']
    const isBlockFormat = blockFormats.includes(name)

    if (range.length === 0) {
      if (isBlockFormat) {
        range = this.getLineRange(range.index)
        this.selection.setSelection(range.index, range.length)
      } else {
        return // 内联格式需要选区
      }
    }

    // 块级格式扩展到覆盖所有涉及的整行（避免选区未对齐到行尾导致漏行）
    if (isBlockFormat) {
      const startLine = this.getLineRange(range.index)
      const endLine = this.getLineRange(range.index + range.length)
      range = {
        index: startLine.index,
        length: (endLine.index + endLine.length) - startLine.index
      }
      this.selection.setSelection(range.index, range.length)
    }

    // 防御性截断：防止 range 超出 delta 实际长度
    const totalLength = this.delta.ops.reduce((sum, op) => {
      const len = typeof op.insert === 'string'
        ? op.insert.length
        : (op.insert ? 1 : (op.retain || op.delete || 0))
      return sum + len
    }, 0)
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
   * @param {number} index - 插入位置
   * @param {string} text - 要插入的文本
   */
  insertText(index, text) {
    const newOps = []
    let currentIndex = 0
    let inserted = false

    for (const op of this.delta.ops) {
      const opLength = typeof op.insert === 'string'
        ? op.insert.length
        : (op.insert ? 1 : (op.retain || op.delete || 0))

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
    // 将光标移到插入文本末尾
    this.selection.index = index + text.length
    this.selection.length = 0
    this.recordHistory()
    this.render()
  }

  /**
   * 在指定位置插入 embed（图片等）
   * @param {number} index - 插入位置
   * @param {string} type - embed 类型，如 'image'
   * @param {string} value - embed 值，如图片 URL
   */
  insertEmbed(index, type, value) {
    const newOps = []
    let currentIndex = 0
    let inserted = false

    for (const op of this.delta.ops) {
      const opLength = typeof op.insert === 'string'
        ? op.insert.length
        : (op.insert ? 1 : (op.retain || op.delete || 0))

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
   * 从 DOM 同步内容到 Delta
   * 解析容器 DOM 结构，保留内联格式（bold、italic、underline、strike、color）
   */
  syncFromDOM() {
    const ops = []

    /** 提取 inline 格式属性 */
    const getInlineAttributes = (el) => {
      const attrs = {}
      if (!el || el.nodeType !== Node.ELEMENT_NODE) return attrs

      const tag = el.tagName
      if (tag === 'STRONG' || tag === 'B') attrs.bold = true
      if (tag === 'EM' || tag === 'I') attrs.italic = true
      if (tag === 'U') attrs.underline = true
      if (tag === 'S' || tag === 'STRIKE') attrs.strike = true
      if (tag === 'A') {
        if (el.href) attrs.link = el.href
      }
      if (tag === 'IMG') {
        if (el.src) attrs.image = el.src
      }

      const style = el.style
      if (style.fontWeight === 'bold' || parseInt(style.fontWeight, 10) >= 700) {
        attrs.bold = true
      }
      if (style.fontStyle === 'italic') attrs.italic = true

      const td = style.textDecoration
      if (td) {
        if (td.includes('underline')) attrs.underline = true
        if (td.includes('line-through')) attrs.strike = true
      }
      if (style.color) attrs.color = style.color

      return attrs
    }

    /** 提取块级格式属性 */
    const getBlockFormat = (el) => {
      const format = {}
      const tag = el.tagName
      if (tag === 'H1') format.header = 1
      else if (tag === 'H2') format.header = 2
      else if (tag === 'H3') format.header = 3
      else if (tag === 'H4') format.header = 4
      else if (tag === 'H5') format.header = 5
      else if (tag === 'H6') format.header = 6
      else if (tag === 'BLOCKQUOTE') format.blockquote = true
      else if (tag === 'PRE') format['code-block'] = true
      else if (tag === 'LI') {
        const parent = el.parentElement
        if (parent) {
          if (parent.tagName === 'UL') format.list = 'bullet'
          else if (parent.tagName === 'OL') format.list = 'ordered'
        }
        if (el.dataset.indent) {
          format.indent = parseInt(el.dataset.indent, 10)
        }
      }
      return format
    }

    /** 处理单个 block（forcedFormat 用于 blockquote 内子元素） */
    const processBlock = (block, forcedFormat = null) => {
      const blockFormat = forcedFormat ? { ...forcedFormat } : getBlockFormat(block)
      const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
      let node
      const pending = []

      const flushPending = () => {
        for (const item of pending) ops.push(item)
        pending.length = 0
      }

      const pushNewline = () => {
        if (Object.keys(blockFormat).length > 0) {
          ops.push({ insert: '\n', attributes: blockFormat })
        } else {
          ops.push({ insert: '\n' })
        }
      }

      while ((node = walker.nextNode())) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.tagName === 'IMG') {
            flushPending()
            ops.push({ insert: { image: node.src } })
            continue
          }
          if (node.tagName === 'BR') {
            flushPending()
            pushNewline()
            continue
          }
          continue
        }

        const text = node.textContent
        if (!text) continue

        let parent = node.parentElement
        const attrs = {}
        while (parent && parent !== block && parent !== this.container) {
          Object.assign(attrs, getInlineAttributes(parent))
          parent = parent.parentElement
        }

        if (Object.keys(attrs).length > 0) {
          pending.push({ insert: text, attributes: attrs })
        } else {
          pending.push({ insert: text })
        }
      }

      flushPending()

      // block 末尾没有 \n（没有 <br>）时补一个
      if (ops.length === 0 || ops[ops.length - 1].insert !== '\n') {
        pushNewline()
      }
    }

    // 收集所有顶级块级节点（元素节点 + 需要包裹的直接文本节点）
    // 浏览器编辑 contenteditable 时，偶尔会把文本节点直接挂在容器下而不包在 div 里
    const blocks = []
    for (const node of this.container.childNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        blocks.push(node)
      } else if (node.nodeType === Node.TEXT_NODE && node.textContent && node.textContent.trim()) {
        const wrap = document.createElement('div')
        wrap.textContent = node.textContent
        blocks.push(wrap)
      }
    }

    if (blocks.length === 0) {
      const content = this.container.textContent || ''
      this.delta = new Delta([{ insert: content + '\n' }])
      return
    }

    blocks.forEach((block) => {
      if (block.tagName === 'UL' || block.tagName === 'OL') {
        Array.from(block.children).forEach((li) => processBlock(li))
      } else if (block.classList.contains('code-block-wrapper')) {
        const container = block.querySelector('.code-block-container')
        let lang = container ? (container.dataset.lang || 'plaintext') : 'plaintext'
        if (lang === 'true') lang = true
        const lines = container ? Array.from(container.children) : []
        if (lines.length === 0) {
          ops.push({ insert: '\n', attributes: { 'code-block': lang } })
        } else {
          for (const line of lines) {
            const text = line.textContent || ''
            if (text) ops.push({ insert: text })
            ops.push({ insert: '\n', attributes: { 'code-block': lang } })
          }
        }
      } else if (block.tagName === 'BLOCKQUOTE') {
        Array.from(block.children).forEach((child) => processBlock(child, { blockquote: true }))
      } else {
        processBlock(block)
      }
    })

    if (ops.length === 0) {
      ops.push({ insert: '\n' })
    }

    this.recordHistory()
    this.delta = new Delta(ops)
  }

  /** 将当前 Delta 渲染到页面 */
  render() {
    const range = this.selection.getRange()

    // 保存 code-block collapsed 状态
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
    // 将 Quill 风格的 code-block 转换为 mini-quill 内部格式供渲染器使用
    const convertedOps = this._convertQuillCodeBlockOps(compressed.ops)
    const convertedDelta = new Delta(convertedOps)
    // 重建 DOM 前清除选区，防止浏览器在节点被删除时把 range 错误调整到外部元素
    window.getSelection().removeAllRanges()
    this.renderer.render(convertedDelta)
    this.isRendering = false

    // 恢复 code-block collapsed 状态
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

    // 恢复选区，避免光标丢失
    this.selection.setSelection(range.index, range.length)
  }

  /**
   * 触发自定义事件
   * @param {string} event - 事件名称
   */
  emit(event) {
    this.container.dispatchEvent(new CustomEvent(event))
  }
}
