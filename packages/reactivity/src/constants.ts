export enum ReactiveFlags {
  IS_REACTIVE = "__V_isReactive"
}

/**
 * 标记副作用是否需要重新执行。
 * Dirty 表示“脏”，需要执行；NoDirty 表示“干净”，无需执行。
 */
export enum DirtyLevels {
  Dirty = 4,
  NoDirty = 0
}