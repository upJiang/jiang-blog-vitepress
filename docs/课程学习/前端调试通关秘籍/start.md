> 代码在某个平台运行，把运行时的状态通过某种方式暴露出来，传递给开发工具做 UI 的
> 展示和交互，辅助开发者排查问题、梳理流程、了解代码运行状态等，这个就是调试。

它们有通用的部分，都有 frontend、backend、调试协议、信道这四要素。

- backend 和 Chrome 集成，负责把 Chrome 的网页运行时状态通过调试协议暴露出来。
- frontend 是独立的，负责对接调试协议，做 UI 的展示和交互。

两者之间的调试协议叫做 Chrome DevTools Protocol，简称 CDP。

传输协议数据的方式叫做信道（message channel），有很多种，比如 Chrome DevTools 嵌
入在 Chrome 里时，两者通过全局的函数通信；当 Chrome DevTools 远程调试某个目标的
代码时，两者通过 WebSocket 通信。
