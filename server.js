import express from 'express';
import bodyParser from 'body-parser';
import keysHandler from './api/keys.js';
import unbindHandler from './api/unbind.js';
import bindHandler from './api/bind.js';

const app = express();
const port = process.env.PORT || 3000;

// 增强的CORS配置
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// 强化请求体解析中间件
app.use((req, res, next) => {
  let data = '';
  req.setEncoding('utf8');
  req.on('data', chunk => {
    data += chunk;
  });
  req.on('end', () => {
    try {
      if (data) {
        req.rawBody = data;
        req.body = JSON.parse(data);
      }
      next();
    } catch (e) {
      console.error('JSON解析失败:', {
        url: req.url,
        method: req.method,
        headers: req.headers,
        body: data,
        error: e.message
      });
      return res.status(400).json({
        success: false,
        error: "无效的JSON格式"
      });
    }
  });
});

// 路由
app.get('/keys', keysHandler);
app.post('/unbind', unbindHandler);
app.post('/bind', bindHandler);

// 增强的错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', {
    url: req.url,
    method: req.method,
    error: err.stack
  });
  res.status(500).json({
    success: false,
    error: '服务器内部错误'
  });
});

app.listen(port, () => {
  console.log(`服务已启动，监听端口 ${port}`);
  console.log('请求体解析模式: 严格JSON校验');
});
