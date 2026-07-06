import { isObject } from "packages2/shared/src";
import { activeEffect } from "./effect";
import { track, trigger } from "./reactiveEffect"
import { reactive } from "./reactive";
import { ReactiveFlags } from "./constants";


export const mutableHandlers: ProxyHandler<any> = {
  // 做依赖收集。
  // 只有当副作用函数被调用时才会被调用。
  get(target, key, receiver) {
    if(key === ReactiveFlags.IS_REACTIVE) {
      return true;
    }
    track(target, key);
    // 这里要保证this指向的是proxy对象。
    // 当访问target的getter访问器时，如果有this会再次触发proxy，但触发后就没有this也就停止了。
    // 对于被引用的对象才会被proxy代理。
    let res = Reflect.get(target, key, receiver);
    if(isObject(res)) {
      return reactive(res);
    }
    return res;
  },
  // 做响应更新。
  set(target, key , value, receiver) {
    let oldValue = target[key];
    let result = Reflect.set(target, key, value, receiver);
    if(oldValue !== value) {
      trigger(target, key, value, oldValue);
    }
    return result;
  }
}
