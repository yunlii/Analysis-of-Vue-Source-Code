export var NodeTypes;
(function (NodeTypes) {
    NodeTypes[NodeTypes["ROOT"] = 0] = "ROOT";
    NodeTypes[NodeTypes["ELMENT"] = 1] = "ELMENT";
    NodeTypes[NodeTypes["TEXT"] = 2] = "TEXT";
    NodeTypes[NodeTypes["COMMENT"] = 3] = "COMMENT";
    NodeTypes[NodeTypes["SIMPLE_EXPRESSION"] = 4] = "SIMPLE_EXPRESSION";
    NodeTypes[NodeTypes["INTERPOLATION"] = 5] = "INTERPOLATION";
    NodeTypes[NodeTypes["ATTRIBUTE"] = 6] = "ATTRIBUTE";
    NodeTypes[NodeTypes["DIRECTIVE"] = 7] = "DIRECTIVE";
    // containers
    NodeTypes[NodeTypes["COMPOUND_EXPRESSION"] = 8] = "COMPOUND_EXPRESSION";
    NodeTypes[NodeTypes["IF"] = 9] = "IF";
    NodeTypes[NodeTypes["IF_BRANCE"] = 10] = "IF_BRANCE";
    NodeTypes[NodeTypes["FOR"] = 11] = "FOR";
    NodeTypes[NodeTypes["TEXT_CALL"] = 12] = "TEXT_CALL";
    // codegen
    NodeTypes[NodeTypes["VNODE_CALL"] = 13] = "VNODE_CALL";
    NodeTypes[NodeTypes["JS_CALL_EXPRESSION"] = 14] = "JS_CALL_EXPRESSION";
    NodeTypes[NodeTypes["JS_OBJECT_EXPRESSION"] = 15] = "JS_OBJECT_EXPRESSION";
    NodeTypes[NodeTypes["JS_PROPERTY"] = 16] = "JS_PROPERTY";
    NodeTypes[NodeTypes["JS_ARRAY_EXPRESSION"] = 17] = "JS_ARRAY_EXPRESSION";
    NodeTypes[NodeTypes["JS_FUNCTION_EXPORESSION"] = 18] = "JS_FUNCTION_EXPORESSION";
    NodeTypes[NodeTypes["JS_CONDITIONAL_EXPRESSION"] = 19] = "JS_CONDITIONAL_EXPRESSION";
    NodeTypes[NodeTypes["JS_CACHE_EXPORESSION"] = 20] = "JS_CACHE_EXPORESSION";
})(NodeTypes || (NodeTypes = {}));
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
