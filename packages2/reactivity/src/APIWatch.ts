import { isObject, isFunction } from "packages2/shared/src";
import { ReactiveEffect, isReactive, isRef } from "packages2/reactivity/src";

export function watch(source, cb, options = {} as any) {  
  return doWatch(source, cb, options);
}

export function watchEffect(getter, options = {}) {
  return doWatch(getter, null, options as any);
}

function traverse(source, depth, currentDepth = 0, seen = new Set()) {
  if(!isObject(source)) {
    return source;
  }
  if(depth) {
    if(currentDepth >= depth) {
      return source;
    }
    currentDepth++;
  }
  if(seen.has(source)) {
    return source;
  }
  for(let key in source) {
    traverse(source[key], depth, currentDepth, seen);
    // seen没做缓存处理，不知道是不是漏掉了，记得看下源码。
  }
  return source;
}

function doWatch(source, cb, { deep, immediate }) {
  const reactiveGetter = (source) => traverse(source, deep === false ? 1 : undefined);
  let getter = () => {};
  if(isReactive(source)) {
    getter = () => reactiveGetter(source);
  } else if (isRef(source)) {
    getter = () => source.value;
  } else if (isFunction(source)) {
    getter = source;
  }
  let oldValue;
  let clean;
  const onCleanup = (fn) => {
    clean = () => {
      fn();
      clean = undefined;
    }
  }

  const job = () => {
    if(cb) {
      const newValue = effect.run();
      if(clean) {
        clean();
      }
      cb(newValue, oldValue, onCleanup);
      oldValue = newValue;    
    } else {
      effect.run();
    }
  }

  const effect = new ReactiveEffect(getter, job);

  if(cb) {
    if(immediate) {
      job();
    } 
    else {
      oldValue = effect.run();
    }
  } else {
    effect.run();
  }

  const unwatch = () => {
    effect.stop();
  }

  return unwatch;
}