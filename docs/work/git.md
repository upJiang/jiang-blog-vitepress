## OpenSSL SSL_read Connection was reset, errno 10054
解决方案：执行一下 git init，或者 执行一下 git config --global http.sslVerify "false"

## git 拉取代码本地 tag 跟远程不一致，would clobber existing tag
执行 git fetch --tags -f

## git clone 项目后换行符报错，error Delete `␍` prettier/prettier
设置一下 git config --global core.autocrlf false，然后重新拉取代码