节流： 多次触发同一个函数，同一段时间内只执行一次，所以节流会稀释函数的执行频率

>可以看出节流的主要原理就是利用时间差（当前和上次执行）来过滤中间过程触发的函数执行。控制是否在开始时会立即触发一次，及最后一次触发是否执行,添加取消的功能
```
function throttle(fn, wait, options = { leading: true, trailing: false }) {
    let timer;
    let previous = 0;

    const { leading, trailing } = options;

    const throttled = function (...args) {
        const now = +new Date();

        if (leading === false && !previous) previous = now;
        if (timer) clearTimeout(timer);

        if (now - previous > wait) {
            fn.apply(this, args);
            previous = now;
        } else if (trailing) {
            // 更新timer
            timer = setTimeout(() => {
                fn.apply(this, args);
                previous = 0;
                timer = null;
            }, wait);
        }
    }
    throttled.cancel = () => {
        clearTimeout(timer);
        timer = null;
        previous = 0;
    }

    return throttled;
}
```

防抖： 按最后一次算。比如说“停止输入5s后才发送请求”，防止多次点击  (比较常用)

>可以看出debounce函数的实现原理就是通过计时器延迟函数执行，短时间内再次触发时重置并添加新计时器。
```
//第一次触发可以立即执行，并且有取消功能
function debounce(fn, wait = 1000, immediate = false) {
  let timer = null;

  function debounced(...args) {
    // 重置计时器
    if (timer) clearTimeout(timer);

    // 首次立即执行
    if (immediate && !timer) {
      fn.apply(this, ...args);

      timer = setTimeout(() => {
        timer = null;
      }, wait);

      return;
    }

    // 新计时器
    timer = setTimeout(() => {
      fn.apply(this, ...args);
      timer = null;
    }, wait);
  }

  debounced.cancel = () => {
    clearTimeout(timer);
    timer = null;
  };

  return debounced;
}
```