import { ShapeFlags, isFunction, isObject, isString } from "@vue/shared";
import { isTeleport } from "./components/teleport";

export const Text = Symbol("Text");
export const Fragment = Symbol("Fragment");

export function isVNode(value) {
  return value?.__v_isVNode;
}

export function isSameVnode(n1, n2) {
  return n1.type === n2.type && n1.key === n2.key;
}

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
    key: props?.key,
    el: null,
    shapeFlag,
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