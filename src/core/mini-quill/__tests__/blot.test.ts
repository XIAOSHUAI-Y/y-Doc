import { describe, it, expect } from 'vitest'
import { TextBlot, InlineBlot, ImageBlot, BlockBlot } from '../blot'

describe('TextBlot', () => {
  it('should create a text node for plain text', () => {
    const node = TextBlot.create('hello')
    expect(node.nodeType).toBe(Node.TEXT_NODE)
    expect(node.textContent).toBe('hello')
  })

  it('should handle empty string', () => {
    const node = TextBlot.create('')
    expect(node.nodeType).toBe(Node.TEXT_NODE)
    expect(node.textContent).toBe('')
  })

  it('should create a wrapper span for text with newlines', () => {
    const node = TextBlot.create('hello\nworld') as HTMLElement
    expect(node.tagName).toBe('SPAN')
    expect(node.childNodes.length).toBe(3)
    expect(node.childNodes[0].textContent).toBe('hello')
    expect((node.childNodes[1] as HTMLElement).tagName).toBe('BR')
    expect(node.childNodes[2].textContent).toBe('world')
  })

  it('should handle text ending with newline', () => {
    const node = TextBlot.create('hello\n') as HTMLElement
    expect(node.tagName).toBe('SPAN')
    expect(node.childNodes[0].textContent).toBe('hello')
    expect((node.childNodes[1] as HTMLElement).tagName).toBe('BR')
  })
})

describe('InlineBlot', () => {
  it('should create a span for plain text', () => {
    const el = InlineBlot.create('hello')
    expect(el.tagName).toBe('SPAN')
    expect(el.textContent).toBe('hello')
  })

  it('should apply bold style', () => {
    const el = InlineBlot.create('hello', { bold: true })
    expect(el.style.fontWeight).toBe('bold')
  })

  it('should apply italic style', () => {
    const el = InlineBlot.create('hello', { italic: true })
    expect(el.style.fontStyle).toBe('italic')
  })

  it('should apply color style', () => {
    const el = InlineBlot.create('hello', { color: '#ff0000' })
    expect(el.style.color).toBe('#ff0000')
  })

  it('should apply underline decoration', () => {
    const el = InlineBlot.create('hello', { underline: true })
    expect(el.style.textDecoration).toBe('underline')
  })

  it('should apply strike decoration', () => {
    const el = InlineBlot.create('hello', { strike: true })
    expect(el.style.textDecoration).toBe('line-through')
  })

  it('should combine underline and strike', () => {
    const el = InlineBlot.create('hello', { underline: true, strike: true })
    expect(el.style.textDecoration).toBe('underline line-through')
  })

  it('should create an anchor for links', () => {
    const el = InlineBlot.create('click', { link: 'https://example.com' })
    expect(el.tagName).toBe('A')
    expect(el.getAttribute('href')).toBe('https://example.com')
    expect(el.getAttribute('target')).toBe('_blank')
    expect(el.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('should handle text with newlines', () => {
    const el = InlineBlot.create('hello\nworld')
    expect(el.childNodes.length).toBe(3)
    expect(el.childNodes[0].textContent).toBe('hello')
    expect((el.childNodes[1] as HTMLElement).tagName).toBe('BR')
    expect(el.childNodes[2].textContent).toBe('world')
  })

  it('should handle empty text', () => {
    const el = InlineBlot.create('')
    expect(el.textContent).toBe('')
  })

  it('should apply multiple styles together', () => {
    const el = InlineBlot.create('hello', {
      bold: true,
      italic: true,
      color: '#0000ff',
      underline: true,
    })
    expect(el.style.fontWeight).toBe('bold')
    expect(el.style.fontStyle).toBe('italic')
    expect(el.style.color).toBe('#0000ff')
    expect(el.style.textDecoration).toBe('underline')
  })
})

describe('ImageBlot', () => {
  it('should create an img element', () => {
    const img = ImageBlot.create('https://example.com/img.png')
    expect(img.tagName).toBe('IMG')
    expect(img.src).toBe('https://example.com/img.png')
  })

  it('should set max-width style', () => {
    const img = ImageBlot.create('https://example.com/img.png')
    expect(img.style.maxWidth).toBe('100%')
  })
})

describe('BlockBlot', () => {
  it('should create a div for default block', () => {
    const el = BlockBlot.create()
    expect(el.tagName).toBe('DIV')
  })

  it('should create h1 for header 1', () => {
    const el = BlockBlot.create({ header: 1 })
    expect(el.tagName).toBe('H1')
  })

  it('should create h2 for header 2', () => {
    const el = BlockBlot.create({ header: 2 })
    expect(el.tagName).toBe('H2')
  })

  it('should create h3 for header 3', () => {
    const el = BlockBlot.create({ header: 3 })
    expect(el.tagName).toBe('H3')
  })

  it('should create h6 for header 6', () => {
    const el = BlockBlot.create({ header: 6 })
    expect(el.tagName).toBe('H6')
  })

  it('should create blockquote', () => {
    const el = BlockBlot.create({ blockquote: true })
    expect(el.tagName).toBe('BLOCKQUOTE')
  })

  it('should create code-block div', () => {
    const el = BlockBlot.create({ 'code-block': true })
    expect(el.tagName).toBe('DIV')
    expect(el.className).toBe('code-block')
    expect(el.getAttribute('spellcheck')).toBe('false')
  })

  it('should create code-block div with language', () => {
    const el = BlockBlot.create({ 'code-block': 'javascript' })
    expect(el.tagName).toBe('DIV')
    expect(el.className).toBe('code-block')
  })
})
