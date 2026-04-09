function createInvoker(value) {
  const invoker = (e) => invoker.value(e);
  invoker.value = value;
  return invoker;
}
export default function patchEvent(el, name, nextValue) {
  const invokers = el._vei || (el._vei = {});
  const eventName = name.slice(2).toLowerCase();
  const existingInvokers = invokers[eventName];
  if(nextValue && existingInvokers) {
    return existingInvokers.value = nextValue;
  }
  if(nextValue) {
    const invoker = (invokers[eventName] = createInvoker(nextValue));
    return el.addEventListener(eventName, invoker);
  } 
  if(existingInvokers) {
    el.removeEventListener(eventName, existingInvokers);
    invokers[eventName] = undefined;
  }
}