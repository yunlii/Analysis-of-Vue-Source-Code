
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

  function setRef(rawRef, vnode) {
    let value = vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT ? 
    vnode.component.exposed || vnode.component.proxy : vnode.el;
    if(isRef(rawRef)) {
      rawRef.value = value;
    } 
  }
  

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