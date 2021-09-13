>husky：Git hooks 工具，对git执行的一些命令，通过对应的hooks钩子触发，执行自定义的脚本程序
>可以防止使用 Git hooks 的一些不好的 commit 或者 push。

[husky github地址](https://github.com/typicode/husky)

### 安装依赖
```
yarn add @commitlint/cli -D 
yarn add @commitlint/config-conventional -D 
yarn add husky -D
```

### packgae.json
```
添加命令 
"prepare": "husky install", 
"commitlint": "commitlint --config commitlint.config.js -e -V"

添加husky 
"husky": 
    { 
        "hooks": 
            { 
                "pre-commit": "lint-staged", 
                "commit-msg": "commitlint -E $HUSKY_GIT_PARAMS" 
            } 
    }

执行yarn add husky 因为添加了prepare，所以会自动生成husky文件夹
```

### 添加钩子
添加pre-commit钩子
```
npx husky add .husky/pre-commit "npm run test"

并在pre-commit中写入邮箱的限制代码
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

EMAIL=$(git config user.email)
if [[ ! $EMAIL =~ ^[.[:alnum:]]+@qq\.com$ ]];
then
  echo "Your git information is not valid";
  echo "Please run:"
  echo '   git config --local user.name "<Your name in qq>"'
  echo '   git config --local user.email "<Your alias>@qq.com"'
  exit 1;
fi;
```

添加commit-msg钩子
```
npx husky add .husky/commit-msg 'npx --no-install commitlint --edit "$1"'

并在commit-msg写入commit代码时的规范限制
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run commitlint
```
commitlint.config.js
```
module.exports = {
  extends: ['@commitlint/config-conventional'],
  // 检测规则
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'chore',
        'revert',
        'build'
      ]
    ],
    'type-case': [0],
    'type-empty': [0],
    'scope-empty': [0],
    'scope-case': [0],
    'subject-full-stop': [0, 'never'],
    'subject-case': [0, 'never'],
    'header-max-length': [0, 'always', 72]
  }
}
```
这样在提交代码的时候，commit信息就必须遵循规范才能够提交，提交邮箱也是有限制的。

[参考GitHook 工具 ](https://juejin.cn/post/6947200436101185566#heading-4)

[参考husky使用总结](https://zhuanlan.zhihu.com/p/366786798?ivk_sa=1024320u)