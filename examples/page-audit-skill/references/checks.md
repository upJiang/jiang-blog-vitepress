# 原始 HTML 检查口径

- `status` 和 `final_url` 来自实际 GET 与重定向结果。
- `title` 取第一个非空 `<title>` 的文本。
- `canonical` 取第一个 `rel` 包含 `canonical` 的 `<link href>`。
- `robots` 取第一个 `name=robots` 的 `<meta content>`。
- 字段为 `null` 只说明原始 HTML 没找到。需要比较渲染 DOM 时，转交浏览器检查。
- HTTP 可访问不代表页面可索引；索引与排名需要搜索平台数据。
