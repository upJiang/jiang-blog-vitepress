## git的配置
1.下载Git [下载地址](https://git-scm.com/downloads) ，选择自己系统对应的版本下载即可。

2.生成 ssh 秘钥：打开终端，执行 ssh-keygen -t rsa -C "你公司内部邮箱地址"，此时文件会在c盘用户的.shh文件夹中，复制id_rsa.pub的内容到你gitlab/gitee等的ssh中。

3.查询配置信息
```
列出当前配置：git config --list;
列出repository配置：git config --local --list;
列出全局配置：git config --global --list;
列出系统配置：git config --system --list;
```

4.全局配置git的用户名和邮箱
```
git config --global user.name "xxx"
git config --global user.email "xxx@xx.com"
```

## 四个关键点
git的通用操作流程图
![](https://user-gold-cdn.xitu.io/2018/4/25/162fcc0987bf1c0a?imageView2/0/w/1280/h/960/format/webp/ignore-error/1)

1.**工作区**：就是你平时存放项目代码的地方

2.**暂存区（Index/Stage）**：数据暂时存放的区域，就是我们使用**git add**提交的区域

3.**本地仓库**：.git文件夹里管理的本地仓库区域，里面可以包含很多本地分支，也就是通过**git commit**提交的区域

4.**远程仓库**：git远程仓库，gitlab/gitee/github/svn等等，通过**git push**提交远程仓库

总结：平时在工作去正常开发，通过git add提交代码到暂存区，通过git commit提交代码到本地仓库，通过git push提交代码到远程仓库
## 工作区的操作
### 初始化
1.从git仓库克隆代码
> git克隆远程仓库项目时如果不指定分支，只会克隆默认分支的内容
```
git clone -b 分支名称 远程地址 指定的项目名
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
### 提交
1.提交工作区所有文件到暂存区：git add . 

2.提交工作区中指定文件到暂存区：git add <文件名1> <文件名2> ...;

3.提交工作区中某个文件夹中所有文件到暂存区：git add [文件夹名];

### 删除/撤销/隐藏
#### 删除（删除工作区文件/删除暂存区文件）：

1.仅从暂存区中删除文件，但是工作区依然还有该文件:git rm --cached <文件名>;

2.删除工作区文件，并且也从暂存区删除对应文件的记录：git rm <文件名1> <文件名2>;
#### 撤销
1.取消暂存区所有暂存的文件：git reset;

2.取消暂存区已经暂存的文件：git reset HEAD <文件名>...;

3.撤销上一次对文件的操作：git checkout --<文件名>。要确定上一次对文件的修改不再需要，如果想保留上一次的修改以备以后继续工作，可以使用stashing和分支来处理；

#### 隐藏（临时切换分支操作的神器）
1.查看所有隐藏的记录：git stash list  可用于恢复隐藏时查看,会有stash@{0}:信息，之后通过0作为index去应用隐藏

2.查看隐藏记录的详情，提交信息：git stash show 0

3.隐藏当前修改：git stash / git stash save '说明信息'，如果经常使用隐藏功能，请务必添加说明信息，避免忘记是哪条切换不回来

4.应用隐藏（隐藏记录仍在）：应用最新隐藏git stash apply 应用指定的隐藏git stash apply 0  如果是同一个文件使用时要先隐藏再应用，不然要提交到本地仓库再操作

5.清除隐藏：移除指定的储藏git stash drop 0 应用隐藏并将其清除git stash pop 0

注：不加stash{0} 都是操作最新的一次（栈顶）隐藏,stash{0}就是数字而已，网上很多教程使用stash@{0}，我在实际操作中都不生效，只需要在后直接加index即可。
在实际工作中用到最多的应该是：保存隐藏 git stash save '信息'，然后切换分支去做别的事情，然后切回来把保存的隐藏应用并删除git stash pop，如果想要更多骚操作自行百度

## 暂存区的操作
### 提交版本 
1.正常提交需要有add的内容，若无则无法commit：git commit -m "提交信息"

2.跳过add将暂存区提交：git commit -a -m "提交信息"

3.撤销上一次的提交：git commit --amend

### 标签tag(在发布节点打上标签是有必要的)
>Git 可以给仓库历史中的某一个提交打上标签，以示重要。 比较有代表性的是人们会使用这个功能来标记发布结点（ v1.0 、 v2.0 等等）

**轻量标签**：就是简单输个标签名即可，不会有任何附带信息 git tag v1.0

**附注标签**：需要强制附带备注信息，git tag -a v1.0 -m 第一次发版

查看标签信息与对应的提交信息：git show /git show v1.0

给指定的提交历史打标签：git tag -a v1.0 9fceb02

推送标签到远程：git push origin v1.0  不需要指定分支，它会在远程仓库共享，在仓库中可以找到tag并查看

删除本地标签：git tag -d v1.0

删除远程标签：git push origin -d v1.0

### 分支管理

创建本地分支：git branch 分支名

切换到本地分支：git checkout 分支名

上面二合一，创建分支并切换到分支：git branch -b 分支名

删除本地分支：git branch -d 分支名

合并分支：git merge 分支名 合并远程分支 git merge origin/master

在远程分支的基础上创建本地分支：git checkout -b test origin/master 如果这个记不住：也可以用比较简单容易记的方法就是先创建本地分支，再强制拉取，其实就是拆分
```
git branch test
git checkout test        //这两个又可以合并为git branch -b test
git fetch --all
git reset --hard origin/master  //这四个可以合并为git checkout -b test origin/maset
这个时候远程是没有这个分支的，在提交时要指定提交到远程，会自动创建远程分支，git push origin test
```

强制拉取远程分支内容到本地分支：

1. git fetch --all

2. git reset --hard origin/master

切换到远程分支，并且在本地切换到该分支：
1. git fetch origin master 
2. git checkout master

#### git fetch 与 git pull的区别
>这两个都是从远程分支拉取代码，它们的区别是fetch是强制拉取远程分支下来，不会进行merge，会覆盖本地
而pull会进行合并，一般如果是新建分支会使用fetch法撒旦

aaa





