// 这个是用于为了给运行时做标记的占位符。
// 编译器在生成代码时，用这个 Symbol 来标记“这里需要调用 toDisplayString 函数”，而不是直接写死函数名。
// 比如模板里有 {{ msg }}，最终编译出的渲染函数里会调用 _toDisplayString(msg)，而不是直接 String(msg)。
// ‌统一抽象‌：编译器不需要关心运行时函数的具体实现，只需要用 Symbol 来指代它,这样子
// ‌编译时‌：模板解析成 AST 后，代码生成器（codegen）会遍历 AST 节点。当遇到插值节点 {{ }} 时，就会在生成的代码中插入 TO_DISPLAY_STRING 这个 Symbol 作为标记。
// ‌运行时‌：通过一个映射表 helperNameMap，把 Symbol 转换成实际的函数名 toDisplayString，然后从 Vue 中解构出来使用。
// 类型安全‌：在 TypeScript 中，Symbol 可以作为唯一的类型标识，方便做代码提示和类型检查。比如函数接受一个固定类型的变量的情况。
// 避免命名冲突‌：Symbol 是全局唯一的，不会和用户代码里的变量名冲突。

export const TO_DISPLAY_STRING = Symbol('TO_DISPLAY_STRING'); 
// 将插值表达式里的值安全地转换为字符串‌。安全的意思是当 msg 是 null 或 undefined 时，toDisplayString 会返回空字符串 ''，而不会显示 "null" 或 "undefined"。
export const CREATE_TEXT_VNODE = Symbol('CREATE_TEXT_VNODE');
// 创建一个文本类型的虚拟节点。
// 元素和文本分开是因为文本结构简单。
export const CREATE_ELEMENT_VNODE = Symbol('CREATE_ELEMENT_VNODE');
// 创建一个元素类型的虚拟节点。
export const OPEN_BLOCK = Symbol("OPEN_BLOCK");
// 靶向更新、Block Tree（区块树）、openBlock()、createBlock()、（Dynamic Props）、动态内容：动态子节点（Dynamic Children）、动态属性（Dynamic Props）
// OPEN_BLOCK为靶向更新服务，只对比那些可能发生变化的动态节点，完全跳过静态子树。
// 在当前作用域内，创建一个空数组（通常叫 currentBlock），作为“收集容器”。这相当于告诉系统：“准备好了，接下来要开始收集动态节点了。”。
// 创建虚拟节点‌：在 openBlock 之后创建的节点，如果自身是动态的（带有 patchFlag，如 TEXT、CLASS），就会在创建时‌自动将自己推入‌ currentBlock 数组。
// createBlock()‌：结束收集，将 currentBlock 数组赋值给该 Block 根节点的 dynamicChildren 属性。
// 简单来说就是有两个Children
// 动态内容‌是指那些‌绑定了响应式数据，可能在后续发生变化的节点或属性‌。编译器会通过 patchFlag 来标记它们。
// 动态内容主要分两类：动态子节点（Dynamic Children）和动态属性（Dynamic Props）
// <div>
//   <p>{{ message }}</p>  <!-- 这个 p 标签就是动态子节点 -->
// </div>
// <div :class="myClass" :id="myId"></div>
// 编译器会为这个 <div> 节点生成 patchFlag，并记录下 class 和 id 是动态属性。更新时，diff 算法会直接定位到这个节点，并‌跳过其他静态属性，只对比和更新 class 和 id‌。
// patchFlag做动态标记，dynamicProps 就是记录动态属性。
// 并非所有父节点都有 dynamicChildren，只有那些作为 ‌Block 根节点‌ 的节点才会拥有这个属性。
// Block Tree（区块树）Vue 3 的优化策略并不是把整棵 VNode 树扁平化，而是将其分割成一个个独立的 ‌Block‌。每个 Block 由一个根节点和它内部收集到的所有动态后代节点组成。
// 当一个 Block 内部存在 v-if、v-for 等结构性指令时，它们会创建‌新的 Block‌。此时会形成一个嵌套的 Block。
// 会创建 Block 的情况：
// ‌组件根节点、‌结构性指令（v-if、v-for）、<template> 标签上的结构性指令、动态依赖边界
// 不会创建 Block 的情况
// ‌纯静态内容、简单的动态绑定、‌已被提升（Hoist）的静态节点
export const CREATE_ELEMENT_BLOCK = Symbol("CREATE_ELEMENT_BLOCK");
// 创建元素类型的 Block 根节点‌。还有组件的block，不然每次都要判断是元素还是组件。
export const Fragment = Symbol("Fragment");
export const helperNameMap = {
  [TO_DISPLAY_STRING] : 'toDisplayString',
  [CREATE_TEXT_VNODE] : 'createTextVNode',
  [CREATE_ELEMENT_VNODE] : 'createElementVNode',
  [CREATE_ELEMENT_BLOCK] : 'createElementBlock',
  [OPEN_BLOCK] : 'openBlock',
  [Fragment] : 'Fragment',
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