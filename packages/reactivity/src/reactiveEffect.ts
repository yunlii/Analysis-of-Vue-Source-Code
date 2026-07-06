/**
 * 做响应式对象到key的层面的依赖追踪
 */

import { activeEffect, trackEffect, triggerEffects } from "./effect";

const targetMap = new WeakMap();


/**
 * track做响应式对象到key的依赖追踪，到具体的key的effect收集会丢给trackEffect。
 * 结构：targetMap = { 
 *  响应式对象：depsMap = { 
 *    key: 
 *      dep = { 
 *        effect: _trackId
 *      }(Map)  
 *    } (weakMap)
 * } (weakMap)
 * @param target 
 * @param key 
 */
export function track(target, key) {
  if(activeEffect) {
    let depsMap = targetMap.get(target);
    if(!depsMap) {
      targetMap.set(target, (depsMap = new Map()))
    }
    let dep = depsMap.get(key);
    if(!dep) {
      depsMap.set(
        key,
        (dep = createDep(() => depsMap.delete(key), key))
      )
    }
    trackEffect(activeEffect, dep);
  }
}

export const createDep = (cleanup, key) => {
  const dep = new Map() as any;
  dep.cleanup = cleanup;
  dep.name = key;
  return dep; 
}