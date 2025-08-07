// server.js
import express from 'express';
import bodyParser from 'body-parser';
import keysHandler from './api/keys.js';
import unbindHandler from './api/unbind.js';
import bindHandler from './api/bind.js';  // 新增绑定处理器

const app = express();
const port = process.env.PORT || 3000;

// 中间件
app.use(bodyParser.json());

// 路由
app.get('/keys', keysHandler);
app.post('/unbind', unbindHandler);
app.post('/bind', bindHandler);  // 新增绑定路由

// 错误处理
app.use((err, req, res, next) => {
  console.error('全局错误:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

app.listen(port, () => {
  console.log(`服务器运行在端口 ${port}`);
});
