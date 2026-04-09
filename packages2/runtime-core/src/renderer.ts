import { hasOwn, ShapeFlags } from "packages2/shared/src";
import { createVNode, isSameVnode } from "./createVNode";
import { getSequence } from "./seq";
import { Text, Fragment } from "./createVNode";
import { isRef, ReactiveEffect } from "packages2/reactivity/src";
import queueJob from "./scheduler";
import { createComponentInstance, setupComponent } from "./component";
import { invokeArray } from "./apiLifeCycle";
import { isKeepAlive } from "./components/keepAlive";

export function createRenderer(renderOptions) {
  const {
    createElement: hostCreateElement,
    createText: hostCreateText,
    parenNode: hostParenNode,
    nextSibling: hostNextSibling,
    setText: hostSetText,
    setElementText: hostSetElementText,
    insert: hostInsert,
    remove: hostRemove,
    patchProp: hostPatchProp
  } = renderOptions;

  const normalize = (children) => {
    for(let i = 0; i < children.length; i++) {
      if(typeof children[i] === 'string' || typeof children[i] === 'number') {
        children[i] = createVNode(Text, null, String(children[i]));
      };
    };
    return children;
  };

  const mountChildren = (children, container, parentComponent) => {
    normalize(children);
    for(let i = 0; i < children.length; i++) {
      patch(null, children[i], container, parentComponent);
    }
  }
  const unmountChildren = (children, parentComponent) => {
    for(let i = 0; i < children.length; i++) {
      let child = children[i];
      unmount(child, parentComponent);
    }
  } 
  const mountElement = (vnode, container, anchor, parentComponent) => {
    const { type, children, props, shapeFlag, transition } = vnode;
    const el = (vnode.el = hostCreateElement(vnode.type)); 
    if(props) {
      for(let key in props) {
        hostPatchProp(el, key, null, props[key]); 
      }
    }
    if(shapeFlag & ShapeFlags.TEXT_CHILDREN) { 
      hostSetElementText(el, children);
    } else if(shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(children, el, parentComponent);
    }

    if(transition) {
      transition.beforeEnter(el);
    }


    hostInsert(el, container, anchor);

    if(transition) {
      transition.enter(el);
    }

  }
  const patchProps = (oldProps, newProps, el) => {
    for(let key in newProps) {
      hostPatchProp(el, key, oldProps[key], newProps[key]);
    }
    for(let key in oldProps) {
      if(!(key in newProps)) {
        hostPatchProp(el, key, oldProps[key], null);
      }
    }
  };
  const patchKeyedChildren = (c1, c2, el, parentComponent) => {
    let i = 0;
    let e1 = c1.length - 1;
    let e2 = c2.length - 1;
    while(i <= e1 && i <= e2) {
      const n1 = c1[i];
      const n2 = c2[i];
      if(isSameVnode(n1, n2)) {
        patch(n1, n2, el);
      } else {
        break;
      }
      i++;
    }
    while(i <= e1 && i <= e2) {
      const n1 = c1[e1];
      const n2 = c2[e2];
      if(isSameVnode(n1, n2)) {
        patch(n1, n2, el);
      } else {
        break;
      }
      e1--; 
      e2--;
    }

    if(i > e1) {
      if(i <= e2) {
        let nextPos = e2 + 1;
        let anchor = c2[nextPos]?.el;
        while(i <= e2) {
          patch(null, c2[i], el, anchor);
          i++;
        }
      }  
    } else if(i > e2) {
      if(i <= e1) {
        while(i <= e1) {
          unmount(c1[i], parentComponent);
          i++;
        }
      }
    } else {
      let s1 = i;
      let s2 = i;
      const keyToNewIndexMap = new Map();
      let toBePatched = e2 - s2 + 1;
      let newIndexToOldMapIndex = new Array(toBePatched).fill(0);
      for(let i = s2; i <= e2; i++) {
        const vnode = c2[i];
        keyToNewIndexMap.set(vnode.key, i);
      }
      for(let i = s1; i <= e1; i++) {
        const vnode = c1[i];
        const newIndex = keyToNewIndexMap.get(vnode.key);
        if(newIndex == undefined) {
          unmount(vnode, parentComponent); 
        } else {
          newIndexToOldMapIndex[newIndex - s2] = i + 1 ;
          patch(vnode, c2[newIndex], el);
        }
      }
      // 全量diff，遍历diff。
      let increasingSeq = getSequence(newIndexToOldMapIndex);
      let j = increasingSeq.length - 1;
      for(let i = toBePatched - 1; i >= 0; i--) {
        let newIndex = s2 + i;
        let anchor = c2[newIndex + 1]?.el;
        let vnode = c2[newIndex];
        if(!vnode.el) {
          patch(null, vnode, el, anchor);
        } else {
          if(i == increasingSeq[j]) {
            j--;
          } else {
            hostInsert(vnode.el, el, anchor);
          }
        }
      }
    }
  }
  const patchChildren = (n1, n2, el, parentComponent) => {
    const prevShapeFlag = n1.shapeFlag;
    const shapeFlag = n2.shapeFlag;
    const c1 = n1.children;
    let c2 
    if(shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      c2 = normalize(n2.children);
    } else {
      c2 = n2.children
    }
    if(shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      if(prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        unmountChildren(c1, parentComponent);
      }
      if(c1 !== c2) {
        hostSetElementText(el, c2);
      }
    } else {
      if(prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        if(shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          patchKeyedChildren(c1, c2, el, parentComponent);
        } else {
          unmountChildren(c1, parentComponent);
        }
      } else {
        if(prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
          hostSetElementText(el, "");
        }
        if(shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          mountChildren(c2, el, parentComponent);
        }
      }
    }
  };
  const patchElement = (n1, n2, container, parentComponent) => {
    let el = (n2.el = n1.el);
    let oldProps = n1.props || {};
    let newProps = n2.props || {};
    patchProps(oldProps, newProps, el);
    patchChildren(n1, n2, el, parentComponent);
  }
  const processElement = (n1, n2, container, anchor, parentComponent) => {
    if(n1 === null) {
      mountElement(n2, container, anchor, parentComponent);
    } else {
      patchElement(n1, n2, container, parentComponent);
    }
  };
  const unmount = (vnode, parentComponent) => {
    const { shapeFlag, transition, el } = vnode;
    const performRemove = () => hostRemove(vnode.el);
    if(vnode.shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE) {
      parentComponent.ctx.deactivate(vnode);
    } else if(vnode.type === Fragment) {
      unmountChildren(vnode.children, parentComponent);
    } else if(shapeFlag & ShapeFlags.COMPONENT) {
      unmount(vnode.component.subTree, parentComponent)
    } else if(shapeFlag & ShapeFlags.TELEPORT) {
      vnode.type.remove(vnode, unmountChildren);
    } else {
      if(transition) {
        transition.leave(el, performRemove);
      } else {
        performRemove();
      }
    }
  };
  const processText = (n1, n2, container) => {
    if(n1 == null) {
      n2.el = hostCreateText(n2.children);
      hostInsert(n2.el, container);
    } else {
      const el = (n2.el = n1.el);
      if(n1.children !== n2.children) {
        hostSetText(el, n2.children);
      }
    }
  };
  const processFragment = (n1, n2, container, parentComponent) => {
     if(n1 == null) {
       mountChildren(n2.children, container, parentComponent);
     } else {
       patchChildren(n1, n2, container, parentComponent);
     }
  }
  const updateComponentPreRender = (instance, next) => {
    instance.next = null;
    instance.vnode = next;
    updateProps(instance, instance.props, next.props || {});
    Object.assign(instance.slots, next.children);
  }
  function renderComponent(instance) {
    const { render, vnode, proxy, props, attrs, slots } = instance;
    if(vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
      return render.call(proxy, proxy);
    } else {
      return vnode.type(attrs, { slots });
    }
  }
  const setupRenderEffect = (instance, container, anchor, parentComponent) => {
    const { render } = instance;
    const componentUpdateFn = () => {
      const { bm, m, bu, u } = instance;
      if(!instance.isMounted) {
        if(bm) {
          invokeArray(bm);
        }

        // const subTree = render.call(instance.proxy, instance.proxy);
        const subTree = renderComponent(instance); 
        patch(null, subTree, container, anchor, instance); 
        instance.isMounted = true;
        instance.subTree = subTree;

        if(m) {
          invokeArray(m);
        }

      } else {
        const { next } = instance;
        if(next) {
          updateComponentPreRender(instance, next);
        }

        if(bu) {
          invokeArray(bu);
        }

        // const subTree = render.call(instance.proxy, instance.proxy);
        const subTree = renderComponent(instance); 
        patch(instance.subTree, subTree, container, anchor, instance);
        instance.subTree = subTree;

        if(u) {
          invokeArray(u);
        }
      }
    }
    const effect = new ReactiveEffect(componentUpdateFn, () => queueJob(update));
    const update = (instance.update = () => effect.run());
    update();
  }
  const mountComponent = (vnode, container, anchor, parentComponent) => {
    const instance = (vnode.component = createComponentInstance(vnode, parentComponent));
    if(isKeepAlive(vnode)) {
      instance.ctx.renderer = {
        createElement: hostCreateElement,
        move(vnode, container, anchor) {
          hostInsert(vnode.component.subTree.el, container, anchor);
        },
        unmount,
      }
    }
    
    setupComponent(instance);
    setupRenderEffect(instance, container, anchor, parentComponent);
  }
  const hasPropschanged = (prevProps, nextProps) => {
    let nKeys = Object.keys(nextProps);
    if(nKeys.length != Object.keys(prevProps).length) {
      return true;
    }
    for(let i = 0; i < nKeys.length; i++) {
      const key = nKeys[i];
      if(nextProps[key] !== prevProps[key]) {
        return true;
      }
    }
    return false;
  }
  const updateProps = (instance, prevProps, nextProps) => {
    if(hasPropschanged(prevProps, nextProps)) {
      for(let key in nextProps) {
        instance.props[key] = nextProps[key];
      }
      for(let key in instance.props) {
        if(!(key in nextProps)) {
          delete instance.props[key];
        } 
      }
    }
  }
  // 新增
  const shouldComponentUpdate = (n1, n2) => {
    const { props: prevProps, children: prevChildren } = n1;
    const { props: nextProps, children: nextChildren } = n2;
    if(prevChildren || nextChildren) return true;
    if(prevProps === nextProps) return false; 
    // updateProps(instance, prevProps, nextProps);
    return hasPropschanged(prevProps, nextProps || {});
  }
  const updateComponent = (n1, n2) => {
    // const instance = (n2.component = n1.component);
    // const { props: prevProps } = n1;
    // const { props: nextProps } = n2;
    // updateProps(instance, prevProps, nextProps);

    const instance = (n2.component = n1.component);
    if(shouldComponentUpdate(n1, n2)) {
      instance.next = n2;
      instance.update();
    }
  }
  // 函数式组件和状态组件，vue3已经废除函数式组件。
  const processComponent = (n1, n2, container, anchor, parentComponent) => {
    if(n1 === null) {

      if(n2.shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE) {
        parentComponent.ctx.activate(n2, container, anchor);
      } else {
        mountComponent(n2, container, anchor, parentComponent);
      }

    } else {
      updateComponent(n1, n2);
    }
  }
  function setRef(rawRef, vnode) {
    let value = vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT ? 
    vnode.component.exposed || vnode.component.proxy : vnode.el;
    if(isRef(rawRef)) {
      rawRef.value = value;
    } 
  }
  const patch = (n1, n2, container, anchor = null, parentComponent = null) => {
    if(n1 == n2) {
      return
    }
    if(n1 && !isSameVnode(n1, n2)) {
      unmount(n1, parentComponent);
      n1 = null;
    }
    const { type, shapeFlag, ref } = n2;
    switch(type) {
      case Text:
        processText(n1, n2, container);
        break;
      case Fragment: 
        processFragment(n1, n2, container, parentComponent);
        break;
      default: 
        if(shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, anchor, parentComponent);
        } else if(shapeFlag & ShapeFlags.TELEPORT) {
          type.process(n1, n2, container, anchor, parentComponent, {
            mountChildren, patchChildren, 
            move(vnode, container, anchor) { 
              hostInsert(
                vnode.component ? vnode.component.subTree.el : vnode.el,
                container, 
                anchor
              );
            }
          })
        } else if(shapeFlag & ShapeFlags.COMPONENT) {
          processComponent(n1, n2, container, anchor, parentComponent);    
        } 
    }
    if(ref) {
      setRef(ref, n2);
    }
  }
  const render = (vnode, container) => {
    if(vnode == null) {
      if(container._vnode) {
        unmount(container._vnode, null)
      }
    } else {
      patch(container._vnode || null, vnode, container);  
      container._vnode = vnode;
    }
  }
  return { render }
}