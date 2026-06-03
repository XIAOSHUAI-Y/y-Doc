// @ts-nocheck

/**
 * 获取 Delta 操作的长度
 * - 字符串 insert: 返回字符长度
 * - 非字符串 insert（如图片）: 返回 1
 * - retain/delete: 返回对应数值
 */
export function getOpLength(op: any): number {
  if (typeof op.insert === 'string') return op.insert.length
  if (op.insert) return 1
  return op.retain || op.delete || 0
}
