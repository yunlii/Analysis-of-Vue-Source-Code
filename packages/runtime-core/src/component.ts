import { proxyRefs, reactive } from "@vue/reactivity";
import { hasOwn, isFunction, ShapeFlags } from "@vue/shared";

export function createComponentInstance(vnode, parent) {
  const instance = {
    data: null,
    vnode,
    subTree: null,
    isMounted: false,
    update: null,
    props: {},
    attrs: {},
    slots: {},
    propsOptions: vnode.type.props,
    component: null,
    proxy: null,
    setupState: {},
    exposed: null,
    parent,
    provides: parent ? parent.provides : Object.create(null),
    ctx: {} as any
  }
  return instance;
}

  const initProps = (instance, rawProps) => {
    const props = {};
    const attrs = {};
    const propsOptions = instance.propsOptions || {};
    if(rawProps) {
      for(let key in rawProps) {
        const value = rawProps[key];
        if(key in propsOptions) {
          props[key] = value; // props 不需要深度代理，用shallowReactive就行，这里因为没写就用reactive，因为组件里面不能更改props,为什么不能更改后面再研究。
        } else {
          attrs[key] = value;
        }
      }
    }
    instance.attrs = attrs;
    instance.props = reactive(props);
  }

const publicProperty = {
  $attrs: (instance) => instance.attrs,
  $slots: (instance) => instance.slots
}

const handler =  {
    get(target, key) {      
      const { data, props, setupState } = target;
      if(data && hasOwn(data, key)) {
        return data[key];
      } else if (props && hasOwn(props, key)) {
        return props[key];
      } else if(setupState && hasOwn(setupState, key)) {
        return setupState[key];
      }
      const getter = publicProperty[key];
      if(getter) {
        return getter(target);
      }
    },
    set(target, key, value) {
      const { data, props, setupState } = target;
      if(data && hasOwn(data, key)) {
        data[key] = value;
      } else if (props && hasOwn(props, key)) {
        console.warn("props are readonly");
        return false;
      } else if (setupState && hasOwn(setupState, key)) {
        setupState[key] = value;
      }
      return true;
    }
  }
export function initSlots(instance, childrens) {
  if(instance.vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
    instance.slots = childrens;
  } else {
    instance.slots = {};
  }
}
export function setupComponent(instance) {
  const { vnode } = instance;
  initProps(instance, vnode.props);
  initSlots(instance, vnode.children);
  instance.proxy = new Proxy(instance, handler);
  const { data, render, setup } = vnode.type;
  if(setup) {
    const setupContext = {
      slots: instance.slots,
      attrs: instance.attrs,
      expose(value) {
        instance.exposed = value;
      },
      emit(event, ...playload) {
        const eventName = `on${event[0].toUpperCase() + event.slice(1)}`;
        const handler = instance.vnode.props[eventName];
        handler && handler(...playload);
      }
    };
    setCurrentInstance(instance);
    const setupResult = setup(instance.props, setupContext)
    unsetCurrentInstance();
    if(isFunction(setupResult)) {
      instance.render = setupResult;
    } else {
      instance.setupState = proxyRefs(setupResult);
    }
  }

  
  if(!isFunction(data) && data) return console.warn("data option must be a function");
  if(data) {
    instance.data = reactive(data.call(instance.proxy)); 
  }


  if(!instance.render) {
    instance.render = render; 
  }
}

export let currentInstance = null;

export const getCurrentInstance = () => {
  return currentInstance
}
export const setCurrentInstance = (instance) => {
  currentInstance = instance;
}
export const unsetCurrentInstance = () => {
  currentInstance = null;
}