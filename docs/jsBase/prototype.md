![Image.png](https://i.loli.net/2021/08/01/ojERdvUwStL731m.png)
![Image.png](https://i.loli.net/2021/08/01/ibBQTpKfek8NyVW.png)
var M = function(name){ this.name = name}  //构造函数

var obj = new M("jiang")  //new一个实例

原型链的根就是Object.prototype

那么：M.prototype  会输出
![Image.png](https://i.loli.net/2021/08/01/USp7banAM3LDTNt.png)
那么就有：M.prototype.constructor 就会等于 === M
然后我们再new一个实例 <br/>
var obj2 = new M('jun')<br/>
此时 obj2._proto_ === M.prototype <br/>

从一个实例对象向上找有一个构造实例的原型对象，这个原型对象又有构造它的上一级原型对象，如此一级一级的关系链，就构成了原型链。原型链的最顶端就是Object.prototype

原型链最重要的作用就是继承，实例来继承上一级的属性或方法。此外，如果有多个实例，而多个实例存在共同方法，或共同属性，我们不想每一个实例都创建一份这些属性或方法，就可以将这些属性存在原型对象上，实例一样可以使用这些属性或方法