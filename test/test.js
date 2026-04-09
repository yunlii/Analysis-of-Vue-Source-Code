// let People = new Proxy(
//   { _name: 'zky', get name() { return this._name; } },
//   {
//     get(target, prop, receiver) {
//       // ❌ 使用 target[prop]，getter 内的 this 指向 target
//       // return target[prop]; // 返回 'zky'

//       // ✅ 使用 Reflect.get 并传递 receiver，this 正确指向调用者
//       return Reflect.get(target, prop, receiver); // 返回调用者的 _name
//     }
//   }
// );

// let Man = { _name: 'zky_man' };
// Man.__proto__ = People;

// console.log(Man.name); // 使用 Reflect.get 时输出 'zky_man'，使用 target[prop] 则输出 'zky'

// function a(a,b) {
//   console.log(a[b]);
// }

// a({a:1,b:2}, 'b');   

let obj = { a: 1 };
console.log(obj.b.a);

