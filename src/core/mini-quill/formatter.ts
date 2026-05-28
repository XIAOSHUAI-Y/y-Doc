// @ts-nocheck
/**
 * Formatter - 格式操作器
 *
 * 负责对 Delta 应用格式操作（如加粗、斜体、颜色）。
 * 它会拆分重叠的操作，确保格式正确应用到指定的文本范围。
 * 支持格式 Toggle：再次应用相同格式会取消该格式。
 *
 * 核心算法：
 * 将目标格式范围与现有 Delta 操作逐一比对，根据交集关系
 * 拆分为3种情况处理：完全在外、完全在内、部分重叠
 */
export class Formatter {
  /**
   * @param {import('./delta').Delta} delta - 要格式化的 Delta 对象
   */
  constructor(delta) {
    this.delta = delta
  }

  /**
   * 对指定范围的文本应用格式
   *
   * 算法流程：
   * 1. Toggle 检测：如果目标范围已全部具有该格式，则改为取消
   * 2. 遍历 Delta 中的每个操作，维护当前遍历位置
   * 3. 判断操作与目标范围的交集类型：
   *    - 无交集：操作完全在范围外，直接保留
   *    - 完全包含：操作完全在范围内，应用新格式
   *    - 部分重叠：需要拆分为多个操作
   *
   * @param {number} index - 格式起始位置（字符索引）
   * @param {number} length - 格式覆盖长度
   * @param {import('../types.d.ts').InlineAttributes} attributes - 要应用的格式属性
   */
  format(index, length, attributes) {
    // Toggle 逻辑：如果目标范围已全部具有该格式，则取消
    const attrEntries = Object.entries(attributes).filter(
      ([_, v]) => v !== null && v !== undefined
    )
    if (attrEntries.length === 1) {
      const [attrName, attrValue] = attrEntries[0]
      let allHave = true
      let hasOverlap = false
      let currentIndex = 0

      for (const op of this.delta.ops) {
        const opLength = this.getOpLength(op)
        const overlapStart = Math.max(currentIndex, index)
        const overlapEnd = Math.min(currentIndex + opLength, index + length)

        if (overlapEnd > overlapStart && typeof op.insert === 'string') {
          hasOverlap = true
          if (!op.attributes || op.attributes[attrName] !== attrValue) {
            allHave = false
            break
          }
        }
        currentIndex += opLength
      }

      if (hasOverlap && allHave) {
        attributes = { [attrName]: null }
      }
    }

    const newOps = []
    let currentIndex = 0

    for (const op of this.delta.ops) {
      const opLength = this.getOpLength(op)

      // 换行符不应用 inline 格式，直接透传
      if (op.insert === '\n') {
        newOps.push({ ...op })
        currentIndex += opLength
        continue
      }

      // 判断操作与目标范围的位置关系
      // 情况1：操作完全在范围外（左侧或右侧）
      if (currentIndex + opLength <= index || currentIndex >= index + length) {
        newOps.push({ ...op })
      }
      // 情况2：操作完全在范围内，应用新格式
      else if (currentIndex >= index && currentIndex + opLength <= index + length) {
        const attrs = op.attributes
          ? this.mergeAttributes(op.attributes, attributes)
          : attributes
        newOps.push({ insert: op.insert, attributes: attrs })
      }
      // 情况3：操作与范围部分重叠，需要拆分
      else {
        // 计算重叠部分的起止位置（在当前操作中的索引）
        const overlapStart = Math.max(index, currentIndex)
        const overlapEnd = Math.min(index + length, currentIndex + opLength)

        // 前缀部分：范围前的文本（如果有的话）
        if (currentIndex < overlapStart) {
          newOps.push({
            insert: op.insert.slice(0, overlapStart - currentIndex),
            ...(op.attributes ? { attributes: op.attributes } : {})
          })
        }

        // 重叠部分的起止索引（相对于操作内的字符位置）
        const startInOp = overlapStart - currentIndex
        const endInOp = overlapEnd - currentIndex
        const overlapped = op.insert.slice(startInOp, endInOp)

        // 重叠部分：应用新格式
        const attrs = op.attributes
          ? this.mergeAttributes(op.attributes, attributes)
          : attributes
        newOps.push({ insert: overlapped, attributes: attrs })

        // 后缀部分：范围后的文本（如果有的话）
        if (currentIndex + opLength > overlapEnd) {
          newOps.push({
            insert: op.insert.slice(endInOp),
            ...(op.attributes ? { attributes: op.attributes } : {})
          })
        }
      }

      currentIndex += opLength
    }

    // 清除空的 attributes 对象
    for (const op of newOps) {
      if (op.attributes && Object.keys(op.attributes).length === 0) {
        delete op.attributes
      }
    }

    this.delta.ops = newOps
  }

  /**
   * 对指定范围的 block（换行符）应用块级格式
   *
   * 块级格式作用于包含在范围内的 \n 操作：
   * - 如果范围内所有 \n 都已具有该格式，则取消（toggle）
   * - 否则应用新格式
   *
   * @param {number} index - 格式起始位置
   * @param {number} length - 格式覆盖长度
   * @param {Object} blockFormat - 块级格式属性，如 { header: 1 }、{ list: 'bullet' }
   */
  formatBlock(index, length, blockFormat) {
    const attrName = Object.keys(blockFormat)[0]
    const attrValue = blockFormat[attrName]

    // Toggle 检测：遍历每个 op 中的 \n，检查是否在范围内
    let allHave = true
    let hasOverlap = false
    let currentIndex = 0

    for (const op of this.delta.ops) {
      const opLength = this.getOpLength(op)
      if (typeof op.insert === 'string') {
        for (let i = 0; i < op.insert.length; i++) {
          if (op.insert[i] !== '\n') continue
          const pos = currentIndex + i
          const overlapStart = Math.max(pos, index)
          const overlapEnd = Math.min(pos + 1, index + length)
          if (overlapEnd > overlapStart) {
            hasOverlap = true
            if (!op.attributes || op.attributes[attrName] !== attrValue) {
              allHave = false
              break
            }
          }
        }
      }
      currentIndex += opLength
      if (!allHave) break
    }

    if (hasOverlap && allHave) {
      blockFormat = { [attrName]: null }
    }

    // 重建 ops：把包含 \n 的长字符串 op 拆成文本片段 + 带块级属性的 \n
    const newOps = []
    currentIndex = 0

    for (const op of this.delta.ops) {
      const opLength = this.getOpLength(op)

      if (typeof op.insert === 'string' && op.insert.includes('\n')) {
        let textStart = 0
        for (let i = 0; i < op.insert.length; i++) {
          if (op.insert[i] === '\n') {
            // 输出 \n 前面的文本（不带块级属性）
            if (textStart < i) {
              let textAttrs = op.attributes ? { ...op.attributes } : undefined
              if (textAttrs) {
                delete textAttrs.header
                delete textAttrs.list
                delete textAttrs.blockquote
                delete textAttrs['code-block']
                delete textAttrs.indent
                if (Object.keys(textAttrs).length === 0) textAttrs = undefined
              }
              newOps.push({
                insert: op.insert.slice(textStart, i),
                ...(textAttrs ? { attributes: textAttrs } : {})
              })
            }

            // 输出 \n（若落在范围内则附加块级属性）
            const pos = currentIndex + i
            const overlapStart = Math.max(pos, index)
            const overlapEnd = Math.min(pos + 1, index + length)

            if (overlapEnd > overlapStart) {
              const attrs = op.attributes
                ? this.mergeAttributes(op.attributes, blockFormat)
                : blockFormat
              if (attrs && Object.keys(attrs).length > 0) {
                newOps.push({ insert: '\n', attributes: attrs })
              } else {
                newOps.push({ insert: '\n' })
              }
            } else {
              newOps.push({
                insert: '\n',
                ...(op.attributes ? { attributes: op.attributes } : {})
              })
            }
            textStart = i + 1
          }
        }
        // 尾部剩余文本
        if (textStart < op.insert.length) {
          let textAttrs = op.attributes ? { ...op.attributes } : undefined
          if (textAttrs) {
            delete textAttrs.header
            delete textAttrs.list
            delete textAttrs.blockquote
            delete textAttrs['code-block']
            delete textAttrs.indent
            if (Object.keys(textAttrs).length === 0) textAttrs = undefined
          }
          newOps.push({
            insert: op.insert.slice(textStart),
            ...(textAttrs ? { attributes: textAttrs } : {})
          })
        }
      } else if (op.insert === '\n') {
        const overlapStart = Math.max(currentIndex, index)
        const overlapEnd = Math.min(currentIndex + opLength, index + length)
        if (overlapEnd > overlapStart) {
          const attrs = op.attributes
            ? this.mergeAttributes(op.attributes, blockFormat)
            : blockFormat
          if (attrs && Object.keys(attrs).length > 0) {
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

    // 清除空的 attributes
    for (const op of newOps) {
      if (op.attributes && Object.keys(op.attributes).length === 0) {
        delete op.attributes
      }
    }

    this.delta.ops = newOps
  }

  /**
   * 获取操作的长度
   *
   * Delta 操作的长度取决于其类型：
   * - insert: 字符串长度
   * - retain: 保留的字符数
   * - delete: 删除的字符数
   *
   * @param {import('../types.d.ts').Op} op - Delta 操作对象
   * @returns {number} 操作对应的文本长度
   */
  getOpLength(op) {
    if (typeof op.insert === 'string') {
      return op.insert.length
    }
    if (op.insert) return 1 // embed has length 1
    if (op.retain) return op.retain
    if (op.delete) return op.delete
    return 0
  }

  /**
   * 合并属性
   *
   * 将新属性与现有属性合并。规则：
   * - 新属性覆盖同名现有属性
   * - 新属性值为 null 时删除该属性
   * - 新属性值会添加到现有属性中
   *
   * @param {Object|null} existing - 现有属性对象
   * @param {Object} newAttrs - 新属性对象
   * @returns {Object} 合并后的属性对象
   */
  mergeAttributes(existing, newAttrs) {
    const merged = existing ? { ...existing } : {}
    for (const key in newAttrs) {
      if (newAttrs[key] === null) {
        // null 值表示删除该属性
        delete merged[key]
      } else {
        merged[key] = newAttrs[key]
      }
    }
    return merged
  }
}
