[也可参考基于 next 项目写的规范](https://blog.junfeng530.xyz/docs/%E8%BF%9B%E9%98%B6%E5%AD%A6%E4%B9%A0/nextJs%E5%AE%98%E7%BD%91SSR%E5%AE%9E%E6%88%98/standard.html)

目的：
- 保存时自动 eslint 修正、prettier 格式化、stylelint 格式化
- 暂存区提交时检测 eslint、stylelint
- 代码提交时全局检测ts规范

## 添加 husky
>这个其实在我前面的文章有写过，现在采取更简单的方法写一遍，直接使用 lint-staged 搭配 .lintstagedrc 去设置暂存区的stylelint、eslint、以及commit信息的校验

**1. 安装依赖**
```
@commitlint/cli 
@commitlint/config-conventional
husky 
lint-staged

yarn add 以上xxx -D
```
**2. 配置 package.json**
```
 "scripts": {
    "lint": "lint-staged",  //暂存区 lint 检查，配置文件在 .lintstagedrc
    "tsc": "vue-tsc --noEmit --skipLibCheck",  //ts的检查
    "prepare": "husky install"  //安装依赖时下载husky
  }
```
**3. 添加钩子**

pre-commit
```
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# lint，检查 eslint、stylelint、ts
yarn lint
echo "---检查开始---"
yarn tsc
echo "---检查结束---"

# 邮箱的检查
# EMAIL=$(git config user.email)
# if [[ ! $EMAIL =~ ^[.[:alnum:]]+@qq\.com$ ]];
# then
#   echo "Your git information is not valid";
#   echo "Please run:"
#   echo '   git config --local user.name "<Your name in qq>"'
#   echo '   git config --local user.email "<Your alias>@qq.com"'
#   exit 1;
# fi;
```
commit-msg，检查提交信息
```
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx --no-install commitlint --edit "$1"
```
**4. 添加 commitlint.config.js 配置。使用默认的**
```
module.exports = { extends: ['@commitlint/config-conventional'] }
```
**5. 添加 .lintstagedrc 配置暂存区检测 eslint、stylelint**
```
{
    "*.{vue,ts,js,jsx}": "eslint",
    "*.{vue,scss,css}": [
        "stylelint"
    ]
}

//这里不直接 fix ，您也可以加 --fix 参数自动fix
```

## 添加 eslint、prettier
**1. 安装依赖**
```
prettier
babel-eslint
@typescript-eslint/eslint-plugin 
@typescript-eslint/parser 
eslint 
eslint-plugin-prettier

//vue专有
eslint-plugin-vue 
@vue/eslint-config-prettier 
@vue/eslint-config-typescript

yarn add 以上xxx -D
```
**2. 添加配置文件 .eslintrc.js 文件**
```
module.exports = {
  root: true,

  env: {
    node: true,
  },

  extends: ['plugin:vue/vue3-essential', 'eslint:recommended', '@vue/prettier', '@vue/typescript'],

  parserOptions: {
    parser: '@typescript-eslint/parser',
  },
  globals: {
    wx: 'readonly',
  },
  rules: {
    'prettier/prettier': [
      'error',
      {
        tabWidth: 2,
        singleQuote: true,
        semi: false,
        trailingComma: 'es5',
        arrowParens: 'avoid',
        endOfLine: 'auto',
        printWidth: 100,
      },
    ],
    'no-debugger': 'error',
    'comma-dangle': [
      'error',
      {
        arrays: 'always-multiline',
        objects: 'always-multiline',
        imports: 'always-multiline',
        exports: 'never',
        functions: 'never',
      },
    ],
    'vue/no-use-v-if-with-v-for': [
      'error',
      {
        allowUsingIterationVar: true,
      },
    ],
    '@typescript-eslint/no-explicit-any': ['error'], //禁止使用any
    eqeqeq: 2, //必须使用全等
    'max-lines': ['error', 1000], //限制行数 请勿修改 请优化你的代码
    complexity: ['error', 5], // 限制复杂度
    'require-await': 'error',
  },
}
```
**3. 添加配置文件 .prettierrc.js 文件，vscode 记得设置默认的格式化程序为prettier**
```
module.exports = {
  singleQuote: false,
  trailingComma: "all",
  printWidth: 80,
  htmlWhitespaceSensitivity: "ignore",
};
```
**4. 添加 vscode 的配置，添加 .Vscode 文件夹，在文件夹下新建 settings.json**
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

//保存自动格式化
//保存自动设置stylelint，stylelint后面会讲到
```
5. 添加 .editorconfig 定义编码风格
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

至此，您保存文件的时候应该会自动修正 eslint，并且按照 prettier 格式保存
执行yarn lint 时会检测 暂存区文件的 eslint、stylelint

## 添加 stylelint
**1. 安装依赖**
```
yarn add -D stylelint stylelint-config-clean-order stylelint-config-prettier stylelint-config-standard stylelint-config-standard-scss stylelint-prettier
```
**2. 添加 stylelint.config.js 配置文件**
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
**3. 添加 .stylelintignore 忽略文件**
```
/dist/*
/public/*
public/*
*.js
*.ts
*.png
*.jpg
*.webp
*.ttf
*.woff
```
**4. 保存自动格式化，.vscode/settings.json**
```
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.stylelint": true
  },
  "stylelint.validate": ["css", "less", "scss", "vue"]
}
```
至此，当您保存有样式的文件的时候，会自动帮您格式化样式，在提交代码时会检查eslint、stylelint、commit信息了。

## 添加 tsc 的检查
前面在 pre-commit 已经设置了 tsc 检查，在代码提交时会自动全局检测，这个我暂时并不知道如何能够只检测暂存区的ts规范，现在做的是全局检测,这里是针对vue项目的。

**1. 安装依赖**
```
yarn add vue-tsc -D
yarn add @vue/cli-plugin-typescript -D
```
2. tsconfig.json 配置
```
{
  "compilerOptions": {
    "target": "es5",
    "module": "esnext",
    "strict": true,
    "jsx": "preserve",
    "importHelpers": true,
    "moduleResolution": "node",
    "allowJs": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "sourceMap": true,
    "baseUrl": ".",
    "types": ["webpack-env"],
    "paths": {
      "@/*": ["src/*"]
    },
    "lib": ["esnext", "dom", "dom.iterable", "scripthost"]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.vue", "tests/**/*.ts", "tests/**/*.tsx"],
  "exclude": ["node_modules"]
}
```

总结：现在我们已经做到在保存时自动 eslint 修正、prettier 格式化、stylelint 格式化
暂存区提交时检测 eslint、stylelint，全局检测ts规范。
[项目地址](https://github.com/upJiang/jiangVue3Test)









