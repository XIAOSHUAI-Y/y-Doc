// @ts-nocheck
/**
 * SelectionManager - 选区管理器
 *
 * 负责同步和跟踪用户在编辑器中的文本选区。
 * 使用浏览器原生 Selection API 和 TreeWalker 来实现：
 * 1. 从 DOM 获取当前选区范围
 * 2. 将 DOM 位置转换为 Delta 的文本索引
 * 3. 提供给 Formatter 使用以应用格式
 *
 * 位置计算使用 TreeWalker 遍历所有文本节点，累加其长度，
 * 直到找到目标节点，从而得到精确的字符索引。
 */
export class SelectionManager {
  /**
   * @param {HTMLElement} container - 编辑器容器元素
   */
  constructor(container) {
    this.container = container
    this.index = 0  // 选区起始位置的字符索引
    this.length = 0 // 选区的字符长度
    this.savedIndex = 0   // 用于工具栏点击前保存选区（数字，不引用 DOM 节点）
    this.savedLength = 0
  }

  /**
   * 从 DOM 同步选区信息到内部状态
   *
   * 当用户在编辑器中进行选择或移动光标时调用。
   * 读取浏览器原生 Selection，计算对应的文本索引。
   */
  syncFromDOM() {
    // 合并浏览器可能分割的文本节点，确保 DOM 结构与 Delta 一致
    this.container.normalize()

    const selection = window.getSelection()

    // 没有选区时直接返回
    if (selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)

    // 确保选区起点在编辑器容器内
    if (!this.container.contains(range.startContainer)) return

    // 计算选区起点的字符索引
    this.index = this.getIndexFromNode(
      range.startContainer,
      range.startOffset
    )

    // 默认选区长度为0（折叠选区，即只有光标）
    this.length = 0

    // 如果选区未折叠（非光标状态），计算结束位置
    if (!range.collapsed) {
      const endIndex = this.getIndexFromNode(
        range.endContainer,
        range.endOffset
      )
      // 选区长度 = 结束索引 - 起始索引
      this.length = endIndex - this.index
    }
  }

  /**
   * 从 DOM 节点位置计算对应的文本字符索引
   *
   * 使用 TreeWalker 遍历容器内所有文本节点，累加前面文本的长度，
   * 当找到目标节点时，返回已累加的长度加上节点内的偏移量。
   *
   * @param {Node} node - DOM 文本节点
   * @param {number} offset - 在节点内的字符偏移
   * @returns {number} 对应的文本字符索引
   *
   * @example
   * // 如果容器内容是 "Hello World"
   * // getIndexFromNode(textNodeOfHello, 3) 返回 3
   * // getIndexFromNode(textNodeOfWorld, 0) 返回 6
   */
  getIndexFromNode(node, offset) {
    // 如果 node 是元素节点且不是 IMG，先尝试标准化为文本节点
    if (node.nodeType !== Node.TEXT_NODE && node.tagName !== 'IMG') {
      const normalized = this._normalizeToTextNode(node, offset)
      node = normalized.node
      offset = normalized.offset
    }

    let index = 0
    const walker = document.createTreeWalker(
      this.container,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      (node) => {
        if (node.nodeType === Node.ELEMENT_NODE && node.contentEditable === 'false') {
          return NodeFilter.FILTER_REJECT
        }
        if (node.nodeType === Node.TEXT_NODE) {
          let parent = node.parentElement
          while (parent && parent !== this.container) {
            if (parent.contentEditable === 'false') return NodeFilter.FILTER_SKIP
            parent = parent.parentElement
          }
          return NodeFilter.FILTER_ACCEPT
        }
        if (node.nodeType === Node.ELEMENT_NODE && (node.tagName === 'BR' || node.tagName === 'IMG')) return NodeFilter.FILTER_ACCEPT
        return NodeFilter.FILTER_SKIP
      }
    )
    let prevBlock = null

    while (walker.nextNode()) {
      const currentNode = walker.currentNode
      const currentBlock = this._getBlock(currentNode)

      // 跨 block 时累加换行符长度（Delta 索引包含 \n，DOM 文本节点不包含）
      if (prevBlock && prevBlock !== currentBlock) {
        index += 1
      }
      prevBlock = currentBlock

      if (currentNode.nodeType === Node.ELEMENT_NODE) {
        if (currentNode.tagName === 'BR') {
          // BR 元素：padding BR（空块中的占位符）不计入索引
          if (!this._isPaddingBr(currentNode)) {
            index += 1
          }
        } else if (currentNode.tagName === 'IMG') {
          // IMG embed 占一个字符长度
          if (currentNode === node) {
            return index + offset
          }
          index += 1
        }
        continue
      }

      if (currentNode === node) {
        return index + offset
      }
      index += currentNode.textContent.length
    }
    return index
  }

  /** 获取文本节点所在的 block（container 的直接子元素） */
  _getBlock(node) {
    let el = node.parentElement
    while (el && el !== this.container) {
      // 代码块内的每一行 .code-block 应作为独立 block
      if (el.classList && el.classList.contains('code-block')) return el
      // 列表项 <li> 应作为独立 block，否则多个 <li> 会被当成同一个 block
      if (el.tagName === 'LI') return el
      // blockquote 内的每个 <div> 行应作为独立 block，否则换行符索引丢失
      if (el.tagName === 'DIV' && el.parentElement && el.parentElement.tagName === 'BLOCKQUOTE') return el
      if (el.parentElement === this.container) return el
      el = el.parentElement
    }
    return el
  }

  /**
   * 判断 BR 是否是空块中的占位符（padding BR）
   * 空块如 <div><br></div>，其 BR 不应计入字符索引
   */
  _isPaddingBr(node) {
    if (node.tagName !== 'BR') return false
    const parent = node.parentElement
    if (!parent) return false
    const children = Array.from(parent.childNodes)
    return children.every(
      (n) => n === node || (n.nodeType === Node.TEXT_NODE && !n.textContent)
    )
  }

  /**
   * 将元素节点位置标准化为文本节点位置
   * @param {Node} node - 元素节点
   * @param {number} offset - 子节点索引
   * @returns {{node: Text, offset: number}}
   */
  _normalizeToTextNode(node, offset) {
    const child = node.childNodes[offset]
    if (child) {
      if (child.nodeType === Node.TEXT_NODE) {
        return { node: child, offset: 0 }
      }
      if (child.tagName === 'IMG') {
        return { node: child, offset: 0 }
      }
      const walker = document.createTreeWalker(child, NodeFilter.SHOW_TEXT)
      const first = walker.nextNode()
      if (first) return { node: first, offset: 0 }
      let sibling = child.nextSibling
      while (sibling) {
        if (sibling.nodeType === Node.TEXT_NODE) return { node: sibling, offset: 0 }
        if (sibling.tagName === 'IMG') return { node: sibling, offset: 0 }
        const w = document.createTreeWalker(sibling, NodeFilter.SHOW_TEXT)
        const t = w.nextNode()
        if (t) return { node: t, offset: 0 }
        sibling = sibling.nextSibling
      }
    }
    // 如果元素内只有一个 BR 占位符，返回该 BR，避免 syncFromDOM 时 range 设在空 div 上无法匹配
    const children = Array.from(node.childNodes)
    if (children.length === 1 && children[0].tagName === 'BR') {
      return { node: children[0], offset: 0 }
    }
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT)
    let last = null
    while (walker.nextNode()) last = walker.currentNode
    if (last) return { node: last, offset: last.textContent.length }
    return { node, offset }
  }

  /**
   * 保存当前内部选区状态（用数字，不引用 DOM 节点）
   */
  save() {
    this.savedIndex = this.index
    this.savedLength = this.length
  }

  /**
   * 恢复上次保存的选区状态到浏览器
   */
  restore() {
    if (this.savedLength > 0) {
      this.setSelection(this.savedIndex, this.savedLength)
    }
  }

  /**
   * 获取当前选区范围
   * @returns {import('../types.d.ts').Range} 选区的起始索引和长度
   */
  getRange() {
    return {
      index: this.index,
      length: this.length
    }
  }

  /**
   * 将选区设置到指定的文本索引位置
   * @param {number} index - 起始字符索引
   * @param {number} length - 选区长度（默认 0）
   */
  setSelection(index, length = 0) {
    let currentIndex = 0
    const walker = document.createTreeWalker(
      this.container,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      (node) => {
        if (node.nodeType === Node.ELEMENT_NODE && node.contentEditable === 'false') {
          return NodeFilter.FILTER_REJECT
        }
        if (node.nodeType === Node.TEXT_NODE) {
          let parent = node.parentElement
          while (parent && parent !== this.container) {
            if (parent.contentEditable === 'false') return NodeFilter.FILTER_SKIP
            parent = parent.parentElement
          }
          return NodeFilter.FILTER_ACCEPT
        }
        if (node.nodeType === Node.ELEMENT_NODE && (node.tagName === 'BR' || node.tagName === 'IMG')) return NodeFilter.FILTER_ACCEPT
        return NodeFilter.FILTER_SKIP
      }
    )

    let startNode = null
    let startOffset = 0
    let endNode = null
    let endOffset = 0
    let prevBlock = null

    while (walker.nextNode()) {
      const node = walker.currentNode
      const currentBlock = this._getBlock(node)

      // 跨 block 时累加换行符长度
      if (prevBlock && prevBlock !== currentBlock) {
        currentIndex += 1
      }
      prevBlock = currentBlock

      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName === 'BR') {
          const brLength = this._isPaddingBr(node) ? 0 : 1
          // BR 元素对应一个换行符位置（padding BR 除外）
          if (startNode === null && currentIndex + brLength >= index) {
            // 起始位置落在这个 <br> 上，放到前一个文本节点末尾或当前位置
            const prevText = this._getPrevTextNode(node)
            if (prevText && prevText.parentElement === node.parentElement) {
              startNode = prevText
              startOffset = prevText.textContent.length
            } else if (brLength === 0) {
              // padding BR（空 block 的占位符）：把光标放在 BR 的 parent div 上，
              // offset 为 BR 的索引。浏览器通常会把 range 自动调整到 BR 上。
              startNode = node.parentElement
              startOffset = Array.from(node.parentElement.childNodes).indexOf(node)
            } else {
              startNode = node.parentElement
              startOffset = Array.from(node.parentElement.childNodes).indexOf(node)
            }
          }
          if (endNode === null && currentIndex + brLength >= index + length) {
            const prevText = this._getPrevTextNode(node)
            if (prevText && prevText.parentElement === node.parentElement) {
              endNode = prevText
              endOffset = prevText.textContent.length
            } else if (brLength === 0) {
              endNode = node.parentElement
              endOffset = Array.from(node.parentElement.childNodes).indexOf(node)
            } else {
              endNode = node.parentElement
              endOffset = Array.from(node.parentElement.childNodes).indexOf(node)
            }
            break
          }
          currentIndex += brLength
          continue
        }

        if (node.tagName === 'IMG') {
          const imgIndex = Array.from(node.parentElement.childNodes).indexOf(node)
          if (startNode === null && currentIndex + 1 >= index) {
            if (index === currentIndex) {
              // 光标在图片前
              startNode = node
              startOffset = 0
            } else {
              // 光标在图片后
              startNode = node.parentElement
              startOffset = imgIndex + 1
            }
          }
          if (endNode === null && currentIndex + 1 >= index + length) {
            if (index + length === currentIndex) {
              endNode = node
              endOffset = 0
            } else {
              endNode = node.parentElement
              endOffset = imgIndex + 1
            }
            break
          }
          currentIndex += 1
          continue
        }
      }

      const nodeLength = node.textContent.length

      // 查找起始位置
      if (startNode === null && currentIndex + nodeLength >= index) {
        startNode = node
        startOffset = index - currentIndex
      }

      // 查找结束位置
      if (endNode === null && currentIndex + nodeLength >= index + length) {
        endNode = node
        endOffset = index + length - currentIndex
        break
      }

      currentIndex += nodeLength
    }

    // 处理边界情况：如果找不到对应节点，放在最后一个可用位置
    if (!startNode) {
      const lastText = this._getLastTextNode()
      if (lastText) {
        startNode = lastText
        startOffset = lastText.textContent.length
      } else {
        return
      }
    }
    if (!endNode) {
      endNode = startNode
      endOffset = startOffset
    }

    const range = document.createRange()
    range.setStart(startNode, startOffset)
    range.setEnd(endNode, endOffset)

    const selection = window.getSelection()
    selection.removeAllRanges()
    selection.addRange(range)

    // 同步内部状态
    this.index = index
    this.length = length
  }

  /** 获取容器内最后一个文本节点 */
  _getLastTextNode() {
    const walker = document.createTreeWalker(
      this.container,
      NodeFilter.SHOW_TEXT
    )
    let last = null
    while (walker.nextNode()) {
      last = walker.currentNode
    }
    return last
  }

  /** 获取给定节点之前的最近文本节点（仅在同一父元素内查找） */
  _getPrevTextNode(node) {
    let sibling = node.previousSibling
    while (sibling) {
      if (sibling.nodeType === Node.TEXT_NODE) return sibling
      const walker = document.createTreeWalker(sibling, NodeFilter.SHOW_TEXT)
      const last = walker.nextNode()
      if (last) return last
      sibling = sibling.previousSibling
    }
    return null
  }
}
