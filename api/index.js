const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

// 允许跨域（解决前端调用后端的跨域问题）
app.use(cors());
// 解析 JSON 格式的请求体（前端传参需要）
app.use(express.json());

// 讯飞 Spark X1.5 配置信息（已填入你的实际鉴权信息）
const XFYUN_CONFIG = {
  appid: 'ce6b8887',
  apiKey: '026c46f373d0dfe51fea4a982410e5b1',
  apiSecret: 'ODA5MTA0MDYzNGY0YzFlNzU5ZGM4Nzcy',
  apiUrl: 'https://spark-api-open.xf-yun.com/v2/chat/completions' // 讯飞 X1.5 官方 HTTP 接口地址
};

// 生成讯飞接口要求的 Authorization 鉴权信息（严格遵循讯飞文档规范）
function generateAuthorization() {
  const date = new Date().toUTCString();
  // 签名原始串：严格按照讯飞文档要求的格式（host + date + request-line）
  const signatureOrigin = `host: spark-api-open.xf-yun.com\ndate: ${date}\nPOST /v2/chat/completions HTTP/1.1`;

  // 使用 Node.js 内置 Crypto 模块计算 HMAC-SHA256 签名（无需额外安装依赖）
  const crypto = require('crypto');
  const signatureSha = crypto.createHmac('sha256', XFYUN_CONFIG.apiSecret)
    .update(signatureOrigin)
    .digest('base64');

  // 构造授权原始串，再进行 Base64 编码
  const authorizationOrigin = `api_key="${XFYUN_CONFIG.apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signatureSha}"`;
  return Buffer.from(authorizationOrigin).toString('base64');
}

// 讯飞接口代理（前端调用此接口，后端转发到讯飞 X1.5 模型）
app.post('/api/xfyun/v2/chat/completions', async (req, res) => {
  try {
    // 1. 生成鉴权信息（每次请求动态生成，避免过期）
    const authorization = generateAuthorization();
    const date = new Date().toUTCString();

    // 2. 构造请求参数：确保符合讯飞 X1.5 文档要求（model 默认为 spark-x，前端可覆盖）
    const requestData = {
      model: 'spark-x', // 讯飞 X1.5 对应 model 值（文档明确要求）
      ...req.body // 合并前端传递的参数（如 messages、temperature、tools 等，覆盖默认值）
    };

    // 3. 转发请求到讯飞官方接口
    const response = await axios.post(
      XFYUN_CONFIG.apiUrl,
      requestData,
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

    // 4. 将讯飞的响应原样返回给前端（包含 content、reasoning_content 等字段）
    res.json(response.data);
  } catch (error) {
    // 错误详情输出（方便调试：讯飞错误码、错误信息）
    const errorDetail = error.response?.data || { message: error.message };
    console.error('讯飞接口调用失败：', errorDetail);
    res.status(500).json({
      error: '调用讯飞大模型失败',
      code: errorDetail.code || 'UNKNOWN_ERROR',
      detail: errorDetail.message || '网络异常'
    });
  }
});

// 暴露接口服务（Vercel 部署时自动识别）
module.exports = app;