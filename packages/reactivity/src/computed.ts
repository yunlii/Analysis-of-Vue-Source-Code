import { isFunction } from "@vue/shared";
import { ReactiveEffect, trackEffect } from "./effect";
import { trackRefValue, triggerRefValue } from "./ref";

class ComputedRefIpml {
  public _value;
  public effect;
  public dep;
  constructor(getter, public setter) {
    this.effect = new ReactiveEffect(
      () => getter(this._value), 
      () => {
        triggerRefValue(this);
      }
    )
  }
  get value() {
    if(this.effect.dirty) {
      this._value = this.effect.run();
      trackRefValue(this);
    }
    return this._value;
  }
  set value(value) {
    this.setter(value);
  }
}

export function computed(getterOrOptions) {
  let onlyGetter = isFunction(getterOrOptions);
  let getter;
  let setter;
  if(onlyGetter) {
    getter = getterOrOptions;
    setter = () => {};
  } else {
    getter = getterOrOptions.get;
    setter = getterOrOptions.set;
  }
  return new ComputedRefIpml(getter, setter);
}