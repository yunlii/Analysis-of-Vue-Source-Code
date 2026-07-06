/**
 * transform做了两件事。1、为虚拟节点生成做一个生成树。2、为后续生成虚拟DOM做优化。
 * parse只完成了“语法”分析；transform 注入“语用”信息；
 * transform 阶段通过遍历 AST 并应用各种转换插件，为这棵“语法”树注入“语用”信息，让它能表达‌运行时的实际行为‌。
 * 优化方面：‌静态提升、PatchFlags‌、节点合并
 */

import { createCallExpression, createObjectExpression, createVNodeCall, NodeTypes } from "./ast";
import { CREATE_ELEMENT_BLOCK, CREATE_ELEMENT_VNODE, CREATE_TEXT_VNODE, OPEN_BLOCK, TO_DISPLAY_STRING, Fragment } from "./runtimeHelpers";
import { PatchFlags } from "packages2/shared/src";
export { transform };


function createTransformContext(root) {
  const context = {
    currentNode: root,  // 前转换逻辑正在处理哪个 AST 节点。
    parent: null,  // 记录当前节点的父节点，用于构建父子关系。在转换子节点时，需要知道它的父节点是谁，这样才能正确地将转换后的子节点挂载到父节点上。
    // 每种节点类型应该由哪个函数来处理‌。
    transformNode: [   
      transformElement,
      transformText,
      transformExpression
    ],
    helpers: new Map(),
    // 为了优化最终生成的代码，并不会把所有的函数都导入，确保最终生成的代码只导入真正用到的函数，避免冗余。当被引用次数为0的时候，函数就会被移除。
    helper(name) {
      let count = context.helpers.get(name) || 0; 
      context.helpers.set(name, count + 1);
    },
    removeHelper(name) {
      let count = context.helpers.get(name);
      if(count) {
        let c = count - 1;
        if(!c) {
          context.helpers.delete(name);
        } else {
          context.helpers.set(name, c);
        }
      }
    }
  }
  return context;
}

/**
 * 为元素节点创建 createVNodeCall，明确它‌如何被渲染。
 * @param node 
 * @param context 
 * @returns 
 */
function transformElement(node, context) {
  if(NodeTypes.ELMENT === node.type) {
    return function() {
      let { tag, props, children } = node;
      let vnodeTag = tag;
      let properties = [];
      for(let i = 0; i < props.length; i++) {
        properties.push({key: props[i].name, value: props[i].value}); 
      }

      const propsExpression = properties.length > 0 ? createObjectExpression(properties) : null;
      let vnodeChildren = null;
      if(children.length == 1) {
        vnodeChildren = children[0];
      } else if(children.length > 1) {
        vnodeChildren = children;
      }

      node.codeGenNode = createVNodeCall(context, vnodeTag, propsExpression, vnodeChildren);

    }
  }
}

// -------------------------------------------------------------
/**
 * 
 * @param node 
 * @param context 
 * @returns 
 */
function transformText(node, context) { 
  if(NodeTypes.ELMENT === node.type || NodeTypes.ROOT === node.type) {
    return function() {
      const children = node.children;
      let container = null;
      let hasText = false;
      // 合并优化‌：将相邻的静态文本和动态插值合并成一个复合表达式，减少运行时需要处理的虚拟节点数量。
      // "Hello " 和 {{ name }} 会被合并成一个复合表达式节点，表示 "Hello " + name。
      for(let i = 0; i < children.length; i++) {
        let child = children[i];
        if(isText(child)) {
          hasText = true;
          for(let j = i + 1; j < children.length; j++) {
            const next = children[j];
            if(isText(next)) {
              if(!container) {
                container = children[i] = {
                  type: NodeTypes.COMPOUND_EXPRESSION,
                  children: [child]
                }
              }
              container.children.push(`+`, next);
              children.splice(j, 1);
              j--;
            } else {
              container = null;
              break;
            }
          }
        }
      }
      // 没有文本节点，或者子节点只剩一个（无需合并），则直接返回。
      if(!hasText || children.length == 1) {
        return;
      }
      // ‌代码生成准备‌：为所有文本内容创建 createTextVNode 调用节点，并正确标记动态内容，为后续的 codegen 阶段铺平道路。
      // 对于每个文本节点或上一步生成的复合表达式节点，创建一个 TEXT_CALL 类型的节点。
      // 调用 createCallExpression 生成一个 createTextVNode 的函数调用节点，并将其赋值给 codeGenNode。
      // 如果子节点不是纯文本（是复合表达式），还会添加 PatchFlags.TEXT 标记，告诉运行时这是动态文本。
      for(let i = 0; i < children.length; i++) {
        const child = children[i];
        if(isText(child) || child.type === NodeTypes.COMPOUND_EXPRESSION) {
          const args = [];
          args.push(child);
          if(child.type !== NodeTypes.TEXT) {
            args.push(PatchFlags.TEXT);
          } 

          children[i] = {
            type: NodeTypes.TEXT_CALL,
            content: child,  
            codeGenNode: createCallExpression(context, args)
          }
        }
      }
    }
  }
} 

function isText(node) {
  return node.type === NodeTypes.INTERPOLATION || node.type === NodeTypes.TEXT;
}

// -------------------------------------------------------------

/**
 * 为插值表达式中的变量添加上下文前缀‌，使其在运行时能正确地从组件实例上获取数据，模板里的变量最终都需要通过组件实例的上下文（_ctx）来访问。
 * @param node 
 * @param context 
 */
function transformExpression(node, context) {
  if(NodeTypes.INTERPOLATION === node.type) {
    node.content.content = `_ctx.${node.content.content}`;
  }
}

// -------------------------------------------------------------

/**
 * 
 * @param node 
 * @param context 
 */
function traverseNode(node, context) {
  context.currentNode = node;
  const transforms = context.transformNode;
  // 父节点的转换逻辑依赖于子节点全部处理完毕后的最终状态。
  // 返回函数是为了实现延迟执行机制。
  // [例]
  // children: [{ type: TEXT, content: "Hello " }, { type: INTERPOLATION, content: "name" }]
  // 如果父结点直接执行，会合并成Hello + name而不是Hello + _ctx.name
  const exits = [];
  for(let i = 0; i < transforms.length; i++) {
    let exit = transforms[i](node, context);
    exit && exits.push(exit);
  }

  switch(node.type) {
    case NodeTypes.ROOT:
    case NodeTypes.ELMENT:
      for(let i = 0; i < node.children.length; i++) {
        context.parent = node;
        traverseNode(node.children[i], context);
      }
      break;
    case NodeTypes.INTERPOLATION:
      context.helper(TO_DISPLAY_STRING);
      break;
  }
  let i = exits.length;
  if(i > 0) {
    while(i--) {
      exits[i]();
    }
  }
}

/**
 * 根据子节点数量，决定根节点的渲染方式，并优化根节点的代码生成‌。
 * @param ast 
 * @param context 
 */
function createRootCodeGenNode(ast, context) {
  let { children } = ast;
  // 只有一个子元素时，直接复用 codeGenNode 作为根节点的 codeGenNode。
  if(children.length == 1) {
    let child = children[0];
    if(NodeTypes.ELMENT === child.type) {
      ast.codeGenNode = child.codeGenNode;
      context.removeHelper(CREATE_ELEMENT_VNODE);
      context.helper(CREATE_ELEMENT_BLOCK);
      context.helper(OPEN_BLOCK);
      ast.codeGenNode.isBlock = true;
    } else {
      ast.codeGenNode = child;
    }
  // 调用 createVNodeCall 创建一个 Fragment 包裹所有子节点。
  } else if(children.length > 0) {
    ast.codeGenNode = createVNodeCall(context, context.helper(Fragment), undefined, children);
    context.helper(CREATE_ELEMENT_BLOCK);
    context.helper(OPEN_BLOCK);
    ast.codeGenNode.isBlock = true;
  }
}


function transform(ast) {
  const context = createTransformContext(ast);
  traverseNode(ast, context);

  createRootCodeGenNode(ast, context);

  ast.helpers = [...context.helpers.keys()];
}