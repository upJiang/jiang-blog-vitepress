1.flex 方案：
```
display: flex;
justify-content: center;
align-items: center;
```
2.绝对定位+translate(不知子div的宽高)，若已知子div宽高直接用margin调节负值即可
```
position: absolute;
top: 50%;
left: 50%;
transform: translate(-50%, -50%);
```
3.让一段内容(如文本)在div中居中
```
.parent {
    display: table;   //1111
    width: 300px;
    height: 300px;
    text-align: center;
}
.son  {
    display: table-cell;  //222
    height: 200px;
    background-color: yellow;
    vertical-align: middle;  //333
}
```
4.margin:0 auto   让元素水平居中

5. 使用inline-block 和 text-align实现
```
.parent{text-align: center;}
.child{display: inline-block;}
```
6.垂直居中 vertical-align  
```
/*第一种方法*/.parent{display:table-cell;vertical-align:middle;height:20px;}
/*第二种方法*/.parent{display:inline-block;vertical-align:middle;line-height:20px;}
```
7.让img垂直居中
```
/**<img>的容器设置如下**/
{
    display:table-cell;
    text-align:center;
    vertical-align:middle;
}
```
8.垂直居中(子容器宽度高度位置，且父容器不是相对定位而是fixed定位)
```
//父容器
.el-overlay {
        position:fixed;
        top:0px;
    text-align: center;
}
.el-overlay:after {
    content: '';
    display: inline-block;
    height: 100%;
    vertical-align: middle;
}
//子容器，会导致里面的居中，这个是个问题
.el-dialog {
    text-align:left;  //让子容器的文字不居中
    display: inline-block;
    vertical-align: middle;
}
```
