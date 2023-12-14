## 安装 homebrew

```
/bin/zsh -c "$(curl -fsSL https://gitee.com/cunkai/HomebrewCN/raw/master/Homebrew.sh)"
```

## 安装 git

配置与 window 一致，自行参考自己的文章

```
brew install git
```

## 安装 nvm

```
brew install nvm

# 为NVM创建一个文件夹
mkdir ~/.nvm

# 配置所需的环境变量
vim ~/.bash_profile

# 写入
export NVM_DIR=~/.nvm
source $(brew --prefix nvm)/nvm.sh

## 刷新
source ~/.bash_profile

安装 yarn 跟 window 一致

## 安装 zsh
先安装 curl: brew install curl

再安装，安装即可使用

export REMOTE=https://gitee.com/imirror/ohmyzsh.git
sh -c "$(curl -fsSL https://cdn.jsdelivr.net/gh/ohmyzsh/ohmyzsh/tools/install.sh)"

## 安装完后，之前的配置的 node 环境会失效
1. 终端输入 cd ~ 进入主目录
2. ls -a 查看隐藏文件，找到 .zshrc 文件（如果没有可以直接创建一个）
3. 编辑文件 vim .zshrc 按i进入编辑模式，加入 source ~/.bash_profile 后，esc，再输入 :wq 保存退出。（也可以open方式打开编辑）
4. 最后输入命令 source ~/.zshrc 刷新刚刚的配置
```
