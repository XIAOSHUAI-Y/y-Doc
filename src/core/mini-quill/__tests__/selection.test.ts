import { describe, it, expect, beforeEach } from 'vitest'
import { SelectionManager } from '../selection'

describe('SelectionManager', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    container.contentEditable = 'true'
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  describe('constructor', () => {
    it('should initialize with default values', () => {
      const sm = new SelectionManager(container)
      expect(sm.container).toBe(container)
      expect(sm.index).toBe(0)
      expect(sm.length).toBe(0)
      expect(sm.savedIndex).toBe(0)
      expect(sm.savedLength).toBe(0)
    })
  })

  describe('getRange', () => {
    it('should return current index and length', () => {
      const sm = new SelectionManager(container)
      sm.index = 5
      sm.length = 3
      const range = sm.getRange()
      expect(range).toEqual({ index: 5, length: 3 })
    })
  })

  describe('save / restore', () => {
    it('should save current selection state', () => {
      const sm = new SelectionManager(container)
      sm.index = 10
      sm.length = 5
      sm.save()
      expect(sm.savedIndex).toBe(10)
      expect(sm.savedLength).toBe(5)
    })

    it('should restore saved selection with length > 0', () => {
      const sm = new SelectionManager(container)
      container.innerHTML = '<div>Hello World</div>'
      sm.index = 0
      sm.length = 5
      sm.save()

      sm.index = 10
      sm.length = 0

      sm.restore()
      expect(sm.index).toBe(0)
      expect(sm.length).toBe(5)
    })

    it('should not restore if saved length is 0', () => {
      const sm = new SelectionManager(container)
      sm.index = 5
      sm.length = 0
      sm.save()
      sm.index = 10
      sm.restore()
      // restore 不执行任何操作因为 savedLength === 0
      expect(sm.index).toBe(10)
    })
  })

  describe('getIndexFromNode', () => {
    it('should return 0 for first text node at offset 0', () => {
      container.innerHTML = '<div>Hello World</div>'
      const textNode = container.querySelector('div')!.firstChild as Text
      const sm = new SelectionManager(container)
      const index = sm.getIndexFromNode(textNode, 0)
      expect(index).toBe(0)
    })

    it('should return correct index for text node with offset', () => {
      container.innerHTML = '<div>Hello World</div>'
      const textNode = container.querySelector('div')!.firstChild as Text
      const sm = new SelectionManager(container)
      const index = sm.getIndexFromNode(textNode, 5)
      expect(index).toBe(5)
    })

    it('should account for newline between blocks', () => {
      container.innerHTML = '<div>Hello</div><div>World</div>'
      const secondDiv = container.querySelectorAll('div')[1]
      const textNode = secondDiv.firstChild as Text
      const sm = new SelectionManager(container)
      const index = sm.getIndexFromNode(textNode, 0)
      // "Hello" (5 chars) + "\n" (1) = 6
      expect(index).toBe(6)
    })

    it('should handle multiple blocks', () => {
      container.innerHTML = '<div>Hi</div><div>there</div><div>world</div>'
      const thirdDiv = container.querySelectorAll('div')[2]
      const textNode = thirdDiv.firstChild as Text
      const sm = new SelectionManager(container)
      const index = sm.getIndexFromNode(textNode, 0)
      // "Hi" (2) + "\n" (1) + "there" (5) + "\n" (1) = 9
      expect(index).toBe(9)
    })

    it('should handle empty block with padding BR', () => {
      container.innerHTML = '<div><br></div>'
      const br = container.querySelector('br')!
      const sm = new SelectionManager(container)
      const index = sm.getIndexFromNode(br, 0)
      // padding BR 不计入索引
      expect(index).toBe(0)
    })

    it('should handle image element', () => {
      container.innerHTML = '<div>hello<img src="test.png">world</div>'
      const img = container.querySelector('img')!
      const sm = new SelectionManager(container)
      const index = sm.getIndexFromNode(img, 0)
      // "hello" (5 chars)
      expect(index).toBe(5)
    })

    it('should handle element node by normalizing to text node', () => {
      container.innerHTML = '<div><span>text</span></div>'
      const span = container.querySelector('span')!
      const sm = new SelectionManager(container)
      const index = sm.getIndexFromNode(span, 0)
      expect(index).toBe(0)
    })
  })

  describe('syncFromDOM', () => {
    it('should sync collapsed selection to index', () => {
      container.innerHTML = '<div>Hello World</div>'
      const textNode = container.querySelector('div')!.firstChild as Text

      const selection = window.getSelection()!
      const range = document.createRange()
      range.setStart(textNode, 6)
      range.setEnd(textNode, 6)
      selection.removeAllRanges()
      selection.addRange(range)

      const sm = new SelectionManager(container)
      sm.syncFromDOM()

      expect(sm.index).toBe(6)
      expect(sm.length).toBe(0)
    })

    it('should sync non-collapsed selection', () => {
      container.innerHTML = '<div>Hello World</div>'
      const textNode = container.querySelector('div')!.firstChild as Text

      const selection = window.getSelection()!
      const range = document.createRange()
      range.setStart(textNode, 0)
      range.setEnd(textNode, 5)
      selection.removeAllRanges()
      selection.addRange(range)

      const sm = new SelectionManager(container)
      sm.syncFromDOM()

      expect(sm.index).toBe(0)
      expect(sm.length).toBe(5)
    })

    it('should return early if no selection', () => {
      window.getSelection()!.removeAllRanges()

      const sm = new SelectionManager(container)
      sm.index = 10
      sm.syncFromDOM()

      // 没有选区时，syncFromDOM 直接返回，index 不变
      expect(sm.index).toBe(10)
    })
  })

  describe('setSelection', () => {
    it('should set cursor at beginning', () => {
      container.innerHTML = '<div>Hello World</div>'
      const sm = new SelectionManager(container)
      sm.setSelection(0, 0)

      const selection = window.getSelection()!
      expect(selection.rangeCount).toBe(1)
      expect(sm.index).toBe(0)
      expect(sm.length).toBe(0)
    })

    it('should set cursor at specific index', () => {
      container.innerHTML = '<div>Hello World</div>'
      const sm = new SelectionManager(container)
      sm.setSelection(6, 0)

      const selection = window.getSelection()!
      expect(selection.rangeCount).toBe(1)
      expect(sm.index).toBe(6)
    })

    it('should set selection range', () => {
      container.innerHTML = '<div>Hello World</div>'
      const sm = new SelectionManager(container)
      sm.setSelection(0, 5)

      expect(sm.index).toBe(0)
      expect(sm.length).toBe(5)

      const selection = window.getSelection()!
      const range = selection.getRangeAt(0)
      expect(range.toString()).toBe('Hello')
    })

    it('should handle multi-block selection', () => {
      container.innerHTML = '<div>Hello</div><div>World</div>'
      const sm = new SelectionManager(container)
      // 选中 "Hello" + "\n" + "Wo" = 5 + 1 + 2 = 8
      sm.setSelection(0, 8)

      expect(sm.index).toBe(0)
      expect(sm.length).toBe(8)
    })

    it('should handle empty block (padding BR)', () => {
      container.innerHTML = '<div><br></div>'
      const sm = new SelectionManager(container)
      sm.setSelection(0, 0)

      const selection = window.getSelection()!
      expect(selection.rangeCount).toBe(1)
    })

    it('should handle image element in content', () => {
      container.innerHTML = '<div>hello<img src="test.png">world</div>'
      const sm = new SelectionManager(container)
      sm.setSelection(5, 1)

      expect(sm.index).toBe(5)
      expect(sm.length).toBe(1)
    })
  })

  describe('_isPaddingBr', () => {
    it('should identify padding BR in empty div', () => {
      container.innerHTML = '<div><br></div>'
      const br = container.querySelector('br')!
      const sm = new SelectionManager(container)
      expect(sm._isPaddingBr(br)).toBe(true)
    })

    it('should not identify BR with sibling text', () => {
      container.innerHTML = '<div>text<br>more</div>'
      const br = container.querySelector('br')!
      const sm = new SelectionManager(container)
      expect(sm._isPaddingBr(br)).toBe(false)
    })

    it('should return false for non-BR node', () => {
      const div = document.createElement('div')
      const sm = new SelectionManager(container)
      expect(sm._isPaddingBr(div)).toBe(false)
    })
  })

  describe('_getBlock', () => {
    it('should return LI element for list item', () => {
      container.innerHTML = '<ul><li>item</li></ul>'
      const textNode = container.querySelector('li')!.firstChild as Text
      const sm = new SelectionManager(container)
      const block = sm._getBlock(textNode)
      expect(block!.tagName).toBe('LI')
    })

    it('should return code-block for code line', () => {
      container.innerHTML = '<div class="code-block">code</div>'
      const textNode = container.querySelector('.code-block')!.firstChild as Text
      const sm = new SelectionManager(container)
      const block = sm._getBlock(textNode)
      expect(block!.classList.contains('code-block')).toBe(true)
    })

    it('should return container direct child as block', () => {
      container.innerHTML = '<p>text</p>'
      const textNode = container.querySelector('p')!.firstChild as Text
      const sm = new SelectionManager(container)
      const block = sm._getBlock(textNode)
      expect(block!.tagName).toBe('P')
    })
  })

  describe('_normalizeToTextNode', () => {
    it('should normalize element with text child', () => {
      container.innerHTML = '<div><span>text</span></div>'
      const div = container.querySelector('div')!
      const sm = new SelectionManager(container)
      const result = sm._normalizeToTextNode(div, 0)
      expect(result.node.nodeType).toBe(Node.TEXT_NODE)
      expect(result.offset).toBe(0)
    })

    it('should handle element with BR only', () => {
      container.innerHTML = '<div><br></div>'
      const div = container.querySelector('div')!
      const sm = new SelectionManager(container)
      const result = sm._normalizeToTextNode(div, 0)
      expect(result.node.tagName).toBe('BR')
      expect(result.offset).toBe(0)
    })
  })
})
