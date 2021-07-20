## git的配置
1.下载Git [下载地址](https://git-scm.com/downloads) ，选择自己系统对应的版本下载即可。

2.生成 ssh 秘钥：打开终端，执行 ssh-keygen -t rsa -C "你公司内部邮箱地址"，此时文件会在c盘用户的.shh文件夹中，复制id_rsa.pub的内容到你gitlab/gitee等的ssh中。

3.全局配置git的用户名和邮箱
```
git config --global user.name "xxx"
git config --global user.email "xxx@xx.com"
```

## 初始化
1.从git仓库克隆代码
> git克隆远程仓库项目时如果不指定分支，只会克隆默认分支的内容
```
git clone -b 分支名称 远程地址
```

2.init项目
```
cd 文件夹
git init
touch README.md
git add README.md
git commit -m "first commit"
git remote add origin 远程地址
git push -u origin 分支名称
```
