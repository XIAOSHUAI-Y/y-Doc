// @ts-nocheck
/**
 * Registry - Blot 类型注册表
 *
 * 负责管理格式化标签（blot）与 HTML 标签的映射关系。
 * 当前支持的格式：
 * - bold → <strong>
 * - italic → <em>
 * - underline → <u>
 * - strike → <s>
 */
export class Registry {
  constructor() {
    /** @type {Map<string, import('../types.d.ts').BlotConfig>} */
    this.blots = new Map()
    this.register('bold', { tag: 'strong' })
    this.register('italic', { tag: 'em' })
    this.register('underline', { tag: 'u' })
    this.register('strike', { tag: 's' })
  }

  /**
   * 注册一个格式化名称及其对应的 HTML 配置
   * @param {string} name
   * @param {import('../types.d.ts').BlotConfig} config
   */
  register(name, config) {
    this.blots.set(name, config)
  }

  /**
   * 根据名称获取注册的 blot 配置
   * @param {string} name
   * @returns {import('../types.d.ts').BlotConfig|undefined}
   */
  get(name) {
    return this.blots.get(name)
  }
}
