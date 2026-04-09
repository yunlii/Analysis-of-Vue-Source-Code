import { isObject } from "packages2/shared/src";
import { createVNode, isVNode } from "./createVNode";

export function h(type, propsOrChildren?, children?) {
  let l = arguments.length;
  if(l === 2) {
    if(isObject(propsOrChildren) && !Array.isArray(propsOrChildren)) {
      if(isVNode(propsOrChildren)) {
        return createVNode(type, null, [propsOrChildren]);
      } else {
        return createVNode(type, propsOrChildren, null);
      }
    }
    return createVNode(type, null, propsOrChildren);
  } else {
    if(l > 3) {
      children = Array.from(arguments).slice(2);
    } 
    if(l == 3 && isVNode(children)) {
      children = [children];
    }
    return createVNode(type, propsOrChildren, children);
  }
}