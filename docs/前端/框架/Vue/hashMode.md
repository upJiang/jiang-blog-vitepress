> 为了达到改变视图的同时不会向后端发出请求

hash:含有#号，有些 app 不允许地址带有#号，或者后端无法识别，这个时候得用 history

history: pushState() 设置的新 URL 可以是与当前 URL 同源的任意 URL,以及 可以添加
任意类型的数据到记录中，但是 history 需要后端配合设置 将不存在的路径请求重定向到
入口文件（index.html）
