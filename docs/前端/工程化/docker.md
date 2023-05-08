wsl2 概念： 适用于 Linux 的 Windows 子系统

[wsl2 解释与 Docker Desktop 安装](https://zhuanlan.zhihu.com/p/224753478)

在WSL中创建docker容器，在windows下使用docker desktop进行可视化管理

## Docker Desktop 安装
## 下载安装
[下载地址](https://docs.docker.com/desktop/windows/install/)<br>
- 安装时会自动安装 `wsl2`
- win11 第一次打开 `Docker Desktop` 报错，
    - 以管理员身份运行 `cmd`，执行 `wsl --update`

再次报错:
```
An unexpected error was encountered while executing a WSL command. Common causes include access rights issues, which occur after waking the computer or not being connected to your domain/active directory.

以管理员身份运行 `cmd`，执行 `netsh winsock reset`，然后重启电脑
```

## 配置
#### 修改安装目录
右上角设置找到 Resources，修改下安装目录
