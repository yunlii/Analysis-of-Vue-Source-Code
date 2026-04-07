import patchProp from "./patchProp";

export const nodeOps = {
  createElement: type => document.createElement(type),
  createText: text => document.createTextNode(text),
  parenNode: node => node.parenNode,
  nextSibling: node => node.nextSibling, 
  setText: (node, text) => node.nodeValue = text,
  setElementText(el, text) {
    el.textContent = text;
  },
  insert: (el, parent, anthor) => parent.insertBefore(el, anthor || null),
  remove(el, text) {
    const parent = el.parentNode;
    parent && parent.removeChild(el);
  },
  patchProp: patchProp
}