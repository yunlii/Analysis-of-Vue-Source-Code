> note：早期大部分的内容学习自B站的《Vue3.4 核心源码解析教程》，除了课程以外的知识都是自己探索的，后面会逐渐一步一步靠近源码。
# 依赖
vue 分为两条路一个是编译时，一个是运行时。
runtime-dom -> runtime-core -> reactivity
runtime-core -> compiler-core
runtime-dom 实际上是runtime-core功能的解耦出来的一部分，承担了对dom的操作逻辑，这样做的原因是分离与平台有关的渲染逻辑‌。

# 模块与功能
## 编译时模块
1. compiler-core: 与平台无关的编译器核心
2. compiler-dom：针对浏览器的编译模块
3. compiler-sfc：针对单文件解析
4. compiler-ssr：针对服务端渲染的编译模块
## 运行时模块
1. runtime-core：与平台无关的渲染逻辑
2. runtime-dom：专为浏览器环境实现 DOM 操作‌
3. runtime-test：用于测试的运行时
## 其它
1. reactivity：响应式系统
2. template-explorer：用于调试编译器输出的开发工具
3. vue-compat：迁移构建，用于兼容vue2
4. shared：多个包之间共享内容
5. ref-transform： 实验性语法，ref转化器
6. size-check：用于测试代码体积
7. 未完待续