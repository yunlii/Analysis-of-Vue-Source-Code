/**
 * 首先要先理解MVVM的特征是数据绑定和单一数据源，我们要做的是数据->页面，页面->数据->页面，这一个单项循环，最终都是数据变动去改变页面更新。
 * 一、1、监听数据变化改变页面；2、监听页面数据变化，然后改变数据从而执行1的步骤。这是最底层的逻辑。
 * 二、数据规模化，数据可以被多个页面引用，一个页面可以有多个数据引用。所以，我们需要一个依赖收集器来完成多数据更新的目的。
 * 1、‌页面依赖数据（追踪依赖）,当页面渲染时，组件会“读取”响应式数据。这个“读取”动作就被自动记录下来，形成依赖关系。
 * 2、‌数据依赖页面（触发更新），当数据变化时，Vue 会通知所有依赖它的组件重新渲染。
 * 这实现这些，我们需要存储页面依赖的数据，同时也需要存储数据依赖的页面。
 * 我们需要一个东西来帮我们完成：1、依赖收集。2、通知更新。的工作，这工作由Effect来完成。
 * 而reactivity作为一个监听器来触发effect去工作。
 */

import { isObject } from "packages2/shared/src"
import { mutableHandlers } from "./baseHandler";
import { ReactiveFlags } from "./constants";

/**
 * 判断是不是响应式对象
 * @param value
 * @returns 
 */
export function isReactive(value) {
  return !!(value && value[ReactiveFlags.IS_REACTIVE]);
}

/**
 * 将对象变成响应式对象。
 * @param target 
 * @returns 
 */
export function reactive(target) {
  return createReactiveObject(target);
}

const reactiveMap = new WeakMap();

/**
 * 创建响应式对象
 * @param target 
 * @returns 
 */
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

/**
 * 安全包装函数，用于ref的内部实现‌和统一处理未知类型‌
 * @param value 
 * @returns 
 */
export function toReactive(value) {
  return isObject(value) ? reactive(value) : value;
}