## 词法分类

- WhiteSpace 空白字符
- LineTerminator 换行符
- Comment 注释
- Token 词
  - IdentifierName 标识符名称，典型案例是我们使用的变量名，注意这里关键字也包含
    在内了。
  - Punctuator 符号，我们使用的运算符和大括号等符号。
  - NumericLiteral 数字直接量，就是我们写的数字。
  - StringLiteral 字符串直接量，就是我们用单引号或者双引号引起来的直接量。
  - Template 字符串模板，用反引号` 括起来的直接量。

## 空白符号 Whitespace

> 说起空白符号，想必给大家留下的印象就是空格，但是实际上，JavaScript 可以支持更
> 多空白符号。

很多公司的编码规范要求 JavaScript 源代码控制在 ASCII 范围内，那么，就只有 五种空
白可用了。

## 换行符 LineTerminator

JavaScript 中只提供了 4 种字符作为换行符:

- < LF > 是 U+000A，就是最正常换行符，在字符串中的\n。
- < CR > 是 U+000D，这个字符真正意义上的“回车”，在字符串中是\r，在一部分 Windows
  风格文本编辑器中，换行是两个字符\r\n。
- < LS > 是 U+2028，是 Unicode 中的行分隔符。
- < PS > 是 Unicode 中的段落分隔符。

## 注释 Comment

JavaScript 的注释分为单行注释和多行注释两种：

```
/* MultiLineCommentChars */
// SingleLineCommentChars
```

除了四种 LineTerminator 之外，所有字符都可以作为单行注释。

## 标识符名称 IdentifierName

IdentifierName 可以以美元符“$”、下划线“\_”或者 Unicode 字母开始，除了开始字符以
外，IdentifierName 中还可以使用 Unicode 中的连接标记、数字、以及连接符号。也就是
变量名

IdentifierName 的任意字符可以使用 JavaScript 的 Unicode 转义写法，使用 Unicode
转义写法时，没有任何字符限制。

IdentifierName 可以是 Identifier、NullLiteral、BooleanLiteral 或者 keyword，在
ObjectLiteral 中，IdentifierName 还可以被直接当做属性名称使用。

仅当不是保留字的时候，IdentifierName 会被解析为 Identifier。

**关键字**也属于这个部分，在 JavaScript 中，关键字有:

```
await break case catch class const continue debugger default delete do else export extends finally for function if import instance of new return super switch this throw try typeof var void while with yield
```

除了上述的内容之外，还有 1 个为了未来使用而保留的关键字:enum

在严格模式下, 有一些额外的为未来使用而保留的关键字:

```
implements package protected interface private public
```

除了这些之外，NullLiteral（null）和 BooleanLiteral（true false）也是保留字，不能
用于 Identifier。

## 符号 Punctuator

```
{ ( ) [ ] . ... ; , < > <= >= == != === !== + - * % ** ++ -- << >> >>> & | ^ ! ~ && || ? : = += -= *= %= **= <<= >>= >>>= &= |= ^= => / /= }
```

## 数字直接量 NumericLiteral

JavaScript 规范中规定的数字直接量可以支持四种写法：十进制数、二进制整数、八进制
整数和十六进制整数。

#### 为什么 12.toString()会报错

12. 会被当作省略了小数点后面部分的数字，而单独看成一个整体，所以我们要想让点单独
    成为一个 token，就要加入空格，这样写

```
12 .toString()
```

数字直接量还支持科学计数法，例如：

```
10.24E+2
10.24e-2
10.24e2
```

这里 e 后面的部分，只允许使用整数。当以 0x 0b 或者 0o 开头时，表示特定进制的整数
：

```
0xFA
0o73
0b10000
```

上面这几种进制都不支持小数，也不支持科学计数法。

## 字符串直接量 StringLiteral

JavaScript 中的 StringLiteral 支持单引号和双引号两种写法。

```
" DoubleStringCharacters "
' SingleStringCharacters '
```

单双引号的区别仅仅在于写法，在双引号字符串直接量中，双引号必须转义，在单引号字符
串直接量中，单引号必须转义。字符串中其他必须转义的字符是\和所有换行符。

## 正则表达式直接量 RegularExpressionLiteral

正则表达式由 Body 和 Flags 两部分组成，例如：

```
/RegularExpressionBody/g
```

其中 Body 部分至少有一个字符，第一个字符不能是 _（因为 /_ 跟多行注释有词法冲突）
。正则表达式有自己的语法规则，在词法阶段，仅会对它做简单解析。

## 字符串模板 Template

模板字符串不需要关心大多数字符的转义，但是至少 ${ 和 ` 还是需要处理的。

```
`a${b}c${d}e`
```
