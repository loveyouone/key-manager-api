// server.js
import express from 'express';
import bodyParser from 'body-parser';
import keysHandler from './api/keys.js';
import unbindHandler from './api/unbind.js';
import bindHandler from './api/bind.js';

const app = express();
const port = process.env.PORT || 3000;

// CORS中间件（保持不变）
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// 关键修复：增强body-parser配置
app.use(bodyParser.json({
  verify: (req, res, buf) => {
    try {
      // 存储原始body数据用于调试
      req.rawBody = buf.toString();
      // 强制解析JSON，避免undefined
      JSON.parse(req.rawBody);
    } catch (e) {
      console.error('无效的JSON格式:', req.rawBody);
      throw new Error('Invalid JSON');
    }
  },
  strict: true  // 只接受数组和对象
}));

// 路由（保持不变）
app.get('/keys', keysHandler);
app.post('/unbind', unbindHandler);
app.post('/bind', bindHandler);

// 增强的错误处理中间件
app.use((err, req, res, next) => {
  console.error('请求处理错误:', {
    url: req.url,
    method: req.method,
    headers: req.headers,
    body: req.rawBody,
    error: err.message
  });

  if (err.message.includes('JSON')) {
    return res.status(400).json({ 
      success: false,
      error: "无效的JSON请求格式" 
    });
  }

  res.status(500).json({ 
    success: false,
    error: '服务器内部错误' 
  });
});

app.listen(port, () => {
  console.log(`服务器运行在端口 ${port}`);
  console.log('已启用严格JSON模式，只接受有效的JSON请求体');
});
