import { CREATE_ELEMENT_VNODE, CREATE_TEXT_VNODE, Fragment } from "./runtimeHelpers";

export enum NodeTypes {
  ROOT,
  ELMENT,
  TEXT,
  COMMENT,
  SIMPLE_EXPRESSION,
  INTERPOLATION,
  ATTRIBUTE,
  DIRECTIVE,
  // containers
  COMPOUND_EXPRESSION,
  IF,
  IF_BRANCE,
  FOR,
  TEXT_CALL,
  // codegen
  VNODE_CALL,
  JS_CALL_EXPRESSION,
  JS_OBJECT_EXPRESSION,
  JS_PROPERTY,
  JS_ARRAY_EXPRESSION,
  JS_FUNCTION_EXPORESSION,
  JS_CONDITIONAL_EXPRESSION,
  JS_CACHE_EXPORESSION,
}

export function createCallExpression(context, args) {
  context.helper(CREATE_TEXT_VNODE);
  return {
    type: NodeTypes.JS_CALL_EXPRESSION,
    arguments: args,
  }
}

export function createVNodeCall(context, tag, props, children) {
  let name
  if(tag !== Fragment) {
    name = context.helper(CREATE_ELEMENT_VNODE);
  }
  return {
    type: NodeTypes.VNODE_CALL,
    callee: name,
    tag, 
    props, 
    children
  }
}

export function createObjectExpression(properties) {
  return {
    type: NodeTypes.JS_OBJECT_EXPRESSION,
    properties 
  }
}