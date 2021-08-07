>husky：Git hooks 工具，对git执行的一些命令，通过对应的hooks钩子触发，执行自定义的脚本程序
>可以防止使用 Git hooks 的一些不好的 commit 或者 push。

[husky github地址](https://github.com/typicode/husky)

### 安装husky(目前最新v7.0.1)
```
npm install husky --save-dev
or
yarn add husky -D
```

### 在packgae.json中添加prepare脚本
```
{
  "scripts": {
    "prepare": "husky install"
  }
}

prepare脚本会在npm install（不带参数）之后自动执行。也就是说当我们执行npm install安装完项目依赖后会执行 husky install命令，该命令会创建.husky/目录并指定该目录为git hooks所在的目录。
```

### 添加git hooks
```
npx husky add .husky/pre-commit "npm run test"
```
>运行完该命令后我们会看到.husky/目录下新增了一个名为pre-commit的shell脚本。也就是说在在执行git commit命令时会先执行pre-commit这个脚本。pre-commit脚本内容如下：

```
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"
   
npm run  test
```

在package.json配置hooks钩子
```
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E $HUSKY_GIT_PARAMS"
    }
  },
```
通过husky add 添加钩子
```
npx husky add .husky/commit-msg 'npx --no-install commitlint --edit "$1"'
```

## 在pre-commit钩子中检查邮箱以及lint-staged
```
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

yarn lint-staged
echo '检查lint规范'
```

[参考GitHook 工具 ](https://juejin.cn/post/6947200436101185566#heading-4)

[参考husky使用总结](https://zhuanlan.zhihu.com/p/366786798?ivk_sa=1024320u)