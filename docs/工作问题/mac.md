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

```