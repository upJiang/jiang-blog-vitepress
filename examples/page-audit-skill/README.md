# page-audit Skill 示例

这是 `docs/ai-agent/skill-authoring-practice.md` 的可运行伴随工程。它演示一个只读页面审计 Skill，采集 HTTP 状态、最终 URL、原始 HTML 的 title、canonical 和 robots，并把事实输出为 JSON。

运行单元测试：

```bash
cd examples/page-audit-skill
python3 -m unittest discover -s tests -v
```

在明确获得检查授权后，可以执行：

```bash
python3 scripts/audit_page.py \
  https://example.com \
  --allow-host example.com
```

脚本只检查原始 HTTP 响应，不执行 JavaScript，也不能证明页面已经被搜索引擎抓取、索引或获得排名。DNS 解析、重定向和网络状态仍可能在校验后变化；高风险环境应使用网络沙箱或只允许预先配置的出口代理，而不是只依赖应用层检查。
