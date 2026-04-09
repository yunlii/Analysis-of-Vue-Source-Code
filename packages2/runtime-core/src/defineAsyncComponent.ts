import { ref } from "packages2/reactivity/src";
import { h } from "./h";
import { isFunction, isObject } from "packages2/shared/src";

export function defineAsyncComponent(options) {
  if(isFunction(options)) {
    options = { loader: options }
  }
  return {
    setup() {
      const { 
        loader, 
        errorComponent, 
        timeout, 
        delay, 
        loadingComponent, 
        onError 
      } = options;
      const loaded = ref(false);
      const loading = ref(false);
      const error = ref(false);

      let loadingTimer = null;

      if(delay) {
        setTimeout(() => {
          loading.value = true;
        }, delay)
      }

      let Comp = null;
      let attempts = 0;

      function loadFunc() {
        return loader().catch((err) => {
          if(onError) {
            return new Promise((resolve, reject) => {
              const retry = () => resolve(loadFunc());
              const fail = () => reject(err);
              
              onError(err, retry, fail, ++attempts);
            })
          } else {
            throw err;
          }
        })
      }

      // loadFunc().then(loader()).loader();      

      loadFunc()
        .then((comp) => {
          Comp = comp;
          loaded.value = true;
        })
        .catch(err => {
          error.value = err;
        })
        .finally(() => {
          loading.value = false;
          clearTimeout(loadingTimer);
        });
        
        if(timeout) {
          setTimeout(() => {
            error.value = true;
            throw new Error("组件加载失败");
          }, timeout)
        }
      
      const placeholder = h("div");

      return () => {
        if(loaded.value) {
          return h(Comp);
        } else if(errorComponent && error.value) {
          return h(errorComponent);
        } else if(loadingComponent && loading.value) {
          return h(loadingComponent);
        } else {
          return placeholder;
        }
      }
    }
  }
}