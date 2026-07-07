/*
  patch是复用已有DOM元素。
*/

import { createVNode } from "./createVNode";
  import { Text, Fragment } from "./createVNode";
  
/**
 * 
 * @param renderOptions 
 */
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

  
  

  /**
   * bi
   * @param n1 旧节点
   * @param n2 新节点
   * @param container 挂载容器
   * @param anchor 指定新创建的 DOM 元素应该插入到哪个节点之前
   * @param parentComponent 父节点
   * @returns 
   */
  const patch = (n1, n2, container, anchor = null, parentComponent = null) => {
      if(n1 == n2) {
        return
      }
      // 如果n1存在并且两个结点不相同
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
            // type.process 是 Teleport 或 Suspense 这类特殊组件自带的渲染函数，用于处理它们特有的挂载和更新逻辑。
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

  const processText = (n1, n2, container) => {
    if(n1 == null) {
      n2.el = hostCreateText(n2.children);
      hostInsert(n2.el, container);
    } else {
      // 复用旧节点的 DOM 元素，n2.el = n1.el 避免重复创建
      // 对比新旧文本内容，不同时才调用 hostSetText 更新 DOM
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

  const processElement = (n1, n2, container, anchor, parentComponent) => {
    if(n1 === null) {
      mountElement(n2, container, anchor, parentComponent);
    } else {
      patchElement(n1, n2, container, parentComponent);
    }
  };

  /**
   * 
   * @param vnode 
   * @param container 
   * @param anchor 
   * @param parentComponent 
   */
  const mountElement = (vnode, container, anchor, parentComponent) => {
    const { type, children, props, shapeFlag, transition } = vnode;
    const el = (vnode.el = hostCreateElement(type)); 
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
  
    // 实现transition
    if(transition) {
      transition.beforeEnter(el);
    }
  
    hostInsert(el, container, anchor);
  
    if(transition) {
      transition.enter(el);
    }
    // 实现transition
  }



  const patchElement = (n1, n2, container, parentComponent) => {
    let el = (n2.el = n1.el);
    let oldProps = n1.props || {};
    let newProps = n2.props || {};
    patchProps(oldProps, newProps, el);
    patchChildren(n1, n2, el, parentComponent);
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
      // c2是TEXT_CHILDREN
      if(shapeFlag & ShapeFlags.TEXT_CHILDREN) {
        // c1是ARRAY_CHILDREN 
        if(prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          unmountChildren(c1, parentComponent);
        }
        // C2可能是空值
        if(c1 !== c2) {
          hostSetElementText(el, c2);
        }
      } else {
        // c1是ARRAY_CHILDREN
        if(prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          // c2是ARRAY_CHILDREN
          if(shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            patchKeyedChildren(c1, c2, el, parentComponent);
          // c2没有children
          } else {
            unmountChildren(c1, parentComponent);
          }
        } else {
          // c1是TEXT_CHILDREN，直接清空
          if(prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
            hostSetElementText(el, "");
          }
          // c1没有children，c2是ARRAY_CHILDREN
          if(shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            mountChildren(c2, el, parentComponent);
          }
        }
      }
    };
  
  /**
   * 虚拟节点的key属性作用就在这里。
   * @param c1 
   * @param c2 
   * @param el 
   * @param parentComponent 
   */
  const patchKeyedChildren = (c1, c2, el, parentComponent) => {
      let i = 0;
      let e1 = c1.length - 1;
      let e2 = c2.length - 1;
      // 从头部（i=0）开始，逐个对比新旧节点，如果全部都一样那就遍历到最短数组的最后一个。
      // 如果它们是‌相同的VNode，就直接 patch 复用，然后指针 i 后移。一旦遇到不相同的节点，立即跳出循环。
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
      // 从尾部开始，如果全部都一样那就遍历到最短数组的e与i相同的位置。
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
      // 判断旧
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
  
  /**
   * 将子节点数组中的原始字符串或数字，统一转换为标准文本虚拟节点（VNode），确保后续 patch 处理时所有子节点都是规范的 VNode 对象。
   * VNode 和原始文本混在一起。
    h('div', [h('span', '标题'), '这是原始文本', 123, h('p', '段落')]);
   * @param children 
   * @returns 
   */
  const normalize = (children) => {
    for(let i = 0; i < children.length; i++) {
      if(typeof children[i] === 'string' || typeof children[i] === 'number') {
        children[i] = createVNode(Text, null, String(children[i]));
      };
    };
    return children;
  };
  

  /**
   * 将虚拟节点（VNode）挂载到真实 DOM 容器上，同时处理更新和卸载逻辑。
   * @param vnode // 虚拟树
   * @param container // 挂载节点 
   */
  const render = (vnode, container) => {
    // 传入 null 表示要销毁旧节点
    if(vnode == null) {
      if(container._vnode) {
        unmount(container._vnode, null)
      }
    } else {
      // patch 会对比新旧 VNode，null就是挂载否则就是更新。
      patch(container._vnode || null, vnode, container);  
      // 把当前 VNode 缓存到容器上，下次更新时作为旧节点
      container._vnode = vnode;
    }
  }
  return { render }
}