// @ts-nocheck
import { Delta } from './delta'

/**
 * 从 DOM 同步内容到 Delta
 * 解析容器 DOM 结构，保留内联格式（bold、italic、underline、strike、color）
 */
export function syncFromDOM(editor: any) {
  const container = editor.container
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

  /** 处理单个 block */
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
      while (parent && parent !== block && parent !== container) {
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

    if (ops.length === 0 || ops[ops.length - 1].insert !== '\n') {
      pushNewline()
    }
  }

  // 收集所有顶级块级节点
  const blocks = []
  for (const node of container.childNodes) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      blocks.push(node)
    } else if (node.nodeType === Node.TEXT_NODE && node.textContent && node.textContent.trim()) {
      const wrap = document.createElement('div')
      wrap.textContent = node.textContent
      blocks.push(wrap)
    }
  }

  if (blocks.length === 0) {
    const content = container.textContent || ''
    editor.delta = new Delta([{ insert: content + '\n' }])
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

  editor.recordHistory()
  editor.delta = new Delta(ops)
}
