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
      // 情况1：c1长度>c2长度；情况2：c1长度<c1长度；情况3：c1长度=c2长度。
      // i会指向对比到不一样时的下一个节点，而e会到上一个节点。
      // 从头部（i=0）开始，逐个对比新旧节点，如果全部都一样那就遍历到最短数组的最后一个。
      // 如果它们是‌相同的VNode，就直接 patch 复用，然后指针 i 后移。一旦遇到不相同的节点，立即跳出循环。
      // 在e1或者e2全部比对完的情况，i>e1ore2。
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
      // 在e1或者e2全部比对完的情况，i<e1ore2。
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
      // 判断旧节点序列是否被处理完
      // 如果旧节点序列已全部处理完（i > e1），但新节点序列还有剩余（i <= e2），说明这些是‌需要新增的节点‌。
      // 如果从头开始处理完C1，anchor是空，也就是默认插入尾部；如果从尾部开始处理完C1，那么就会插入到C2处理到的位置+1之前。
      if(i > e1) {
        if(i <= e2) {
          let nextPos = e2 + 1;
          let anchor = c2[nextPos]?.el;
          while(i <= e2) {
            patch(null, c2[i], el, anchor);
            i++;
          }
        }  
      // 如果新节点序列已全部处理完（i > e2），但旧节点序列还有剩余（i <= e1），说明这些是‌需要卸载的旧节点‌。
      } else if(i > e2) {
        if(i <= e1) {
          while(i <= e1) {
            unmount(c1[i], parentComponent);
            i++;
          }
        }
      // 旧序列中与新序列的对比，有可能有些是旧节点独有的，新节点没有，反之亦然。
      // 我们的目的是为了复用旧节点，需要以新节点序列为准，找到旧节点序列中新节点序列也有的。
      // 为了高效确认节点，需要key来标识节点身份，避免需要遍历c1[i]==c2[i],这种低效的比对。所以需要建立一个keyToNewIndexMap映射。
      // 有了keyToNewIndexMap，我们就可以快速在旧序列确认复用节点，并卸载不需要复用的节点。
      // 此时，旧节点序列虽然把多余的节点去掉了。但，可能是完全乱序的，也可能是部分有序。
      // 我们要以新节点序列为顺序来整顿旧节点的顺序，我们需要一个数组来记录新序列和旧序列的关系，newIndexToOldMapIndex就是干这个的。
      // 索引作为newIndex，OldMapIndex作为值，并以这个数组值的最长递增子序列为基准插入剩下的节点。
      // -------------------------------------------------------------
      // 在没有key的情况下，
      // 在key相同，但节点实际不同，
      // 实际相同，但key不同，
      } else {
        let s1 = i;
        let s2 = i;
        const keyToNewIndexMap = new Map();
        let toBePatched = e2 - s2 + 1;
        let newIndexToOldMapIndex = new Array(toBePatched).fill(0);
        // 构建映射‌：遍历新节点中间部分，用 key 建立 keyToNewIndexMap，方便快速查找。
        // vnode.key具体哪一个节点，i代表在e2中的位置。
        for(let i = s2; i <= e2; i++) {
          const vnode = c2[i];
          keyToNewIndexMap.set(vnode.key, i);
        }
        // 复用与删除‌：遍历旧节点中间部分，通过 key 查找在新序列中的位置。找到则 patch 复用，并记录新旧索引映射；找不到则直接 unmount 删除。
        // i=e1.length + n；e1=e1.length - n；
        for(let i = s1; i <= e1; i++) {
          const vnode = c1[i];
          const newIndex = keyToNewIndexMap.get(vnode.key);
          // 判断旧节点序列在新序列是否有，如果没有就卸载。
          if(newIndex == undefined) {
            unmount(vnode, parentComponent); 
          } else {
            // newIndex是在新序列的索引 - S2正好需要处理的第一个节点，因为从0开始的，结果正好是对比序列在新序列的索引号。
            // 这里i+1是为了规避初始值0，这个0表示的是未匹配。
            newIndexToOldMapIndex[newIndex - s2] = i + 1 ;
            patch(vnode, c2[newIndex], el);
          }
        }
        // 计算最长递增子序列
        let increasingSeq = getSequence(newIndexToOldMapIndex);
        // 移动与新增‌从后往前遍历新节点中间部分。不在最长递增子序列中的节点，通过 hostInsert 移动到正确位置；对于没有 el 的新节点，调用 patch 进行挂载。
        let j = increasingSeq.length - 1;
        // 从后往前遍历新节点中间部分。
        for(let i = toBePatched - 1; i >= 0; i--) {
          let newIndex = s2 + i;
          let anchor = c2[newIndex + 1]?.el;
          let vnode = c2[newIndex];
          // 没有 el 的新节点，调用 patch 进行挂载。
          if(!vnode.el) {
            patch(null, vnode, el, anchor);
          } else {
            if(i == increasingSeq[j]) {
              j--;
            } else {
              // 不在最长递增子序列中的节点，通过 hostInsert 移动到正确位置。
              hostInsert(vnode.el, el, anchor);
            }
          }
        }
      }
    }

  /**
   * 最长递增子序列（LIS，Longest Increasing Subsequence）算法‌：通过 贪心 + 二分查找‌ 算法，从映射表中找出‌相对顺序保持不变的最长节点序列‌。
   * 全量diff，遍历diff。
   * @param arr 
   * @returns 返回的是‌最长递增子序列在原数组中的索引‌。
   */
  function getSequence(arr) {
    // 存储当前找到的最长递增子序列的在新节点序列的索引。
    // result 本身‌不一定是最终的子序列‌，它只是记录“长度为 i 的递增子序列的最小末尾元素”在原数组中的位置。
    // 没有 result 就没法得知和谁比对。
    const result = [0]; 
    // p 数组‌：记录每个元素在构建过程中的‌前驱索引‌，用于最后回溯出完整的子序列。
    // p 的索引就是当前新节点序列索引，P 的索引值就是上一个最大值在新节点序列索引值。回溯的起点是从尾部开始算，第一个值不为0的索引开始。
    // p 才是真正记录最终‌最长递增子序列的数组。
    const p = result.slice(0);  
    const len = arr.length;
    let start;
    let end;
    let middle;
    for(let i = 0; i < len; i++) { 
      const arrI = arr[i];
      // 过滤匹配为空的节点
      if(arrI !== 0) {
        // result[result.length - 1]是最大值的索引
        let resultLastIndex = result[result.length - 1];
        // 对比之前的最大值和新序列的值，如果大于直接追加到 result 末尾。
        if(arr[resultLastIndex] < arrI) {
          p[i] = result[result.length - 1];
          result.push(i);  
          continue
        } 
      }
      // ‌二分查找‌：否则，在 result 中找到第一个大于等于 arrI 的元素位置，并用当前索引替换它，同时记录前驱。
      // 假设情况是2 4 9 10 7 8 11，我们要尽量增加可能性来保证序列足够长，此时到7，7小于9，那么替换掉9，10因为乱序了，在这时候也应该被抛弃，7的上一个节点是4，所以p回溯就不会碰到10。
      start = 0;
      end = result.length - 1; 
      while(start < end) {
        middle = (start + end) / 2 | 0;
        if(arr[result[middle]] < arrI) {
          start = middle + 1;
        } else {
          end = middle
        }
      }
      if(arrI < arr[result[start]]) {
        p[i] = result[start - 1];
        result[start] = i;
      }
    }
    // 回溯‌：遍历结束后，通过 p 数组从最后一个元素开始回溯，重构出完整的最长递增子序列索引。
    let l = result.length;
    let last = result[l - 1];
    while(l-- > 0) {
      result[l] = last;
      last = p[last];
    }
    return result
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