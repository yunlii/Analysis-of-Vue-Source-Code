import { getCurrentInstance } from "../component";
import { onMounted, onUpdated } from "../apiLifeCycle";
import { ShapeFlags } from "@vue/shared";

export const keepAlive = {
  __isKeepAlive: true,
  props: {
    max: Number, // RORU缓存算法
  },
  setup(props, { slots }) {
    const { max } = props
    const keys = new Set();
    const cache = new Map();
    
    
    let pendingCacheKey = null;
    const instance = getCurrentInstance();
    const cacheSubTree = () => {
      cache.set(pendingCacheKey, instance.subTree);
    }

    const { move, createElement, unmount: _unmount } = instance.ctx.renderer;
    
    function reset(vnode) {
      let shapeFlag = vnode.shapeFlag;
      if(shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE) {
        shapeFlag -= ShapeFlags.COMPONENT_KEPT_ALIVE;
      }
      if(shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE) {
        shapeFlag -= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE;
      }
      vnode.shapeFlag = shapeFlag;
    }

    function unmount(vnode) {
      reset(vnode);
      _unmount(vnode);
    }
    
    function pruneCasheEntry(key) {
      keys.delete(key);
      const cached = cache.get(key);
      unmount(cached);
      cache.delete(key);
    }


    instance.ctx.activate = (vnode, container, anchor) => {
      move(vnode, container, anchor);
    }
    const storageContent = createElement("div");
    instance.ctx.deactivate = (vnode) => {
      move(vnode, storageContent, null);
    }
   
    onMounted(cacheSubTree);
    onUpdated(cacheSubTree);
      
    return () => {      
      const vnode = slots.default();
      const comp = vnode.type;
      const key = vnode.key == null ? comp : vnode.key;
      const cacheVnode = cache.get(key);
      pendingCacheKey = key;
      if(cacheVnode) {
        vnode.component = cacheVnode.component;
        vnode.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE;
        keys.delete(key);
        keys.add(key);
      } else {
        keys.add(key);
        if(max && keys.size > max) {
          pruneCasheEntry(keys.values().next().value);
        }
      }
      vnode.shapeFlag |= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE;
      return vnode;
    }
  }
}

export const isKeepAlive = (value) => value.type.__isKeepAlive;




