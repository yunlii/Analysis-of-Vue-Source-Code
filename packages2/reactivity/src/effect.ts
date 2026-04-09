import { DirtyLevels } from "./constants";

export function effect(fn, options?) {
  const _effect = new ReactiveEffect(fn, () => {
    _effect.run();
  })
  _effect.run();

  if(options) {
    Object.assign(_effect, options);
  }
  const runner = _effect.run.bind(_effect);
  runner.effect = _effect; 

  return runner;
}

export let activeEffect;

function preCleanEffect(effect) {
  effect._depsLength = 0;
  effect._trackId++;
}
function postCleanEffect(effect) {
  if(effect.deps.length > effect._depsLength) {
    for(let i = effect._depsLength; i < effect.deps.length; i++) {
      cleanDepEffect(effect.deps[i], effect);
    }
    effect.deps.length = effect._depsLength;
  }
}

export class ReactiveEffect {
  _trackId = 0;
  deps = [];
  _depsLength = 0; 
  _running = 0;
  _dirtyLevel = DirtyLevels.Dirty;
  public active = true;
  constructor(public fn,public scheduler ) { }
  public get dirty() {
    return this._dirtyLevel === DirtyLevels.Dirty;
  }
  public set dirty(value) {
    this._dirtyLevel = value ? DirtyLevels.Dirty : DirtyLevels.NoDirty;
  }
  run() {
    this._dirtyLevel = DirtyLevels.NoDirty;
    if(!this.active) {
      return this.fn();
    }
    let lastEffect = activeEffect;
    try {
      activeEffect = this;
      preCleanEffect(this);
      this._running++;
      return this.fn();
    } finally {
      this._running--;
      postCleanEffect(this);
      activeEffect = lastEffect;
    }
  }
  stop() {
    if(this.active) {
      this.active = false;
      preCleanEffect(this);
      postCleanEffect(this);
    }
  }
}

// 解决了get重复的问题，get重复并不会重新收集，但没有解决set重新手机的问题。
// 1.即使依赖没变值变了会触发重新收集，重新收集一次浪费新能，只需fn就能解决，不知是否有意为之。
// 2.依赖变化之后，会触发依赖重新收集，如果在顺序没有改变的时候diff时间复杂度很低，
// 反之如果三元表达式在没有读取state的情况下，顺序会改变，效率会变慢。
// 总之可靠性没问题，性能看看能不能完善。
// 还有一点工作没有完成就是dep的删除。
function cleanDepEffect(dep, effect) {
  dep.delete(effect);
  if(dep.size == 0) {
    dep.cleanup();
  }
}

export function trackEffect(effect, dep) {
  if(dep.get(effect) !== effect._trackId) {
    dep.set(effect, effect._trackId);
    let oldDep = effect.deps[effect._depsLength]
    if(oldDep !== dep) {
      if(oldDep) {
        cleanDepEffect(oldDep, effect);
      }
      effect.deps[effect._depsLength++] = dep;
    } else {
      effect._depsLength++;
    }
  }
}

export function triggerEffects(dep) {
  for(const effect of dep.keys()) {
    if(effect._dirtyLevel < DirtyLevels.Dirty) {
      effect._dirtyLevel = DirtyLevels.Dirty;
    }
    if(!effect._running) {
      if(effect.scheduler) {
        effect.scheduler();
      }
    }
  }
}

 