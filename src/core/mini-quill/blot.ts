// @ts-nocheck
/**
 * TextBlot - 纯文本节点
 *
 * 用于创建不包含任何格式的纯文本 DOM 节点。
 */
export class TextBlot {
  /**
   * 创建纯文本节点
   * @param {string} text
   * @returns {Text}
   */
  static create(text) {
    return document.createTextNode(text)
  }
}

/**
 * InlineBlot - 内联格式文本节点
 *
 * 用于创建带有内联样式（加粗、斜体、颜色、下划线、删除线）的文本节点。
 * 支持的属性：bold, italic, color, underline, strike
 */
export class InlineBlot {
  /**
   * 创建带格式的内联元素
   * @param {string} text - 文本内容
   * @param {import('../types.d.ts').InlineAttributes} [attrs={}] - 格式属性
   * @returns {HTMLElement}
   */
  static create(text, attrs = {}) {
    const el = attrs.link ? document.createElement('a') : document.createElement('span')
    if (attrs.link) {
      el.href = attrs.link
      el.target = '_blank'
      el.rel = 'noopener noreferrer'
    }
    el.textContent = text || ''
    if (attrs.bold) el.style.fontWeight = 'bold'
    if (attrs.italic) el.style.fontStyle = 'italic'
    if (attrs.color) el.style.color = attrs.color

    const decorations = []
    if (attrs.underline) decorations.push('underline')
    if (attrs.strike) decorations.push('line-through')
    if (decorations.length > 0) el.style.textDecoration = decorations.join(' ')

    return el
  }
}

/**
 * ImageBlot - 图片嵌入节点
 *
 * 用于创建图片 DOM 节点。
 */
export class ImageBlot {
  /**
   * 创建图片元素
   * @param {string} url
   * @returns {HTMLImageElement}
   */
  static create(url) {
    const img = document.createElement('img')
    img.src = url
    img.style.maxWidth = '100%'
    return img
  }
}

/**
 * BlockBlot - 块级元素节点
 *
 * 用于创建块级元素（如段落）。在当前实现中为每个换行创建新的块。
 */
export class BlockBlot {
  /**
   * 创建块级元素
   * @param {Object} [format={}] - 块级格式属性
   * @returns {HTMLElement}
   */
  static create(format = {}) {
    let el
    if (format.header) {
      el = document.createElement(`h${format.header}`)
    } else if (format.blockquote) {
      el = document.createElement('blockquote')
    } else if (format['code-block']) {
      el = document.createElement('div')
      el.className = 'code-block'
      el.setAttribute('spellcheck', 'false')
    } else {
      el = document.createElement('div')
    }
    return el
  }
}
