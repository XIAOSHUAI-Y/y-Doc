// @ts-nocheck
import { BlockBlot, ImageBlot, InlineBlot, TextBlot } from './blot'

/**
 * Renderer - Delta 到 DOM 的渲染器
 *
 * 支持增量渲染和块级格式（标题、列表、引用、代码块）。
 */
export class Renderer {
  constructor(container) {
    this.container = container
  }

  /**
   * @param {import('./delta').Delta} delta
   */
  render(delta) {
    const blocksData = this.deltaToBlocks(delta)
    const newNodes = this.generateDOMNodes(blocksData)

    // 完全重新渲染，避免增量 diff 导致的 DOM 残留问题
    this.container.innerHTML = ''
    for (const node of newNodes) {
      this.container.appendChild(node)
    }

    // 对代码块应用语法高亮
    this.container.querySelectorAll('.code-block-container').forEach(container => {
      this.highlightCodeBlock(container)
    })

  }

  /**
   * 将 Delta 解析为 block 描述数组
   * 每个 block 是 { nodes: [{text, attrs}], format: {header|list|blockquote|code-block} }
   */
  deltaToBlocks(delta) {
    const blocks = []
    let currentBlock = []
    let buffer = ''
    let bufferAttrs = null

    const flushBuffer = () => {
      if (buffer) {
        currentBlock.push({ text: buffer, attrs: bufferAttrs })
        buffer = ''
        bufferAttrs = null
      }
    }

    const flushBlock = (blockFormat = {}) => {
      flushBuffer()
      if (currentBlock.length === 0) {
        currentBlock.push({ text: '', attrs: null })
      }
      blocks.push({ nodes: currentBlock, format: blockFormat })
      currentBlock = []
    }

    for (const op of delta.ops) {
      // 处理 embed（图片等非文本 insert）
      if (typeof op.insert !== 'string') {
        flushBuffer()
        currentBlock.push({ embed: op.insert })
        continue
      }

      const opAttrs = op.attributes && Object.keys(op.attributes).length > 0 ? op.attributes : null

      // 提取块级格式属性
      const blockFormat = {}
      let inlineAttrs = opAttrs ? { ...opAttrs } : null
      if (inlineAttrs) {
        if (inlineAttrs.header !== undefined) {
          blockFormat.header = inlineAttrs.header
          delete inlineAttrs.header
        }
        if (inlineAttrs.list !== undefined) {
          blockFormat.list = inlineAttrs.list
          delete inlineAttrs.list
        }
        if (inlineAttrs.blockquote !== undefined) {
          blockFormat.blockquote = inlineAttrs.blockquote
          delete inlineAttrs.blockquote
        }
        if (inlineAttrs['code-block'] !== undefined) {
          blockFormat['code-block'] = inlineAttrs['code-block']
          delete inlineAttrs['code-block']
        }
        if (inlineAttrs.indent !== undefined) {
          blockFormat.indent = inlineAttrs.indent
          delete inlineAttrs.indent
        }
        if (Object.keys(inlineAttrs).length === 0) inlineAttrs = null
      }

      for (const char of op.insert) {
        if (char === '\n') {
          flushBlock(Object.keys(blockFormat).length > 0 ? blockFormat : {})
          continue
        }
        const sameAttrs = (bufferAttrs === null && inlineAttrs === null) ||
          (bufferAttrs && inlineAttrs && JSON.stringify(bufferAttrs) === JSON.stringify(inlineAttrs))
        if (sameAttrs) {
          buffer += char
        } else {
          flushBuffer()
          buffer = char
          bufferAttrs = inlineAttrs
        }
      }
    }

    flushBuffer()
    if (currentBlock.length > 0 || blocks.length === 0) {
      blocks.push({ nodes: currentBlock, format: {} })
    }

    return blocks
  }

  /**
   * 根据 block 描述生成 DOM 节点列表
   * 列表项会被包裹在 ul/ol 中
   */
  generateDOMNodes(blocksData) {
    const nodes = []
    let currentList = null

    for (let i = 0; i < blocksData.length; i++) {
      const block = blocksData[i]

      if (block.format.list) {
        if (!currentList || currentList.dataset.listType !== block.format.list) {
          currentList = document.createElement(block.format.list === 'ordered' ? 'ol' : 'ul')
          currentList.dataset.listType = block.format.list
          nodes.push(currentList)
        }
        const li = document.createElement('li')
        if (block.format.indent !== undefined) {
          li.dataset.indent = String(block.format.indent)
        }
        this.fillBlock(li, block.nodes)
        currentList.appendChild(li)
      } else if (block.format['code-block']) {
        currentList = null
        const codeBlocks = []
        let j = i
        while (j < blocksData.length && blocksData[j].format['code-block']) {
          codeBlocks.push(blocksData[j])
          j++
        }

        const wrapper = document.createElement('div')
        wrapper.className = 'code-block-wrapper'

        const header = document.createElement('div')
        header.className = 'code-block-header'
        header.contentEditable = 'false'

        const toggle = document.createElement('span')
        toggle.className = 'code-block-toggle'
        toggle.textContent = '▼'

        const title = document.createElement('span')
        title.className = 'code-block-title'
        title.textContent = '代码块'

        const actions = document.createElement('div')
        actions.className = 'code-block-actions'

        const select = document.createElement('select')
        select.className = 'code-block-lang'
        const languages = [
          ['plaintext', 'Plaintext'],
          ['javascript', 'JavaScript'],
          ['python', 'Python'],
          ['bash', 'Bash'],
          ['java', 'Java'],
          ['cpp', 'C++'],
          ['css', 'CSS'],
          ['html', 'HTML'],
          ['json', 'JSON'],
          ['typescript', 'TypeScript'],
          ['rust', 'Rust'],
          ['go', 'Go'],
          ['sql', 'SQL'],
          ['yaml', 'YAML'],
          ['markdown', 'Markdown'],
          ['shell', 'Shell']
        ]
        for (const [value, label] of languages) {
          const option = document.createElement('option')
          option.value = value
          option.textContent = label
          if (value === (block.format['code-block'] || 'plaintext')) option.selected = true
          select.appendChild(option)
        }

        const divider = document.createElement('span')
        divider.className = 'code-block-divider'
        divider.textContent = '|'

        const copyBtn = document.createElement('button')
        copyBtn.className = 'code-block-copy'
        copyBtn.textContent = '复制'

        actions.appendChild(select)
        actions.appendChild(divider)
        actions.appendChild(copyBtn)
        header.appendChild(toggle)
        header.appendChild(title)
        header.appendChild(actions)

        const body = document.createElement('div')
        body.className = 'code-block-body'

        const lineNumbers = document.createElement('div')
        lineNumbers.className = 'line-numbers'
        lineNumbers.contentEditable = 'false'

        const container = document.createElement('div')
        container.className = 'code-block-container'
        container.setAttribute('spellcheck', 'false')
        container.dataset.lang = block.format['code-block'] || 'plaintext'

        for (let k = 0; k < codeBlocks.length; k++) {
          const cb = codeBlocks[k]
          const line = BlockBlot.create(cb.format)
          this.fillBlock(line, cb.nodes)
          container.appendChild(line)

          if (k > 0) lineNumbers.appendChild(document.createElement('br'))
          lineNumbers.appendChild(document.createTextNode(String(k + 1)))
        }

        body.appendChild(lineNumbers)
        body.appendChild(container)
        wrapper.appendChild(header)
        wrapper.appendChild(body)

        nodes.push(wrapper)
        i = j - 1
      } else {
        currentList = null
        const el = BlockBlot.create(block.format)
        this.fillBlock(el, block.nodes)
        nodes.push(el)
      }
    }

    return nodes
  }

  /**
   * 填充 block 元素
   */
  fillBlock(blockEl, blockData) {
    for (const node of blockData) {
      if (node.embed) {
        if (node.embed.image) {
          blockEl.appendChild(ImageBlot.create(node.embed.image))
        }
        continue
      }
      if (node.attrs && Object.keys(node.attrs).length > 0) {
        blockEl.appendChild(InlineBlot.create(node.text, node.attrs))
      } else {
        blockEl.appendChild(TextBlot.create(node.text))
      }
    }
    // 如果 block 没有任何可见内容（包括空文本节点），插入 <br> 占位
    if (!blockEl.hasChildNodes() ||
        (blockEl.textContent === '' && blockEl.querySelectorAll('*').length === 0)) {
      blockEl.innerHTML = ''
      blockEl.appendChild(document.createElement('br'))
    }
  }

  /**
   * 对代码块容器应用语法高亮
   * @param {HTMLElement} container - .code-block-container 元素
   */
  highlightCodeBlock(container) {
    const lines = Array.from(container.querySelectorAll('.code-block'))
    const lang = container.dataset.lang || 'plaintext'
    if (lang === 'plaintext' || typeof window === 'undefined' || !window.hljs) return

    const fullText = lines.map(l => l.textContent).join('\n')
    let result
    try {
      result = window.hljs.highlight(fullText, { language: lang })
    } catch (e) {
      return
    }

    const temp = document.createElement('div')
    temp.innerHTML = result.value

    const highlightedLines = this._parseHighlightedHTML(temp, lines.length)

    lines.forEach((line, i) => {
      line.innerHTML = ''
      const segments = highlightedLines[i]
      if (!segments || segments.length === 0) {
        line.appendChild(document.createElement('br'))
        return
      }
      for (const seg of segments) {
        if (seg.className) {
          const span = document.createElement('span')
          span.className = seg.className
          span.textContent = seg.text
          line.appendChild(span)
        } else {
          line.appendChild(document.createTextNode(seg.text))
        }
      }
      if (!line.hasChildNodes()) {
        line.appendChild(document.createElement('br'))
      }
    })
  }

  /**
   * 解析 hljs 高亮后的 HTML，按行提取 token 段
   * @param {HTMLElement} root - 临时容器
   * @param {number} expectedLineCount - 期望行数
   * @returns {Array<Array<{text: string, className: string|null}>>}
   */
  _parseHighlightedHTML(root, expectedLineCount) {
    const lines = Array.from({ length: expectedLineCount }, () => [])
    let currentLine = 0

    const walk = (node, className) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const parts = node.textContent.split('\n')
        parts.forEach((part, i) => {
          if (i > 0 && currentLine < expectedLineCount - 1) {
            currentLine++
          }
          if (currentLine < lines.length) {
            lines[currentLine].push({ text: part, className })
          }
        })
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const cls = node.className || ''
        const newClass = cls.split(' ').find(c => c.startsWith('hljs-')) || className
        for (const child of node.childNodes) {
          walk(child, newClass)
        }
      }
    }

    for (const child of root.childNodes) {
      walk(child, null)
    }
    return lines
  }

  /**
   * 比较两个 DOM 节点是否等效
   */
  nodesEqual(a, b) {
    if (a.tagName !== b.tagName) return false
    if (a.innerHTML !== b.innerHTML) return false
    return true
  }
}
