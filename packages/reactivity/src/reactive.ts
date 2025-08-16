import { isObject } from "@vue/shared"
import { mutableHandlers } from "./baseHandler";
import { ReactiveFlags } from "./constants";

export function reactive(target) {
  return createReactiveObject(target);
}

const reactiveMap = new WeakMap();

function createReactiveObject(target) {
  if (!isObject(target)) {
    return;
  }
  if(target[ReactiveFlags.IS_REACTIVE]) {
    return target;
  }
  const existProxy = reactiveMap.get(target);
  if(existProxy) {
    return existProxy;
  }
  let proxy = new Proxy(target, mutableHandlers);
  reactiveMap.set(target, proxy);
  return proxy;
}

export function toReactive(value) {
  return isObject(value) ? reactive(value) : value;
}

export function isReactive(value) {
  return !!(value && value[ReactiveFlags.IS_REACTIVE]);
}