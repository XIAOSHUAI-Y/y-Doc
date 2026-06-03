// @ts-nocheck
import { Delta } from './delta'
import { getOpLength } from './utils'

/**
 * 将 Quill 风格的 code-block Delta 转换为 mini-quill 内部格式
 * Quill 格式：代码行无 code-block 属性，末尾空 insert 带 code-block
 * mini-quill 格式：每行 \n 都带 code-block 属性
 */
export function convertQuillCodeBlockOps(ops: any[]): any[] {
  const newOps = []
  let i = 0
  while (i < ops.length) {
    const op = ops[i]
    if (typeof op.insert === 'string' && op.insert === '' && op.attributes && op.attributes['code-block'] !== undefined) {
      const lang = op.attributes['code-block']
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
 */
export function getLineRange(delta: any, index: number): { index: number; length: number } {
  let currentIndex = 0
  let lineStart = 0
  for (const op of delta.ops) {
    const opLength = getOpLength(op)
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
 */
export function getCodeBlockRange(delta: any, index: number): { index: number; length: number } | null {
  let currentIndex = 0
  let blockStart = -1
  let blockEnd = -1
  let inBlock = false

  for (const op of convertQuillCodeBlockOps(delta.ops)) {
    const opLength = getOpLength(op)
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
 */
export function getLineFormat(delta: any, index: number): any {
  const lineRange = getLineRange(delta, index)
  const endPos = lineRange.index + lineRange.length - 1
  let currentIndex = 0
  for (const op of delta.ops) {
    const opLength = getOpLength(op)
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
 */
export function setIndent(delta: any, index: number, length: number, indent: number): Delta {
  const newOps = []
  let currentIndex = 0

  for (const op of delta.ops) {
    const opLength = getOpLength(op)
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

  return new Delta(newOps)
}

/**
 * 移除指定行的 indent
 */
export function removeIndent(delta: any, index: number, length: number): Delta {
  return setIndent(delta, index, length, 0)
}

/**
 * 删除 Delta 中指定范围的内容
 */
export function deleteRange(delta: any, index: number, length: number): Delta {
  const newOps = []
  let currentIndex = 0

  for (const op of delta.ops) {
    const opLength = getOpLength(op)
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

  return new Delta(newOps)
}

/**
 * 检查指定位置所在的行是否有 code-block 属性
 */
export function lineHasCodeBlock(delta: any, index: number): boolean {
  let currentIndex = 0
  for (const op of convertQuillCodeBlockOps(delta.ops)) {
    const opLength = getOpLength(op)
    if (currentIndex <= index && index < currentIndex + opLength) {
      return op.attributes && op.attributes['code-block'] !== undefined
    }
    currentIndex += opLength
  }
  return false
}

/**
 * 获取指定位置所在代码块的语言
 */
export function getCodeBlockLangAt(delta: any, index: number): string | null {
  let currentIndex = 0
  for (const op of convertQuillCodeBlockOps(delta.ops)) {
    const opLength = getOpLength(op)
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
