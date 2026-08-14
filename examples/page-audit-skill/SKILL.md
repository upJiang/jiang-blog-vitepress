---
name: page-audit
description: 当用户明确授权检查一个 HTTP 页面，并要求核对状态、最终 URL、原始 HTML 的 title、canonical 或 robots 时使用；只读，不修改网站。
---

# 页面审计

## 输入

- 用户明确提供并允许检查的 URL。
- 允许访问的精确主机名；缺失时先确认，不能从重定向猜测。

## 执行

1. 读取 `references/checks.md`，确认当前检查只需要原始 HTML。
2. 运行 `scripts/audit_page.py URL --allow-host HOST`。
3. 若脚本退出 0，把 JSON 事实填入 `templates/report.md`。
4. 若脚本非零退出，保留错误类型，停止依赖页面正文的判断。

## 边界

- 不登录、不发送 Cookie、不修改页面或站点配置。
- 不访问 localhost、私网、保留地址或允许列表之外的主机。
- 不把原始 HTML 缺少字段写成渲染 DOM 也缺少。
- 不从 title、canonical 或 robots 推断页面已收录或有排名。
