// @ts-nocheck
import type { MiniQuill } from './mini-quill'

/**
 * 将文本索引转换为 DOM Range
 * 基于 SelectionManager.setSelection 的逆逻辑
 */
function indexToRange(container: HTMLElement, index: number, length: number): Range | null {
  let currentIndex = 0
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    (node) => {
      if (node.nodeType === Node.ELEMENT_NODE && node.contentEditable === 'false') {
        return NodeFilter.FILTER_REJECT
      }
      if (node.nodeType === Node.TEXT_NODE) {
        let parent = node.parentElement
        while (parent && parent !== container) {
          if (parent.contentEditable === 'false') return NodeFilter.FILTER_SKIP
          parent = parent.parentElement
        }
        return NodeFilter.FILTER_ACCEPT
      }
      if (node.nodeType === Node.ELEMENT_NODE && (node.tagName === 'BR' || node.tagName === 'IMG')) {
        return NodeFilter.FILTER_ACCEPT
      }
      return NodeFilter.FILTER_SKIP
    }
  )

  let startNode: Node | null = null
  let startOffset = 0
  let endNode: Node | null = null
  let endOffset = 0
  let prevBlock: Element | null = null

  const getBlock = (node: Node): Element | null => {
    let el = node.parentElement
    while (el && el !== container) {
      if (el.classList && el.classList.contains('code-block')) return el
      if (el.tagName === 'LI') return el
      if (el.tagName === 'DIV' && el.parentElement && el.parentElement.tagName === 'BLOCKQUOTE') return el
      if (el.parentElement === container) return el
      el = el.parentElement
    }
    return el
  }

  const isPaddingBr = (node: Node): boolean => {
    if ((node as Element).tagName !== 'BR') return false
    const parent = node.parentElement
    if (!parent) return false
    const children = Array.from(parent.childNodes)
    return children.every((n) => n === node || (n.nodeType === Node.TEXT_NODE && !(n as Text).textContent))
  }

  while (walker.nextNode()) {
    const node = walker.currentNode
    const currentBlock = getBlock(node)

    if (prevBlock && prevBlock !== currentBlock) {
      currentIndex += 1
    }
    prevBlock = currentBlock

    if (node.nodeType === Node.ELEMENT_NODE) {
      if ((node as Element).tagName === 'BR') {
        const brLength = isPaddingBr(node) ? 0 : 1
        if (startNode === null && currentIndex + brLength >= index) {
          const prevText = node.previousSibling
          if (prevText && prevText.nodeType === Node.TEXT_NODE) {
            startNode = prevText
            startOffset = (prevText as Text).textContent!.length
          } else {
            startNode = node.parentElement!
            startOffset = Array.from(node.parentElement!.childNodes).indexOf(node)
          }
        }
        if (endNode === null && currentIndex + brLength >= index + length) {
          const prevText = node.previousSibling
          if (prevText && prevText.nodeType === Node.TEXT_NODE) {
            endNode = prevText
            endOffset = (prevText as Text).textContent!.length
          } else {
            endNode = node.parentElement!
            endOffset = Array.from(node.parentElement!.childNodes).indexOf(node)
          }
          break
        }
        currentIndex += brLength
        continue
      }

      if ((node as Element).tagName === 'IMG') {
        if (startNode === null && currentIndex + 1 >= index) {
          if (index === currentIndex) {
            startNode = node
            startOffset = 0
          } else {
            startNode = node.parentElement!
            startOffset = Array.from(node.parentElement!.childNodes).indexOf(node) + 1
          }
        }
        if (endNode === null && currentIndex + 1 >= index + length) {
          if (index + length === currentIndex) {
            endNode = node
            endOffset = 0
          } else {
            endNode = node.parentElement!
            endOffset = Array.from(node.parentElement!.childNodes).indexOf(node) + 1
          }
          break
        }
        currentIndex += 1
        continue
      }
    }

    const nodeLength = node.textContent!.length

    if (startNode === null && currentIndex + nodeLength >= index) {
      startNode = node
      startOffset = index - currentIndex
    }

    if (endNode === null && currentIndex + nodeLength >= index + length) {
      endNode = node
      endOffset = index + length - currentIndex
      break
    }

    currentIndex += nodeLength
  }

  if (!startNode) {
    const lastText = getLastTextNode(container)
    if (lastText) {
      startNode = lastText
      startOffset = lastText.textContent!.length
    } else {
      return null
    }
  }
  if (!endNode) {
    endNode = startNode
    endOffset = startOffset
  }

  const range = document.createRange()
  range.setStart(startNode, startOffset)
  range.setEnd(endNode, endOffset)
  return range
}

function getLastTextNode(container: HTMLElement): Text | null {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  let last: Text | null = null
  while (walker.nextNode()) {
    last = walker.currentNode as Text
  }
  return last
}

/** 生成用户颜色（基于 clientID 的稳定哈希） */
function getUserColor(clientID: number): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  ]
  return colors[Math.abs(clientID) % colors.length]
}

/** 获取用户标签 */
function getUserLabel(state: any): string {
  return state?.name || `User ${state?.clientID || ''}`
}

/**
 * RemoteCursorManager - 多用户光标和选区同步
 *
 * 功能：
 * 1. 监听本地选区变化，同步到 Yjs awareness
 * 2. 监听远端 awareness 变化，渲染远端光标和选区
 * 3. 用户离开时清理光标标记
 */
export class RemoteCursorManager {
  private editor: MiniQuill
  private awareness: any
  private container: HTMLElement
  private cursorElements: Map<number, HTMLElement>
  private selectionElements: Map<number, HTMLElement[]>
  private isDestroyed: boolean

  constructor(editor: MiniQuill, awareness: any) {
    this.editor = editor
    this.awareness = awareness
    this.container = editor.container
    this.cursorElements = new Map()
    this.selectionElements = new Map()
    this.isDestroyed = false

    this.setupLocalCursorSync()
    this.setupRemoteCursorRender()
  }

  /** 同步本地光标到 awareness */
  private setupLocalCursorSync() {
    const updateCursor = () => {
      if (this.isDestroyed) return
      const range = this.editor.selection.getRange()
      if (range) {
        this.awareness.setLocalStateField('cursor', {
          index: range.index,
          length: range.length,
        })
      }
    }

    // 监听选区变化
    document.addEventListener('selectionchange', updateCursor)

    // 也监听 mouseup 和 keyup（有些情况下 selectionchange 不触发）
    this.container.addEventListener('mouseup', updateCursor)
    this.container.addEventListener('keyup', updateCursor)

    // 保存清理函数
    this._cleanupLocal = () => {
      document.removeEventListener('selectionchange', updateCursor)
      this.container.removeEventListener('mouseup', updateCursor)
      this.container.removeEventListener('keyup', updateCursor)
    }
  }

  private _cleanupLocal: (() => void) | null = null

  /** 渲染远端光标 */
  private setupRemoteCursorRender() {
    const handleChange = ({ added, updated, removed }: any) => {
      if (this.isDestroyed) return

      const states = this.awareness.getStates()
      const myClientID = this.awareness.clientID

      // 清理已移除用户的光标
      removed.forEach((clientID: number) => {
        this.removeCursor(clientID)
      })

      // 更新新增或变更的用户光标
      ;[...added, ...updated].forEach((clientID: number) => {
        if (clientID === myClientID) return
        const state = states.get(clientID)
        if (state?.cursor) {
          this.renderCursor(clientID, state)
        } else {
          this.removeCursor(clientID)
        }
      })
    }

    this.awareness.on('change', handleChange)

    // 初始渲染已有用户
    this.awareness.getStates().forEach((state: any, clientID: number) => {
      if (clientID !== this.awareness.clientID && state?.cursor) {
        this.renderCursor(clientID, state)
      }
    })

    // 监听滚动，更新光标位置（fixed 定位需要随滚动重新计算）
    const handleScroll = () => {
      if (this.isDestroyed) return
      const states = this.awareness.getStates()
      states.forEach((state: any, clientID: number) => {
        if (clientID !== this.awareness.clientID && state?.cursor) {
          this.renderCursor(clientID, state)
        }
      })
    }
    window.addEventListener('scroll', handleScroll, true)

    this._cleanupRemote = () => {
      this.awareness.off('change', handleChange)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }

  private _cleanupRemote: (() => void) | null = null

  /** 渲染单个用户的光标和选区 */
  private renderCursor(clientID: number, state: any) {
    const cursor = state.cursor
    if (!cursor) return

    const color = state.color || getUserColor(clientID)
    const label = state.name || getUserLabel(state)

    // 先移除旧的光标
    this.removeCursor(clientID)

    const range = indexToRange(this.container, cursor.index, cursor.length)
    if (!range) return

    const rects = range.getClientRects()
    const containerRect = this.container.getBoundingClientRect()

    if (cursor.length === 0) {
      // 只有光标（无选区）：渲染彩色竖线
      const rect = rects[0] || range.getBoundingClientRect()
      const cursorEl = document.createElement('div')
      cursorEl.className = 'remote-cursor'
      cursorEl.dataset.clientId = String(clientID)
      cursorEl.style.cssText = `
        position: fixed;
        width: 2px;
        height: ${rect.height || 20}px;
        background-color: ${color};
        left: ${rect.left}px;
        top: ${rect.top}px;
        pointer-events: none;
        z-index: 100;
        transition: all 0.1s ease;
      `

      // 用户名标签
      const labelEl = document.createElement('div')
      labelEl.className = 'remote-cursor-label'
      labelEl.textContent = label
      labelEl.style.cssText = `
        position: fixed;
        left: ${rect.left}px;
        top: ${rect.top - 18}px;
        background-color: ${color};
        color: #fff;
        font-size: 11px;
        padding: 1px 6px;
        border-radius: 3px;
        white-space: nowrap;
        pointer-events: none;
        z-index: 101;
      `

      document.body.appendChild(cursorEl)
      document.body.appendChild(labelEl)
      this.cursorElements.set(clientID, cursorEl)
      this.selectionElements.set(clientID, [labelEl])
    } else {
      // 有选区：渲染半透明背景
      const selectionEls: HTMLElement[] = []
      for (let i = 0; i < rects.length; i++) {
        const rect = rects[i]
        const selEl = document.createElement('div')
        selEl.className = 'remote-selection'
        selEl.dataset.clientId = String(clientID)
        selEl.style.cssText = `
          position: fixed;
          left: ${rect.left}px;
          top: ${rect.top}px;
          width: ${rect.width}px;
          height: ${rect.height}px;
          background-color: ${color}33;
          pointer-events: none;
          z-index: 99;
          border-radius: 2px;
        `
        document.body.appendChild(selEl)
        selectionEls.push(selEl)
      }

      // 选区末端的光标竖线
      const lastRect = rects[rects.length - 1]
      if (lastRect) {
        const cursorEl = document.createElement('div')
        cursorEl.className = 'remote-cursor'
        cursorEl.dataset.clientId = String(clientID)
        cursorEl.style.cssText = `
          position: fixed;
          width: 2px;
          height: ${lastRect.height || 20}px;
          background-color: ${color};
          left: ${lastRect.right}px;
          top: ${lastRect.top}px;
          pointer-events: none;
          z-index: 100;
        `
        document.body.appendChild(cursorEl)
        this.cursorElements.set(clientID, cursorEl)
      }

      this.selectionElements.set(clientID, selectionEls)
    }
  }

  /** 移除指定用户的光标和选区 */
  private removeCursor(clientID: number) {
    const cursorEl = this.cursorElements.get(clientID)
    if (cursorEl) {
      cursorEl.remove()
      this.cursorElements.delete(clientID)
    }

    const selEls = this.selectionElements.get(clientID)
    if (selEls) {
      selEls.forEach((el) => el.remove())
      this.selectionElements.delete(clientID)
    }
  }

  /** 清理所有光标 */
  private removeAllCursors() {
    this.cursorElements.forEach((el) => el.remove())
    this.cursorElements.clear()
    this.selectionElements.forEach((els) => els.forEach((el) => el.remove()))
    this.selectionElements.clear()
  }

  /** 销毁 */
  destroy() {
    this.isDestroyed = true
    this.removeAllCursors()
    this._cleanupLocal?.()
    this._cleanupRemote?.()
  }
}
