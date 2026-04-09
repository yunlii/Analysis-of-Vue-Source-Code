import { createCallExpression, createObjectExpression, createVNodeCall, NodeTypes } from "./ast";
import { CREATE_ELEMENT_BLOCK, CREATE_ELEMENT_VNODE, CREATE_TEXT_VNODE, OPEN_BLOCK, TO_DISPLAY_STRING, Fragment } from "./runtimeHelpers";
import { PatchFlags } from "packages2/shared/src";
export { transform };

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

function isText(node) {
  return node.type === NodeTypes.INTERPOLATION || node.type === NodeTypes.TEXT;
}

function transformText(node, context) { 
  if(NodeTypes.ELMENT === node.type || NodeTypes.ROOT === node.type) {
    return function() {
      const children = node.children;
      let container = null;
      let hasText = false;
      for(let i = 0; i < children.length; i++) {
        let child = children[i];
        if(isText(child)) {
          hasText = true;
          for(let j = 1; j < children.length; j++) {
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
      if(!hasText || children.length == 1) {
        return;
      }
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

function transformExpression(node, context) {
  if(NodeTypes.INTERPOLATION === node.type) {
    node.content.content = `_ctx.${node.content.content}`;
  }
}

function createTransformContext(root) {
  const context = {
    currentNode: root,
    parent: null,
    transformNode: [
      transformElement,
      transformText,
      transformExpression
    ],
    helpers: new Map(),
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

function traverseNode(node, context) {
  context.currentNode = node;
  const transforms = context.transformNode;
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

function createRootCodeGenNode(ast, context) {
  let { children } = ast;
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
