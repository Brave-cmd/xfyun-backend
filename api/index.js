const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

// 允许跨域（解决前端调用后端的跨域问题）
app.use(cors());
// 解析 JSON 格式的请求体（前端传参需要）
app.use(express.json());

// 讯飞 Spark X1.5 配置信息（已替换为你的实际信息）
const XFYUN_CONFIG = {
  appid: 'ce6b8887',
  apiKey: '026c46f373d0dfe51fea4a982410e5b1',
  apiSecret: 'ODA5MTA0MDYzNGY0YzFlNzU5ZGM4Nzcy',
  apiUrl: 'https://spark-api-open.xf-yun.com/v2/chat/completions'
};

// 生成讯飞接口需要的 Authorization 鉴权信息
function generateAuthorization() {
  const date = new Date().toUTCString();
  const signatureOrigin = `host: spark-api-open.xf-yun.com\ndate: ${date}\nPOST /v2/chat/completions HTTP/1.1`;

  // 使用 Crypto 模块计算 HMAC-SHA256 签名（Node.js 内置，无需额外安装）
  const crypto = require('crypto');
  const signatureSha = crypto.createHmac('sha256', XFYUN_CONFIG.apiSecret)
    .update(signatureOrigin)
    .digest('base64');

  const authorizationOrigin = `api_key="${XFYUN_CONFIG.apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signatureSha}"`;
  return Buffer.from(authorizationOrigin).toString('base64');
}

// 讯飞接口代理（前端调用此接口，后端转发到讯飞）
app.post('/api/xfyun/v2/chat/completions', async (req, res) => {
  try {
    // 1. 生成鉴权信息
    const authorization = generateAuthorization();
    const date = new Date().toUTCString();

    // 2. 转发前端请求到讯飞 Spark X1.5 接口
    const response = await axios.post(
      XFYUN_CONFIG.apiUrl,
      req.body, // 直接转发前端传递的参数（如 messages、temperature 等）
      {
        headers: {
          'Authorization': authorization,
          'Content-Type': 'application/json',
          'X-Appid': XFYUN_CONFIG.appid,
          'Date': date,
          'Host': 'spark-api-open.xf-yun.com'
        }
      }
    );

    // 3. 将讯飞的响应结果返回给前端
    res.json(response.data);
  } catch (error) {
    console.error('讯飞接口调用失败：', error.response?.data || error.message);
    res.status(500).json({
      error: '调用讯飞大模型失败',
      detail: error.response?.data || error.message
    });
  }
});

// 暴露接口服务（Vercel 部署时需要）
module.exports = app;