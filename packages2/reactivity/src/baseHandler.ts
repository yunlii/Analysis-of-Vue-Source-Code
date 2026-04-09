import { isObject } from "packages2/shared/src";
import { activeEffect } from "./effect";
import { track, trigger } from "./reactiveEffect"
import { reactive } from "./reactive";
import { ReactiveFlags } from "./constants";


export const mutableHandlers: ProxyHandler<any> = {
  get(target, key, receiver) {
    if(key === ReactiveFlags.IS_REACTIVE) {
      return true;
    }
    track(target, key);
    let res = Reflect.get(target, key, receiver);
    if(isObject(res)) {
      return reactive(res);
    }
    return res;
  },
  set(target, key , value, receiver) {
    let oldValue = target[key];
    let result = Reflect.set(target, key, value, receiver);
    if(oldValue !== value) { 
      trigger(target, key, value, oldValue);
    }
    return result;
  }
}
