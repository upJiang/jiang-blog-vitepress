>cURL是一个利用URL语法在命令行下工作的文件传输工具。curl 是常用的命令行工具，用来请求 Web 服务器。它的名字就是客户端（client）的 URL 工具的意思。


[使用文档](https://blog.csdn.net/weixin_34349320/article/details/88853326)

可用于设置企业微信机器人，key是企业微信群的机器人key
```
curl 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=693axxx6-7aoc-4bc4-97a0-0ec2sifa5aaa' \
-H 'Content-Type: application/json' \
-d '
{
"msgtype": "text",
"text": {
"content": "hello world"
}
}'
```