> 在我的掘金文章上有许多关于项目规范的文章，这里不详细介绍了，直接贴上具体代码，实操

## eslint 规范 
ssr项目考虑以下几点
- 技术栈：React，相对于大项目，React 具备更高的上限和可定制化能力，对函数式编程的思想也更容易领悟，所以针对大型项目，我更推荐大家用 React。
- 是否使用 TypeScript：是，可以有效解决 JS 弱类型导致的相关隐性 Bug。
- 运行环境：SSR 项目同时包括客户端和服务端，所以我们选用浏览器 + node 的环境。
- 模块导入类型：因为包含客户端和服务端，node 层很难避免使用 require,，所以建议选用 ES Modules + Commonjs，没必要对这部分进行 lint 了。
```
yarn add -D eslint eslint-plugin-react @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-simple-import-sort
 
npx eslint --init
```
<a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ccf187e721034454a1b4cb6408aaddaf~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp?">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ccf187e721034454a1b4cb6408aaddaf~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp?)</a>

#### 调整  .eslintrc.js
```
// .eslintrc.js
module.exports = {
  env: {
    browser: true,
    commonjs: true, // ADD, 支持对commonjs全局变量的识别
    es2021: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: "latest",
  },
  plugins: ["react", "@typescript-eslint", "eslint-plugin-simple-import-sort"],
  rules: {
    "react/jsx-uses-react": "off", // 必须增加对import React from 'react',jsx 的页面已经不再需要引入 React了，所以我们去掉这条 lint 规则
    "react/react-in-jsx-scope": "off", // 同上
    "@typescript-eslint/no-var-requires": "off", // 关闭 禁用使用 require 来定义
    "react/display-name": "off", // 关闭组件定义缺少显示名称
    "simple-import-sort/imports": "error", // import 自动排序，eslint-plugin-simple-import-sort 自动修正
    "simple-import-sort/exports": "error",
    "no-duplicate-imports": ["off", { includeExports: true }], // import不能重复重复，自动合并插件 eslint-plugin-import，添加extends：plugin:import/recommended
    "import/no-unresolved": "off",  // 关闭 eslint 无法解析的导入
  },
};
```
在原来的基础上，我们在 env 的配置中加上了commonjs: true，这个是为了支持对 commonjs 全局变量的识别，然后移除了 lint 中的三个规则：
- react/jsx-uses-react：必须增加对 `import React from 'react';` 的引入，在 React 17 之后，jsx 的页面已经不再需要引入 React了，所以我们去掉这条 lint 规则。
- react/react-in-jsx-scope：同上。
- @typescript-eslint/no-var-requires：禁用使用 require 来定义，node 很多相关的依赖没有对 es module 的定义，所以我们也去掉这条 lint 规则。
- react/display-name：关闭组件定义缺少显示名称
- simple-import-sort/imports：import 自动排序，安装 eslint-plugin-simple-import-sort 自动修正
- no-duplicate-imports：import 重复导入，自动修正：安装 eslint-plugin-import，并加入extends： plugin:import/recommended
- import/no-unresolved：关闭 eslint 无法解析的导入
## commit 规范
```
yarn add -D @commitlint/config-conventional @commitlint/cli
```
#### 新增 commitlint.config.js
```
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [2, "always", ["feat", "fix", "revert"]],
    "subject-max-length": [1, "always", 30],
  },
};
```
其中 type-enum 是指 commit 正文的前缀，通常我们会用到这三种：

- Feat：一个新的功能；
- Fix： 一次修复，之前已有问题的修复；
- Revert：一次回滚，书写异常代码后的撤销。

subject-max-length 则对应实际的 commit 长度（不包括前缀），这里我们设置为30

#### 添加 husky
```
yarn add -D husky
npx husky install 
npx husky add .husky/pre-commit
```
编辑 husky/pre-commit
```
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx commitlint --edit $1
npm run lint

```

## 代码样式 Prettier
vscode 安装 Prettier - Code formatter
```
yarn add -D prettier eslint-plugin-prettier
```
#### 新增 .prettierrc.js
```
module.exports = {
  singleQuote: false,
  trailingComma: "all",
  printWidth: 80,
  htmlWhitespaceSensitivity: "ignore",
};
```
#### 添加 vscode 的配置，添加 .Vscode 文件夹，在文件夹下新建 settings.json
```
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.fixAll.stylelint": true
  },
  "stylelint.validate": ["css", "less", "scss", "vue"],
  "[scss]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}

```
#### 添加 .editorconfig 定义编码风格
```
# top-most EditorConfig file
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = false
insert_final_newline = false
```

## stylelint 规范
```
yarn add -D stylelint stylelint-config-clean-order stylelint-config-prettier stylelint-config-standard stylelint-config-standard-scss stylelint-prettier
```
#### 添加 stylelint.config.js
```
module.exports = {
  processors: [],
  extends: [
    "stylelint-config-standard-scss",
    "stylelint-config-standard",
    "stylelint-prettier/recommended",
    "stylelint-config-prettier",
    "stylelint-config-clean-order",
  ],
  rules: {
    "prettier/prettier": true,
    "at-rule-no-unknown": null,
    "no-empty-source": null,
    "unit-no-unknown": null,
    "no-descending-specificity": null,
    "selector-pseudo-class-no-unknown": null,
    "declaration-block-no-duplicate-properties": null,
    "selector-type-no-unknown": null,
    "block-no-empty": null,
    "font-family-no-missing-generic-family-keyword": null,
    "declaration-block-no-shorthand-property-overrides": null,
    "selector-class-pattern": null,
    "no-duplicate-selectors": null,
    "selector-pseudo-class-parentheses-space-inside": null,
    "selector-combinator-space-before": null,
  },
};

```
**至此，项目规范就算搭建好了**

