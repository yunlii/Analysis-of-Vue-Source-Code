/**
 * -------------------------------------------------------------
 * effect 正是响应式数据与页面渲染之间的‌核心桥梁‌。reactive是监听器，触发的是effect。
 * 它的工作是1、追踪依赖‌；2、触发更新‌。
 * 一个页面会有一个effect函数，这个effect的意思是当数据发生变动而产生的影响，effect不单单服务于页面，也可以是其它特征watch、computed。
 * 整个调用链：
 * 创建一个数据的监听器(reactive)，effect绑定响应函数，首次运行响应函数读取被监听的数据，数据被读取，触发依赖收集。当数据监听器监听到数据变动，触发依赖收集中的effect去执行副作用函数。
 * ~~~~~~~~~~~~~~~~~
 * 你可能会拓展思考，为什么一个页面一个effect，然后每个数据收集对应的effect，而不是反过来。
 * 我们以反过来的视角来看，页面本身作为更新存在，它收集effect(数据)，数据更新去更新特定的effect，effect再去找特定的页面。
 * 你会发现也能实现，但性能不太好。因为如果以一个页面一个effect来的话，只要数据变化其收集的effect全都要更新，而不用去检索。
 * ~~~~~~~~~~~~~~~~~
 * -------------------------------------------------------------
 * 
 */

import { DirtyLevels } from "./constants";

export let activeEffect;

// 解决了get重复的问题，get重复并不会重新收集，但没有解决set重新手机的问题。
// 1.即使依赖没变值变了会触发重新收集，重新收集一次浪费新能，只需fn就能解决，不知是否有意为之。
// 2.依赖变化之后，会触发依赖重新收集，如果在顺序没有改变的时候diff时间复杂度很低，
// 反之如果三元表达式在没有读取state的情况下，顺序会改变，效率会变慢。
// 总之可靠性没问题，性能看看能不能完善。
// 还有一点工作没有完成就是dep的删除。
/**
 * 清楚依赖收集的effect
 * @param dep 
 * @param effect 
 */
function cleanDepEffect(dep, effect) {
  dep.delete(effect);
  if(dep.size == 0) {
    dep.cleanup();
  }
}


/**
 * 优化：依赖清理
 * _trackId 追踪批次，用于判断是否是本轮依赖收集。
 * _depsLength 把副作用函数中引用的响应式变量存入deps。
 * deps 用于存储该副作用所依赖的所有 Dep 对象, Dep是页面依赖的数据。
 * fn 是副作用函数本身、scheduler 是自定义调度器。
 * active 是否在依赖收集中。
 * _dirtyLevel 标记副作用是否需要重新执行, computed实现缓存的关键。
 * run()‌ 执行副作用函数。
 * stop()‌ 停止副作用。
 */
export class ReactiveEffect {
  _trackId = 0; 
  deps = [];
  _depsLength = 0; 
  _running = 0;
  public active = true;
  constructor(public fn,public scheduler ) { }
  // 为 computed 创建
  _dirtyLevel = DirtyLevels.Dirty;
  public get dirty() {
    return this._dirtyLevel === DirtyLevels.Dirty;
  }
  public set dirty(value) {
    this._dirtyLevel = value ? DirtyLevels.Dirty : DirtyLevels.NoDirty;
  }
  // 
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

/**
 * 状态清除。清除当下页面的引用数据的effect，重新收集。
 * @param effect 
 */
function preCleanEffect(effect) {
  effect._depsLength = 0;
  effect._trackId++;
}

/**
 * 在依赖收集完成收，清理多余的effect.deps和依赖收集的effect。
 * @param effect 
 */
function postCleanEffect(effect) {
  if(effect.deps.length > effect._depsLength) {
    for(let i = effect._depsLength; i < effect.deps.length; i++) {
      cleanDepEffect(effect.deps[i], effect);
    }
    effect.deps.length = effect._depsLength;
  }
}

/**
 * 做key的effect的收集。
 * @param effect 
 * @param dep 
 */
export function trackEffect(effect, dep) {
  // 如果值不等于当前的 _trackId，说明这是本轮收集周期中第一次遇到这个依赖，需要处理。
  if(dep.get(effect) !== effect._trackId) {
    dep.set(effect, effect._trackId);
    // 做deps复用。_depsLength每轮依赖收集都从0开始。
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

/**
 * @param fn 
 * @param options 
 * @returns 
 */
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