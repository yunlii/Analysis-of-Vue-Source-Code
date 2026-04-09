import { currentInstance, setCurrentInstance, unsetCurrentInstance } from "./component";

export const enum LifeCycles {
  BEFORE_MOUNT = 'bm',
  MOUNtED = 'm',
  BEFORE_UPDATE = 'bu',
  UPDATED = 'u',
}
function createHook(type) {
  return (hook, target = currentInstance) => {
    if(target) {
      const hooks = target[type] || (target[type] = []);
      const wrapHook = () => {
      setCurrentInstance(target);
      hook.call(target);
      unsetCurrentInstance();
      }
      hooks.push(wrapHook);
    }
  }
}

export const onBeforeMount = createHook(LifeCycles.BEFORE_MOUNT); 
export const onMounted = createHook(LifeCycles.MOUNtED); 
export const onBeforeUpdate = createHook(LifeCycles.BEFORE_UPDATE);
export const onUpdated = createHook(LifeCycles.UPDATED);


export function invokeArray(fns) {
  for(let i = 0; i < fns.length; i++) {
    fns[i]();
  }
}

