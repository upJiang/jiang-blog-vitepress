## OpenSSL SSL_read Connection was reset, errno 10054
解决方案：执行一下 `git init`，或者 执行一下 `git config --global http.sslVerify "false"`，又或者 `ipconfig /flushdns`

## git 拉取代码本地 tag 跟远程不一致，would clobber existing tag
执行 git fetch --tags -f

## git clone 项目后换行符报错，error Delete `␍` prettier/prettier
设置一下 git config --global core.autocrlf false，然后重新拉取代码

## 拉取代码或者clone，报错：github kex_exchange_identification: Connection closed by remote host
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

修改下面这个文件（Git默认安装目录）：C:\Program Files\Git\etc\ssh\ssh_config
```
Host github.com
User junfeng@gmail.com
Hostname ssh.github.com
PreferredAuthentications publickey
IdentityFile ~/.ssh/id_rsa
Port 443
```
再次尝试如果还出问题，拉取方式换成 https，应该就好了