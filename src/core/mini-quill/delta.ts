// @ts-nocheck
/**
 * Delta - 文本操作的数据结构
 *
 * Delta 是 Quill 编辑器的核心数据结构，用于描述文稿的修改操作。
 * 它由一组 ops (operations) 组成，每条操作可以是：
 * - insert: 插入文本，可选带属性（加粗、斜体等）
 * - delete: 删除指定长度的文本
 * - retain: 保留指定长度，可选带属性
 *
 * @example
 * const delta = new Delta()
 *   .insert('Hello', { bold: true })
 *   .insert(' World\n')
 *   .delete(5)
 *   .retain(10, { italic: true })
 */
export class Delta {
  /**
   * @param {Array<import('../types.d.ts').Op>} [ops=[]] - 操作列表
   */
  constructor(ops = []) {
    /** @type {Array<import('../types.d.ts').Op>} */
    this.ops = ops
  }

  /**
   * 插入文本
   * @param {string} text - 要插入的文本
   * @param {import('../types.d.ts').InlineAttributes|null} [attrs=null] - 可选的文本属性
   * @returns {Delta} 返回 this，支持链式调用
   */
  insert(text, attrs = null) {
    const op = { insert: text }
    if (attrs && Object.keys(attrs).length > 0) {
      op.attributes = attrs
    }
    this.ops.push(op)
    return this
  }

  /**
   * 删除文本
   * @param {number} length - 要删除的字符数
   * @returns {Delta} 返回 this，支持链式调用
   */
  delete(length) {
    if (length > 0) this.ops.push({ delete: length })
    return this
  }

  /**
   * 保留（跳过）文本，通常用于应用格式到已有内容
   * @param {number} length - 要保留的字符数
   * @param {import('../types.d.ts').InlineAttributes|null} [attrs=null] - 可选的属性
   * @returns {Delta} 返回 this，支持链式调用
   */
  retain(length, attrs = null) {
    if (length <= 0) return this
    const op = { retain: length }
    if (attrs && Object.keys(attrs).length > 0) op.attributes = attrs
    this.ops.push(op)
    return this
  }

  /** 序列化为 JSON 对象 */
  toJSON() {
    return { ops: this.ops }
  }

  /**
   * 从 JSON 对象反序列化创建 Delta 实例
   * @param {import('../types.d.ts').DeltaJSON} json
   * @returns {Delta}
   */
  static fromJSON(json) {
    return new Delta(json.ops || [])
  }

  /**
   * 压缩 Delta，合并相邻的相同属性 insert ops
   *
   * 将连续的无属性 insert 或同属性 insert 合并为一个 op，
   * 减少 ops 数量和对应的 DOM 节点数。
   *
   * @returns {Delta} 返回 this，支持链式调用
   */
  compress() {
    const compressed = []
    for (const op of this.ops) {
      if (typeof op.insert !== 'string') {
        compressed.push({ ...op })
        continue
      }
      const last = compressed[compressed.length - 1]
      if (
        last &&
        typeof last.insert === 'string' &&
        JSON.stringify(last.attributes || null) === JSON.stringify(op.attributes || null)
      ) {
        last.insert += op.insert
      } else {
        compressed.push({ ...op })
      }
    }
    this.ops = compressed
    return this
  }
}
