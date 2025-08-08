const express = require('express');
const bodyParser = require('body-parser');
const keysHandler = require('./api/keys');
const bindHandler = require('./api/bind');
const unbindHandler = require('./api/unbind');

const app = express();
const port = process.env.PORT || 3000;

// CORS支持
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// JSON解析
app.use(bodyParser.json());

// API路由
app.get('/keys', keysHandler);
app.post('/bind', bindHandler);
app.post('/unbind', unbindHandler);

// 错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ 
    success: false,
    error: '全自动处理失败' 
  });
});

app.listen(port, () => {
  console.log(`全自动卡密管理系统运行在端口 ${port}`);
});
