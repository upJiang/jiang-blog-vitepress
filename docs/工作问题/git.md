## Failed to connect to github.com port 443 after 21036 ms: Couldn't connect to server

代码一直提交不上，看下是不是开了代理，设置成代理的端口即可

```
git config --global http.proxy http://127.0.0.1:10080
```

如何 yarn 一直没网络，应该也是代理的问题

```
yarn config set proxy http://127.0.0.1:10080
```

## OpenSSL SSL_read Connection was reset, errno 10054

解决方案：执行一下 `git init`，或者 执行一下
`git config --global http.sslVerify "false"`，又或者 `ipconfig /flushdns`

实在不行，，，就把修改的文件拷贝出去，然后重新克隆项目再还原回去吧。。。

## git 拉取代码本地 tag 跟远程不一致，would clobber existing tag

执行 git fetch --tags -f

## git clone 项目后换行符报错，error Delete `␍` prettier/prettier

设置一下 git config --global core.autocrlf false，然后重新拉取代码

## 拉取代码或者 clone，报错：github kex_exchange_identification: Connection closed by remote host

```
$ ssh -T git@github.com

kex_exchange_identification: Connection closed by remote host
```

原因：家中使用的梯子封禁了 Github 端口 22 的连接

将 Github 的连接端口从 22 改为 443 ，修改 ~/.ssh/config ，添加如下段落

```
Host github.com
    HostName ssh.github.com
    User git
    Port 443
```

windows 下：

修改下面这个文件（Git 默认安装目录）：C:\Program Files\Git\etc\ssh\ssh_config

```
Host github.com
User junfeng@gmail.com
Hostname ssh.github.com
PreferredAuthentications publickey
IdentityFile ~/.ssh/id_rsa
Port 443
```

再次尝试如果还出问题，拉取方式换成 https，应该就好
