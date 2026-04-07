import { nodeOps } from "./nodeOps";
import patchProp from "./patchProp";
import { createRenderer } from "@vue/runtime-core"

const renderOptions = Object.assign({ patchProp }, nodeOps);

export { renderOptions };
export * from '@vue/runtime-core';


export const render = (vnode, container) => {
  createRenderer(renderOptions).render(vnode, container); 
}
