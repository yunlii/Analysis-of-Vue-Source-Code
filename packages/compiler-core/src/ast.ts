import { CREATE_ELEMENT_VNODE, CREATE_TEXT_VNODE, Fragment } from "./runtimeHelpers";


export enum NodeTypes {
  // 实际上就三种：元素、文本、表达式节点
  ROOT,  // 根节点，代表整个模板的顶层
  ELMENT, // 元素节点，比如 <div>、<span> 这类 HTML 标签
  TEXT, // 文本节点，模板里的纯文本内容
  COMMENT,  // 注释节点，HTML 注释 <!-- -->
  SIMPLE_EXPRESSION, // 简单表达式节点，比如 v-if="msg !== 'hello'" 中的 msg !== 'hello'
  INTERPOLATION, // 双大括号插值节点，比如 {{ msg }}
  ATTRIBUTE, // 属性节点，比如 title="标题"
  DIRECTIVE, // 指令节点，比如 v-if、v-for
  // containers
  COMPOUND_EXPRESSION, // 复合表达式节点。比如 v-bind 的值 foo + bar。
  IF, // v-if 指令节点。条件分支节点。
  IF_BRANCE,
  FOR,
  TEXT_CALL, // 文本调用节点。当元素有多个子节点且包含动态文本时，编译器会生成一个 TEXT_CALL 节点，用于在运行时高效拼接文本内容。
  // codegen
  VNODE_CALL, // 虚拟节点调用节点。代表一个创建 VNode 的函数调用，如 _createVNode(...)。
  JS_CALL_EXPRESSION, // JavaScript 函数调用表达式节点。通用函数调用，如 _toDisplayString(msg)。
  JS_OBJECT_EXPRESSION, // JavaScript 对象表达式节点。用于表示对象字面量，如 { key: value }。
  JS_PROPERTY, // JavaScript 属性节点。是 JS_OBJECT_EXPRESSION 的子节点，代表对象中的一个键值对。
  JS_ARRAY_EXPRESSION, // JavaScript 数组表达式节点。用于表示数组字面量，如 [item1, item2]
  JS_FUNCTION_EXPORESSION, // JavaScript 函数表达式节点。用于表示函数定义，如 () => { ... }。
  JS_CONDITIONAL_EXPRESSION, // JavaScript 条件表达式节点。用于表示三元表达式，如 show ? a : b。
  JS_CACHE_EXPORESSION, // JavaScript 缓存表达式节点。用于表示对值的缓存，优化重复计算，如 $cache || ($cache = ...)。
}

// AST结构类似于
// {
//   type: 'ELEMENT',    // 这是一个元素节点
//   tag: 'div',
//   props: [            // 属性节点都在这个数组里
//     { type: 'ATTRIBUTE', name: 'class', value: 'box' },
//     { type: 'DIRECTIVE', name: 'if', value: 'show' }
//   ],
//   children: [         // 子节点才是真正的树分支
//     { type: 'TEXT', content: '...' }
//   ]
// }

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