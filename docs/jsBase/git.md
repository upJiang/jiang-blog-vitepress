## git 的配置

1.下载 Git [下载地址](https://git-scm.com/downloads) 

2.生成 ssh 秘钥：打开终端，执行 ssh-keygen -t rsa -C "邮箱地址"，切换到～/.shh目录中，复制 id_rsa.pub 的内容到你 gitlab/gitee/github 等的 ssh key 中。

3.配置 git 的用户名和邮箱

```
# 全局配置
$ git config --global user.name "xxx"
$ git config --global user.email "xxx@xx.com"

# 在当前项目下，单独配置
$ git config user.name "xxx"
$ git config user.email "xxx@xx.com"
```

**查询配置信息**

```
# 列出当前配置
$ git config --list

# 列出repository配置
$ git config --local --list

# 列出全局配置
$ git config --global --list

# 列出系统配置
$ git config --system --list
```

## 远程仓库
>配置完后我们第一步应该理解远程仓库这个概念，远程仓库就是我们在 gitlab/github 这些地方的代码仓库。我们一般一个项目只对应一个远程仓库，远程仓库名默认为 origin，我们可以使用 rename 命令对它进行重命名，如果只需要对应一个远程仓库，不建议更改名字，一个项目也可以对应多个远程仓库。

#### 查看
```
# 查看当前配置有哪些远程仓库
$ git remote
origin

# 执行时加上 -v 参数，可以看到每个别名的实际链接地址。
$ git remote -v
origin    git@github.com:xxx1.git (fetch)
origin    git@github.com:xxx1.git (push)

# 查看git的配置信息,可以看到本地分支跟远程分支的关联信息
$ git remote show origin

  remote origin
  Fetch URL: https://git.vankeservice.com/v0840985/jiang.git
  Push  URL: https://git.vankeservice.com/v0840985/jiang.git
  HEAD branch: master
  Remote branch:
    master tracked
  Local branches configured for 'git pull':
    master merges with remote master
    test   merges with remote master
  Local ref configured for 'git push':
    master pushes to master (fast-forwardable)
```
#### 添加删除
```
# 添加一个叫ogigin2的远程仓库
$ git remote add origin2 git@github.com:xxx2.git
$ git remote -v
origin    git@github.com:xxx1.git (fetch)
origin    git@github.com:xxx1.git (push)
origin2    git@github.com:xxx2.git (fetch)
origin2    git@github.com:xxx2.git (push)

# 删除远程仓库 origin2
$ git remote rm origin2
$ git remote -v
origin    git@github.com:xxx1.git (fetch)
origin    git@github.com:xxx1.git (push)
```

#### 修改名字(本地对于远程仓库的别名)
```
git remote rename old_origin_name new_origin_name
```
#### 绑定(本地分支并和远程分支)
```
# 1. 拉取远程仓库代码
$ git fetch origin 拉取所有 
$ git fetch origin test 拉取指定分支

# 2. 切换到指定分支
$ git checkout test 会自动在已有的远程分支上去检测，找不到会报错
找到了：
Branch 'test' set up to track remote branch 'test' from 'origin'.
Switched to a new branch 'test'
找不到：
error: pathspec 'test' did not match any file(s) known to git
$ git checkout -b test 在本地创建test分支并将工作目录切换到此分支

# 3. 将本地分支跟远程分支绑定,-u 就是--set-upstream，绑定后之后操作就不需要指定仓库跟分支了
$ git branch -u origin/test
$ git push -u origin/test
```

## 拉取代码
>最近在网上有个真实发生的案例比较火，说的是一个新入职的员工，不会用 Git 拉代码，第二天就被开掉了。<br>那么刚进公司，同事给了你git仓库地址，你这时候应该怎么做呢？
拉取代码时会有两种方式: https、ssh

- https 需要每次提交前都手动输入用户名和密码，<br>
- ssh 的方式配置完毕后 Git 都会使用你本地的私钥和远程仓库的公钥进行验证是否是一对秘钥，从而简化了操作流程。


### 从 git 仓库克隆代码
>clone都会包含所有远程分支的代码，可以通过 checkout 切换分支，clone 过来的代码不需要初始化就可以直接操作分支了
```
# 在本地生成默认分支，一般是master或者main
$ git clone git@github.com:xxx.git

# 在本地生成指定分支
$ git clone -b test git clone git@github.com:xxx.git
```

### 直接在文件夹上初始化并绑定远程分支
```
$ cd 文件夹
$ git init
$ git remote add origin git clone git@github.com:xxx.git //添加远程仓库
$ git branch -u origin/test //绑定远程分支,或者git push -u origin/test
```

### 在已有git版本库的项目中，想要绑定其它远程仓库
```
$ cd existing_repo
git remote add other_origin git clone git@github.com:xxx.git //克隆并添加其它远程仓库代码,
git push -u other_origin --all  //提交所有代码
git push -u other_origin --tags //提交所有的标签
```
注意：如果你还想用已有仓库的名字，请删除已有本地仓库或者修改已有本地仓库名
```
git remote rm origin
git remote rename origin new_origin
```

**那么至此，git 的初始化基础已经掌握了，接下来该学习一些常用的操作命令**

## 四个关键点

git 的通用操作流程图
![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/513f0456d26a46808e72fcb40bdaff2a~tplv-k3u1fbpfcp-zoom-1.image)

1.**工作区(workspace)**：就是你平时写代码的地方，是当前看到最新的内容，在开发的过程也就是对工作区的操作

2.**暂存区（Index/Stage）**：就是我们使用 `git add` 提交的区域，在这里我们可以选择提交或者放弃哪些更改

3.**本地仓库(repository)**：本地仓库，位于自己的电脑上，通过 `git commit` 提交暂存区的内容，会进入本地仓库

4.**远程仓库(remote)**：git 远程仓库，gitlab/gitee/github/svn 等等，通过`git push`提交远程仓库

总结：平时在工作区正常开发，通过 git add 提交代码到暂存区，通过 git commit 提交代码到本地仓库，通过 git push 提交代码到远程仓库



## HEAD
>我们先来理解 HEAD、HEAD^、commit_id 这些东西的概念

git 必须知道当前版本是哪个版本，在git中会有很多commit_id，`HEAD` 就是当前版本的commit_id，也就是最新的提交 `3628164...882e1e0` ，可以用前七位缩写，上一个版本就是 `HEAD^` ，上上一个版本就是 `HEAD^^` ，当然往上100个版本写100个 `^` 比较容易数不过来，所以写成 `HEAD~100`。


#### 符号操作
git 中的一些连续commit_id 都是左开右闭的`3628164...882e1e0`，如果想左闭右闭合就在开始的commit加上^ `3628164^...882e1e0`

n 默认是 1 不写，直接 HEAD 就是当前指针<br>
**HEAD^n** 后退 n 步,不管父子顺序的提交，意思就是不需要管是不是同一个分支的提交<br>
**HEAD~n** 退到第 n 个父提交,按照提交的父子顺序，意思就是必须是同一个分支的提交

HEAD～n 等于 HEAD~~~( n 个波浪) 等于 HEAD^^^(n个尖括号)

HEAD^n 比较特殊，不需要管是不是同一个分支的提交

比如我们有四个分支，分支树形图如下：
![截屏2021-11-15 上午11.18.53.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/fa7b95dac93b4146be0261ebd4ee83fc~tplv-k3u1fbpfcp-watermark.image?)
```
albert@home-pc MINGW64 /d/gitstart (dev1)
$ git rev-parse --short HEAD~~ //退到第二个父提交
dcdcb87

albert@home-pc MINGW64 /d/gitstart (dev1)
$ git rev-parse --short HEAD^^ //表示退一步到第一个父提交上，在退一步到第一个父提交上
dcdcb87 

albert@home-pc MINGW64 /d/gitstart (dev1)
$ git rev-parse --short HEAD~2 //退到第二个父提交
dcdcb87

albert@home-pc MINGW64 /d/gitstart (dev1)
$ git rev-parse --short HEAD^2 //后退两步，不管父子顺序的提交
e330eac
```

只要你 commit 了，就算没有 push ，也会生成 commit_id ，HEAD 就会移动到你最新的 commit 上

我们可以通过 git log、git reflog 查看提交记录，以及当前 HEAD

HEAD^ 当前的上一个
HEAD~1 

**git rev-parse** 获取完整 commit_id、查看当前分支
```
# 获取当前分支名
$ git rev-parse --abbrev-ref HEAD
test

# 获取当前HEAD/完整的commit_id
$ git rev-parse HEAD / git rev-parse d63ac5c
d63ac5c21ef604812ae38c9807e16d59b62b19d7

# 获取当前HEAD/短的commit_id
$ git rev-parse --short HEAD /git rev-parse d63ac5c21ef604812ae38c9807e16d59b62b19d7
d63ac5c
d63ac5c
```

## branch(分支)
```
# 创建本地分支
$ git branch 分支名

# 切换分支
$ git checkout 分支名

# 创建分支并切换到分支
$ git branch -b 分支名

# 删除本地分支
$ git branch -d 分支名

# 删除远程分支
$ git push origin --d 远程分支名

# 合并分支
$ git merge 本地分支名
$ git merge origin/master

# 在远程分支的基础上创建本地分支,这个很常用
$ git checkout -b test origin/master
```
**在远程分支的基础上创建本地分支,这个很常用**
```
$ git checkout -b test origin/master

# 拆分
$ git branch test
$ git checkout test 
$ git fetch --all //拉取远程所有分支的最新代码，但不合并
$ git reset --hard origin/master //将当前分支内容重置成远程分支内容，reset后面有详细介绍
```
### git fetch 与 git pull 的区别
都是拉取远程代码，它们的区别是 fetch 不会自动合并工作区代码，**fetch + merge === git pull**。
```
# 拉取当前分支的最新内容
$ git fetch/pull

# 拉取所有分支的最新内容
$ git fetch/pull --all

# 拉取指定分支，之后执行git fetch 会默认拉取该分支,之后如果想拉取所有分支，需要加 --all参数
$ git fetch/pull origin 分支名
```
**git pull 拉取不到最新代码?**<br>
大概率是本地分支并未与远程分支建立连接
```
# 先查看git的配置信息,可以看到本地分支跟远程分支的关联信息
$ git remote show origin

  remote origin
  Fetch URL: https://git.vankeservice.com/v0840985/jiang.git
  Push  URL: https://git.vankeservice.com/v0840985/jiang.git
  HEAD branch: master
  Remote branch:
    master tracked
  Local branches configured for 'git pull':
    master merges with remote master
    test   merges with remote master
  Local ref configured for 'git push':
    master pushes to master (fast-forwardable)
```
如果关联错误，那么就绑定一下即可
```
git branch -u origin/test
```

## log(查看)

查看提交历史：git log 显示所有提交过的版本信息，当前 HEAD，不包括已经被删除的 commit 记录和 reset 的操作

**git默认展示三条log信息，按S键可以往下展开哦**

```
commit 7b1e2c6bd3851732d0d3e1d01169cd31042b64bc (HEAD -> fix/coupon, origin/fix/coupon)
Author: libinbin <libinbin@ainirobot.com>
Date:   Sat May 19 17:26:33 2018 +0800
    第三次commit

commit 004ff75d9ccf27b6721f6b6ea86efa92319f4102
Author: libinbin <libinbin@ainirobot.com>
Date:   Sat May 19 17:08:15 2018 +0800
    第一次commit
```

[git log 的更多参数](https://blog.csdn.net/m0_50668851/article/details/108651417)

查看所有分支的操作记录：git reflog 包括 reset 掉的记录

```
2e39ab1 HEAD@{15}: commit (merge): feat: d
750cf0d HEAD@{16}: commit: feat: f
c5af345 HEAD@{17}: commit (merge): feat: update
062055c HEAD@{18}: checkout: moving from main to test
fb2af28 HEAD@{19}: commit: feat: update
```

[git reflog 的更多参数](https://blog.csdn.net/chaiyu2002/article/details/81773041)

## blame(查看文件的每个部分是谁修改的)
```
$ git blame .editorconfig

^b818b09 (某某某            2019-05-20 18:08:43 +0800  1) # http://editorconfig.org
^b818b09 (某某某            2019-05-20 18:08:43 +0800  2) root = true
^b818b09 (某某某            2019-05-20 18:08:43 +0800  3) 
00000000 (Not Committed Yet 2021-11-11 20:07:38 +0800 13) sda
```

## add
```
# 提交工作区所有文件到暂存区
$ git add .

# 提交所有被删除和修改的文件到数据暂存区
$ git add -u <==> git add –update

# 提交所有被删除、被替换、被修改和新增的文件到数据暂存区
# git add -A <==>git add –all

# 提交工作区中指定文件/文件夹名到暂存区
$ git add .editorconfig(文件名) src/pages/index.js(有相同名字使用路径) page(文件夹名)
```

## commit(提交)
```
# 工作区中有更改的内容，正常提交
$ git commit -m "提交信息"

# 将add操作合并一起执行
$ git commit -a -m "提交信息"
```
**修改上一次的提交信息，commit_id 会重置，在日志看不到这个操作记录**
```
$ git commit --amend
进入vim，输入i进入编辑，在首行修改提交信息，esc退出编辑后，按shift+: 键入 :wq 回车退出并保存

 cccc   //输入i进入编辑，在首行修改提交信息

 Please enter the commit message for your changes. Lines starting
 with '#' will be ignored, and an empty message aborts the commit.

 Date:      Fri Nov 12 15:48:37 2021 +0800

 On branch master
 Your branch is ahead of 'origin/master' by 3 commits.
   (use "git push" to publish your local commits)

 Changes to be committed:
       new file:   test2.js
```
**修改前 n 次 commit 的提交信息,使用 rebase，后面会详细介绍 rebase**
```
$ git rebase -i  //-i是指使用vim编辑，此时会进入vim编辑

pick caf7ca7 aaaaa
pick b093fc3 bbbb
pick d52ce82 ggg
```

先明白这三个区别：<br>
pick：保留该 commit（缩写:p）<br>
reword：保留该 commit，但我需要修改该 commit 的注释（缩写:r）<br>
edit：保留该 commit, 但我要停下来修改该提交(不仅仅修改注释)（缩写: e）

将第三条改成 reword 或者 edit ，保存退出

reword d52ce82 ggg <br>
保存退出后会直接进入到下一个vim进行编辑，其实就是执行 git commit --amend 后的编辑界面，正常修改保存后提交即可

edit d52ce82 ggg <br>
保存退出后，会让我们选择执行的下一个命令， git commit --amend 或者是 git rebase --continue，输入git commit --amend 就跟上面一样了， git rebase --continue 则退出此次更改

## stash(暂存)
>当我们在开发项目的时候，假设现在你在 A 分支写代码，产品经理突然过来让你改 B 分支的 bug ，这个时候你怎么办？<br>我们知道只有把工作区的代码都 commit上去之后才能切换分支干活，可是你现在改的内容你并不想 commit 上去生成一条无用的 commit ，那么这时候 stash 就能够帮你解决这个问题了。stash 能够帮我们暂存我们修改的内容，之后再取出来使用，这样就不用 commit 上去了。

暂存工作区的内容，注意一定要有改动才行，如果经常使用暂存功能，请务必添加说明信息，避免忘记是哪条切换不回来
```
$ git stash / git stash save '说明信息'
Saved working directory and index state WIP on master: ad6dd27 kkkkk
```

查看所有暂存的记录：stash@{0} 之后通过 index 去应用暂存
```
$ git stash list
stash@{0}: WIP on master: ad6dd27 kkkkk
stash@{1}: WIP on master: d52ce82 ggg
```

查看暂存记录的详情
```
$ git stash show 0
 test.js | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)
```
应用暂存（暂存记录仍在）,先查看暂存记录跟详情，再通过index去应用<br>
**注意：如果暂存的文件跟当前修改的文件相同，那么要想清楚再使用，可以先把当前修改 commit 上去，然后再通过 commit_id 使用 rebase/merge 合并回来**
```
# 应用最新暂存
$ git stash apply

# 应用指定的暂存
$ git stash apply 1
```
清除暂存
```
# 移除指定的暂存
$ git stash drop 0

# 应用暂存并将其清除
$ git stash pop 0
```
注：不加 stash{0} 都是操作最新的一次（栈顶）暂存, stash{0} 就是数字而已，网上很多教程使用 stash@{0}，我在实际操作中都不生效，只需要在后直接加 index 即可。<br>

在实际工作中用到最多的应该是：保存暂存 git stash save '说明信息'，然后切换分支去做别的事情，然后切回来把保存的暂存应用并删除 git stash pop

## rm(删除)
>跟 git reset HEAD file.js 有点类似，但 reset 会改变本地仓库，而 rm 不会，rm 只操作工作区跟暂存区，同名使用路径
```
# 仅从暂存区中删除文件，但是工作区依然还有该文件,
$ git rm --cached file.js

# 删除工作区文件，并且也从暂存区删除对应文件的记录
$ git rm file.js  //如果报错加-f参数
```
## reset(重置)
git reset --mixed (默认) HEAD (默认当前 HEAD，指定某个 HEAD ) brach (分支)

reset有三种模式 **soft mixed（默认） hard** 注意看图示红色线条部分

![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/b34c28f1284943eda41526b32109590d~tplv-k3u1fbpfcp-watermark.image?)


- soft 让本地仓库与 Reset 节点的內容相同，那么我们的工作区代码就会跟本地仓库产生差异，会将这些差异放到暂存区中<br>
- mixed 让本地仓库以及暂存区跟Reset节点的內容相同，也就是会清空暂存区，但是工作区跟 soft 一样不变，我们后面可能需要重新 add <br>
- hard 改变工作区、暂存区、本地仓库,全部内容都变成 Reset 节点的內容相同，所以慎用，另外两个不会改变工作区内容可以把代码找回，这个用了就有点麻烦了，下面会介绍如何把 reset 掉的代码找回来
```
# 先查看暂存区都更改了哪些文件
$ git status
On branch fix/coupon
Your branch is up to date with 'origin/fix/coupon'.
//这里是放进暂存区的文件更改
Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
        modified:   src/pages/details/index.js
        modified:   src/pages/details/status/index.js
        
//这里是工作区的文件更改
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
        modified:   src/pages/details/index.js
        modified:   src/pages/details/status/index.js

no changes added to commit (use "git add" and/or "git commit -a")
        
# 取消暂存区所有暂存的文件
$ git reset  //默认mixed
//执行后会将暂存区更改清空，变成了工作区的更改
On branch fix/coupon
Your branch is up to date with 'origin/fix/coupon'.

//这里是工作区的文件更改，modified 是红色字体
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
        modified:   src/pages/details/index.js
        modified:   src/pages/details/status/index.js

no changes added to commit (use "git add" and/or "git commit -a")

# 取消暂存区已经暂存的文件
如果暂存区中有相同名字的文件，那么文件名需要填写整个路径
$ git reset HEAD .editorconfig
$ git reset HEAD src/pages/details/index.js
```
### 找回reset掉的代码
- 已 commit ：git reflog 获取hash值 然后 git reset --hard [对应的值]
- 未 commit 但 add ：git fsck --lost-found 恢复删除文件 然后到 .git/lost-found 目录寻找文件/或者通过 merge/rebase 合并回来
- 未 commit 未 add ：无解，所以要慎用此命令

### git fsck
>`fill system check` 文件系统检查，用来对本地和远程仓库的一致性检查，`dangling objects` 悬空对象。git 中把 commit 删了后，并不是真正的删除，而是变成了悬空对象（dangling commit）。<br>git gc 在达到一定条件下会清除这些悬空对象,在悬空对象列表中，使用 `git show commitId` 查看悬空记录的详情，`git merge commitId` 即可恢复

**为什么会产生悬空对象？**<br>
比如我们刚刚在工作区提交了一些 commit ，我们通过 reset 把这些 commit 清空掉了，这些被清空掉的 commit 就变成了 dangling commit 。又或者是比如 B commit 依靠 A commit ,而A被删掉了，那么B就悬空了

**Dangling blob**=对暂存区域/索引所做的更改，但从未提交。Git 的一个令人惊奇的地方是，一旦它被添加到暂存区域中，就可以始终得到它，因为这些 BLOB 的行为就像提交，因为它们也有一个散列！！
```
$ git show edbfa48d1c6428d00af9b2cf6dc70a423d6969ad

# http://editorconfig.org
root = true

[*]
indent_style = space
indent_size = 2
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false
sda
```

**Dangling commit**=未直接或由其任何优势者链接到任何分支或标记的提交。你也可以把这些拿回来！
```
$ git show e08b6bd66efe7a3842531282596c2ee8d6dd00e9  
commit e08b6bd66efe7a3842531282596c2ee8d6dd00e9 (origin/test, test)
Merge: 2577fcd 216bfb3
Author: 易亮亮 <yill01@vanke.com>
Date:   Wed Nov 10 14:10:36 2021 +0800

    Merge branch 'feature/newDeposit' into 'test'
    
    feat: 修改锁定
    
    See merge request CS/front/pretty-home!152
```

git fsck --lost-found：
```
# 找出所有的悬空对象,包括未被引用的，我们这种只add了，但是没有commit信息的就要添加--lost-found参数找出（更多参数自己去了解）
$ git fsck --lost-found
dangling commit e08b6bd66efe7a3842531282596c2ee8d6dd00e9
dangling commit dbd5b7e3ede83289ad64c62196d82baa81ec1a2d
dangling blob f229c0c7c6d821881e58de143d733a4d93febaa5

# 通过show查看信息是不是丢失的commit
$ git show dbd5b7e3ede83289ad64c62196d82baa81ec1a2d

# 通过merge/rebase合并commit
$ git merge dbd5b7e3ede83289ad64c62196d82baa81ec1a2d
```

### reset总结
reset 的本质：移动 HEAD 以及它所指向的 branch，**reset** 这个指令虽然可以用来撤销 **commit** ，但它的实质行为并不是撤销，而是移动 **HEAD** ，并且「捎带」上 **HEAD** 所指向的 **branch**（如果有的话）。

![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/6398f96068734296ad3d9e15715e558d~tplv-k3u1fbpfcp-watermark.image?)

## revert(撤销)
撤销`某些` commit，并且把这次撤销，作为一次`最新`的提交,需要填写提交注释，会有 revert 信息。撤销的 commit 记录仍在，只是`追加`一个 commit ，撤销后产生的新节点代码有可能会跟上一个版本的代码产生`冲突`

比如说有A-B-C，使用revert b-c将代码回到 A，此时会变成 A-B-C-D，使用 reset A会变成A

```
$ git revert b093fc3f062924339f43cbc93df9497fa1eb3ff6

//必须把工作区以及暂存区的更改都提交后才能操作
error: your local changes would be overwritten by revert.
hint: commit your changes or stash them to proceed.
fatal: revert failed

//有冲突，解决完冲突提交
Auto-merging test.js
CONFLICT (content): Merge conflict in test.js
error: could not revert b093fc3... bbbb
hint: after resolving the conflicts, mark the corrected paths
hint: with 'git add <paths>' or 'git rm <paths>'
hint: and commit the result with 'git commit'

//填写 commit 信息，成功提交 revert
Revert "Revert "bbbb""
This reverts commit 07bbb462cea34592ec386d19bca0309a499f3e3f.
# Please enter the commit message for your changes. Lines starting
# with '#' will be ignored, and an empty message aborts the commit.
#
# On branch test
# Your branch is ahead of 'origin/master' by 7 commits.
#   (use "git push" to publish your local commits)
#
# Changes to be committed:
#       modified:   test.js

[test 57b7832] Revert "Revert "bbbb""
 1 file changed, 1 insertion(+), 1 deletion(-)

# 成功后查看log
$ git log
//revert 变成了当前 HEAD，并且带有 commit 信息
commit 07bbb462cea34592ec386d19bca0309a499f3e3f (HEAD -> test)
Author: jiang
Date:   Mon Nov 15 14:27:10 2021 +0800
    Revert "bbbb"
   
    This reverts commit b093fc3f062924339f43cbc93df9497fa1eb3ff6.
```

### reset 跟 revert 的区别
- 在操作上，revert 必须处理完工作区跟暂存区的变更，才能使用，并且改变的是本地仓库的代码，并且会跟前面的提交产生冲突，revert 的 HEAD 参数可以是一个 commit 范围；而 reset 不需要处理工作区跟暂存区的变更， reset 提供三种模式，reset 的 HEAD 参数只能是一个指定的 commit

- 在结果上，revert 是撤销 n 个 commit ，然后生成一个新 commit ，撤销掉的 commit 仍在，reset 是直接把指针往前移动到某个 commit，并且不会生成新的 commit 信息，撤销掉的 commit 就没了

- 在影响上，影响就在于这个撤销掉的 commit 在不在，因为 reset 会把撤销 commit 丢失，这个时候，如果有另一个人在分支提交了代码，而你的 commit 不见了，这个时候如果你强制 push 会把别人的代码冲掉了，如果你去 merge 又会把你不想要的代码给弄回来了，然后你就只能手动去弄了。但是 revert 并不会删除 commit，当你去 merge 别人代码时，你的 commit 仍在，那么 git 仍然会以你的为准。

总结：如果你想要撤销的代码已经在远程上了，如果不存在会有人在你的分支上去提交代码，那么你可以选择 reset + 强制推送，如果有可能会有人在你的分支上去提交代码，那么就会产生问题，这个时候建议使用 revert。

# reset 或者 revert 后强制提交本地代码上去
```
$ git push -f origin 远程分支名
```
## rebase(变基)
> rebse 翻译为变基，就是能够改变基点，在合并分支的时候能够改变当前分支基点，保证当前 HEAD 不变，并且提交记录是线性的。除此之外还能对某一段线性提交历史进行编辑、删除、复制、粘贴。合理使用 rebase 命令可以使我们的提交历史干净、简洁！

### 合并
![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c241190f28b04b739b23de00b1b85154~tplv-k3u1fbpfcp-watermark.image?)

场景：现在有 master 跟 Feature 两个分支，Feature 是在 master 基础上拉出来的，它们的共同基点都是白色部分，Feature 做了三次 commit，master 做了两次 commit。现在在 Feature 上需要合并 master

使用git rebase master 命令后，以它们的共同基点作为起点，先逐个应用 master 分支的更改，以 master 分支最后的提交作为基点，再逐个应用 Feature 分支的每个更改。看到这里你应该理解为什么要翻译成变基了吧，基点被改变了，并且你当前分支的HEAD仍旧没被破坏，还是线性的，是不是很棒。如果使用 merge 则会多出一个 commit

`git merge` 在不是 fast-forward（快速合并）的情况下，会产生一条额外的合并记录，类似 `Merge branch 'xxx' into 'xxx'` 的一条提交信息
![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5abd099ebda04c3d9c2d6b048ad217e3~tplv-k3u1fbpfcp-watermark.image?)

rebase 的过程中会产生`冲突`的，此时，就需要手动解决冲突，然后使用依次 ` git add  `、` git rebase --continue  `的方式来处理冲突，完成 rebase 的过程，如果不想要某次 rebase 的结果，那么需要使用 ` git rebase --skip  `来跳过这次 rebase 操作。

>特别注意，只能在自己使用的 feature 分支上进行 rebase 操作，不允许在集成分支上进行 rebase，因为这种操作会修改集成分支的历史记录。

#### 交互模式
- 在开发时，我们可能会有多个 commit，这个时候 push 的时候会产生多个 commit 信息，使用 rebase 可以将多个 commit 合并成一个
- 合并分支的时候好会产生一条 merge 的 commit 信息。使用 rebase 不会产生 merge 的 commit 信息


>比如说现在有三个本地 commit 还未 push，aa , bb ,cc，使用之前需要将工作区代码都 commit 掉。base-commit 就是指明操作的基点提交对象，基于这个基点进行 rebase 的操作，但是操作的对象**不包括这个commit**
```
git rebase -i <base-commit >
```

```
pick：保留该commit（缩写:p）
reword：保留该commit，但我需要修改该commit的注释（缩写:r）
edit：保留该commit, 但我要停下来修改该提交(不仅仅修改注释)（缩写:e）
squash：将该commit和前一个commit合并（缩写:s）
fixup：将该commit和前一个commit合并，但我不要保留该提交的注释信息（缩写:f）
exec：执行shell命令（缩写:x）
drop：我要丢弃该commit（缩写:d）
```

```
$ git rebase -i 
pick caf7ca7 aa
pick b093fc3 bb
pick 946c0c3 cc   //这才是最后一条提交

# Rebase acd67ed..a6ac5b0 onto acd67ed (11 commands)
#
# Commands:
# p, pick <commit> = use commit
# r, reword <commit> = use commit, but edit the commit message
# e, edit <commit> = use commit, but stop for amending
# s, squash <commit> = use commit, but meld into previous commit
# f, fixup <commit> = like "squash", but discard this commit's log message
# x, exec <command> = run command (the rest of the line) using shell
```
输入 i 进入编辑修改操作指令，修改提交信息，比如将 aa 跟 bb drop 掉，然后将最后一条 cc 给 reword 修改注释，然后 esc 退出编辑， wq 保存，注意要至少保留一个 pick

```
# //如果有冲突先解决冲突,如果 rebase 中途出现问题，可以使用git rebase --abort 恢复,停止操作。
$ git rebase --continue  

//如果你有使用 reword 或者 edit，这个时候会直接进入 vim 去编辑提交信息，编辑完后保存，跟前面的**git commit --amend**一样
$ git push //提交，这个时候就只有一条commit信息
```

使用 rebase 可以把一个分支的改动复制到另一个分支上，这个跟 cherry-pick 很类似

```
# [startpoint] [endpoint]指定的是一个前开后闭的区间,所以起点要后退一步，或则使用 HEAD^,还记得前面的HEAD介绍吧
# git rebase   [startpoint]   [endpoint]  --onto  [branchName]  
$ git  rebase   90bc0045b^   5de0da9f2   --onto master

# 切换到master
$ git checkout master

# //将master所指向的提交id设置为当前HEAD所指向的提交id
$ git reset --hard  0c72e64  
```

## merge
>在 rebase 中已经讲过 merge 的用法了，在这里就讲一下 merge 的三个参数

`--ff`: (fast-forward)默认的提交方式。方式就是当条件允许（没有冲突的情况）的时候，git 直接把 HEAD 指针指向合并分支的头，完成合并。属于“快进方式”，不过这种情况如果删除分支，则会丢失分支信息。因为在这个过程中没有创建 commit。

`--no-ff`: 指的是强行关闭 fast-forward 方式。

`--squash`: 是用来把一些不必要 commit 进行压缩，比如说，你的 feature 在开发的时候写的 commit 很乱，那么我们合并的时候不希望把这些历史 commit 带过来，于是使用 --squash 进行合并，此时文件已经同合并后一样了，但不移动 HEAD ，不提交。需要进行一次额外的 commit 来“总结”一下，然后完成最终的合并。

总结：默认不指定参数的情况下，没有冲突使用 --ff，不会多出来一个 merge commit，有冲突自动 --no-ff ，会自动生成一条 merge 信息

## cherry-pick

> 使用场景:当一个 bug 解决 或者功能 在 A 分支，这时 B 分支也需要这些 commit，那么可以使用 cherry-pick 将这些 commit 复制过来

假设仓库中有三个分支：master、feature-a、feature-b。现在需要将 feature-a 中的两次 commit 合并到 feature-b 中

```
# //切换到feature-a 分支
$ git checkout feature-a

# 查找需要的commit_id
$ git reflog/git log 

# 使用cherry-pick 连续 6b95b5^...b09a488 
3.git cherry-pick 6b95b5 b09a488 
```
这时候，如果没有冲突的话， git log 就可以看到 feature-b 分支上会多出 2 次新的提交
这个时候它是自动提交的，如果想不自动提交，执行：git cherry-pick 6b95b5 b09a488 -n

发生冲突：
```
# 自己手动解决完所有冲突,标记有冲突的文件已经解决好冲突
$ git add -u 

# 除此以外，如果你过程中不想 cherry-pick了，只需执行：git cherry-pick --abort
$ git cherry-pick --ontinue
```

> 注意：虽然表面上看似是将那两次提交拿过来再用一遍，但其实 Git 只是拿到修改生成了新的提交，因此，这里会看到这 2 个新的提交，commit-id 和我们挑选 commit-id 并不一致。

其他有用参数：
- -e/--edit：进行 cherry-pick 时，会在进行新的提交之前，重新编辑提交的信息
- x：在记录提交时，会在原始提交消息后添加一行 cherry picked from commit …，以表明此更改是从哪个提交中挑选出来的。 这仅适用于没有冲突的 cherry-pick
- -s/--signoff：在提交信息的末尾追加一行操作者的签名，表示是谁进行了这个操作

## tag(标签)

> Git 可以给仓库历史中的某一个提交打上标签，以示重要。 比较有代表性的是人们会使用这个功能来标记发布结点（ v1.0 、 v2.0 等等）

**轻量标签**：就是简单输个标签名即可，不会有任何附带信息
```
$ git tag v1.0
```

**附注标签**：需要强制附带备注信息
```
$ git tag -a v1.0 -m 第一次发版
```
查看标签信息与对应的提交信息：
```
$ git show /git show v1.0
```
给指定的提交历史打标签
```
$ git tag -a v1.0 9fceb02
```


推送标签到远程：不需要指定分支，它会在远程仓库共享，在仓库中可以找到 tag 并查看,不推送到远程只能在本地查看
```
$ git push origin v1.0 

Enumerating objects: 29, done.
Counting objects: 100% (29/29), done.
Delta compression using up to 4 threads
Compressing objects: 100% (20/20), done.
Writing objects: 100% (27/27), 2.29 KiB | 782.00 KiB/s, done.
Total 27 (delta 6), reused 0 (delta 0), pack-reused 0
To https://git.vankeservice.com/v0840985/jiang.git
 * [new tag]         v1.0 -> v1.0
```
删除标签
```
# 删除本地标签
$ git tag -d v1.0

# 删除远程标签
$ git push origin -d v1.0
```


## .gitignore

> 一般我们总会有些文件无需纳入 Git 的管理，也不希望它们总出现在未跟踪文件列表。通常都是些自动生成的文件，比如日志文件，或者编译过程中创建的临时文件等。我们可以创建一个名为 .gitignore 的文件，列出要忽略的文件模式。

```
# 此为注释 – 将被 Git 忽略
# 忽略所有 .a 结尾的文件
*.a
# 但 lib.a 除外
!lib.a
# 仅仅忽略项目根目录下的 TODO 文件，不包括 subdir/TODO
/TODO
# 忽略 build/ 目录下的所有文件
build/
# 会忽略 doc/notes.txt 但不包括 doc/server/arch.txt
doc/*.txt
# 忽略 doc/ 目录下所有扩展名为 txt 的文件
doc/**/*.txt
```
## .gitkeep
>.gitkeep是一个占位文件。
Git是不会把一个完全空的文件夹添加到版本控制里，为了让空文件夹被跟踪，常规做法是在空文件夹里添加.gitkeep。
