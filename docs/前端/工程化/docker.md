[wsl2 概念： 适用于 Linux 的 Windows 子系统](https://juejin.cn/post/6844904051088293896)

[wsl2 解释与 Docker Desktop 安装](https://zhuanlan.zhihu.com/p/224753478)

在WSL中创建docker容器，在windows下使用docker desktop进行可视化管理

## Docker Desktop 安装
[比较详细的教程地址](https://blog.csdn.net/qq_39611230/article/details/108641842)
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
右上角设置找到 Resources，修改下安装目录即可


### 当面试官问到Docker部署时，你可以从前端角度回答如下：

#### 熟悉Docker的基本概念
首先，解释Docker是一个容器化平台，它允许开发人员将应用程序及其依赖打包成可移植的容器。这些容器包含了应用程序的运行环境、依赖项和代码，使得应用程序在不同的环境中能够一致地运行。

#### 使用Docker容器化前端应用
提到你可以使用Docker来容器化前端应用。将前端应用放入Docker容器中可以带来一些好处，例如：
- 环境一致性： Docker容器确保前端应用在不同的环境中拥有相同的运行环境，避免了由于环境差异导致的问题。
- 可移植性： Docker容器可以在不同的计算机和云平台上运行，方便应用程序的部署和迁移。
- 简化部署： 使用Docker容器，可以将前端应用及其依赖项打包成一个镜像，然后通过简单的命令部署到任何支持Docker的环境中。

Docker镜像和容器的理解
- 解释Docker镜像是一个静态的快照，它包含了前端应用的代码、依赖和运行环境。容器是基于镜像运行的实例，它提供了一个隔离的运行环境，使得前端应用可以在其中运行。

前端开发中的Docker使用场景
- 开发环境一致性： 使用Docker容器可以确保整个开发团队在不同的开发环境中拥有一致的开发环境，避免了由于本地环境差异导致的问题。
- 持续集成/持续部署（CI/CD）： 在CI/CD流程中使用Docker容器可以简化构建和部署流程，提高应用程序的交付效率。
- 多阶段构建（Multi-stage Builds）： 使用Docker的多阶段构建功能可以帮助减小前端应用的镜像大小，提高构建和部署速度。
- 跨平台部署： Docker容器可以在不同的操作系统和云平台上运行，方便前端应用在多种环境中部署和扩展。