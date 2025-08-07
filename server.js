import express from 'express';
import bodyParser from 'body-parser';
import keysHandler from './api/keys.js';
import unbindHandler from './api/unbind.js';

const app = express();
const port = process.env.PORT || 3000;

// 中间件
app.use(bodyParser.json());

// 路由
app.get('/keys', keysHandler);
app.post('/unbind', unbindHandler);

// 错误处理
app.use((err, req, res, next) => {
  console.error('全局错误:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

app.listen(port, () => {
  console.log(`服务器运行在端口 ${port}`);
});
