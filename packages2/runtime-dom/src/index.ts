

import { nodeOps } from "./nodeOps";
import patchProp from "./patchProp";
import { createRenderer } from "packages2/runtime-core/src"

const renderOptions = Object.assign({ patchProp }, nodeOps);

export { renderOptions };
export * from 'packages2/runtime-core/src';


export const render = (vnode, container) => {
  createRenderer(renderOptions).render(vnode, container);
}
