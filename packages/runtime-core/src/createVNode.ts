import { ShapeFlags, isFunction, isObject, isString } from "packages2/shared/src";
import { isTeleport } from "./components/teleport";

export const Text = Symbol("Text");
export const Fragment = Symbol("Fragment");

export function isVNode(value) {
  return value?.__v_isVNode;
}

export function isSameVnode(n1, n2) {
  return n1.type === n2.type && n1.key === n2.key;
}

/**
 * 
 * @param type 
 * @param props 
 * @param children 
 * @returns 
 */
export function createVNode(type, props, children?) {
  const shapeFlag = isString(type) 
    ? ShapeFlags.ELEMENT 
    : isTeleport(type) 
    ? ShapeFlags.TELEPORT
    : isObject(type) 
    ? ShapeFlags.STATEFUL_COMPONENT 
    : isFunction(type) 
    ? ShapeFlags.FUNCTIONAL_COMPONENT
    : 0;
  const vnode = {
    __v_isVNode: true,
    type, 
    props,
    children,
    key: props?.key, // 用于标识和复用节点，diff 时通过 key 判断是否是同一个节点。‌没有 key 时‌，列表更新只能按位置复用，容易出错；‌有 key 时‌，能精确找到可复用的节点，避免不必要的 DOM 操作。
    el: null,
    shapeFlag,  // 位掩码。相比传统的diff，用掩码性能会更好。
    ref: props?.ref,
  };
  if(children) {
    if(Array.isArray(children)) {
      vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN;
    } else if(isObject(children)) {
      vnode.shapeFlag |= ShapeFlags.SLOTS_CHILDREN;
    } else {
      children = String(children);
      vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN;
    } 
  }
  return vnode;
}