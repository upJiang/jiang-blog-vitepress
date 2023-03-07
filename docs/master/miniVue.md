
简单版 miniVue
- 在 get 中收集依赖，在 set 中去派发更新，执行收集的函数

euv.js
```
/**
 * 观察某个对象的所有属性
 * @param {Object} obj
 */
function observe(obj) {
  for (const key in obj) {
    let internalValue = obj[key];
    let funcs = [];
    Object.defineProperty(obj, key, {
      get: function () {
        //  依赖收集，记录：是哪个函数在用我
        if (window.__func && !funcs.includes(window.__func)) {
          funcs.push(window.__func);
        }
        return internalValue;
      },
      set: function (val) {
        internalValue = val;
        // 派发更新，运行：执行用我的函数
        for (var i = 0; i < funcs.length; i++) {
          funcs[i]();
        }
      },
    });
  }
}

function autorun(fn) {
  window.__func = fn;
  fn();
  window.__func = null;
}
```
index.js
```
var user = {
  name: 'jjj',
};

observe(user); // 观察

// 显示姓氏
function showFirstName() {
  document.querySelector('#firstName').textContent = '姓：' + user.name;
}

autorun(showFirstName);
```
index.html
```
<div class="card">
    <p id="firstName"></p>
</div>
<input type="text" oninput="user.name = this.value" />
<script src="./euv.js"></script>
<script src="./index.js"></script>
``` 
- 首先会执行 `observe(user)`，开启监听
- 然后执行 `autorun(showFirstName)`，将 `showFirstName` 这个方法放到监听的的收集中去，当触发了监听时，就会自动执行该方法
- 当在 `input`中修改 name 值时，就会执行收集的方法 `showFirstName`