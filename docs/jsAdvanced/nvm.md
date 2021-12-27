使用nvm管理node版本，并且设置node，npm的安装目录（非常全面仔细）

>node版本推荐使用lts版本，避免出现问题，如果使用最新版在taro低版本中安装依赖node-sass会出问题


## 安装nvm
在[nvm下载地址](https://github.com/coreybutler/nvm-windows/releases/tag/1.1.7) 下载 nvm-setup.zip，随后进行安装nvm，建议安装到D:\nvm 以及D:\nodejs

## 配置nvm
1. 打开 settings.txt，加上，不然下载node时会出现下载不到npm的情况
```
root: D:\nvm
path: D:\nodejs
node_mirror: https://npm.taobao.org/mirrors/node/ 
npm_mirror: https://npm.taobao.org/mirrors/npm/
```
2. 设置nvm环境变量

删除系统变量：NVM_HOME 和 NVM_SYMLINK <br/>
删除path中的 %NVM_HOME%;%NVM_SYMLINK% <br/>

如果之前有设置过node环境变量，如node_path，一起删掉<br/>
在用户变量中会有上面一样的变量，不需要动<br/>

3. 安装node

nvm install  版本号  (高于8.0版本得node_modules会为空，此时去node官网手动下载对应的版本复制文件)

nvm use 版本号 选择使用node版本，此时nodejs文件夹会生成相应的node版本资源

## 设置node，npm的安装目录
```
npm config set prefix "D:\nodejs\node_global"
npm config set cache "D:\nodejs\node_cache"
同时将D:\nodejs\node_global加到系统变量path中
```

## npm安装yarn
npm install -g yarn

## npm安装cnpm
npm install -g cnpm --registry=https://registry.npm.taobao.org

## nvm常用命令
```
nvm --help 显示所有信息
nvm --version 显示当前安装的nvm版本
nvm install [-s] <version> 安装指定的版本，如果不存在.nvmrc,就从指定的资源下载安装
nvm install [-s] <version> -latest-npm 安装指定的版本，平且下载最新的npm
nvm uninstall <version> 卸载指定的版本
nvm use [--silent] <version> 使用已经安装的版本 切换版本
nvm current 查看当前使用的node版本
nvm ls 查看已经安装的版本
nvm ls <version> 查看指定版本
nvm ls-remote 显示远程所有可以安装的nodejs版本
nvm ls-remote --lts 查看长期支持的版本
nvm install-latest-npm 安装罪行的npm
nvm reinstall-packages <version> 重新安装指定的版本
nvm cache dir 显示nvm的cache
nvm cache clear 清空nvm的cache
```
