# API 文档

## 获取所有卡密
`GET /keys`

## 绑定卡密
`POST /bind`
```json
{
  "key": "卡密值",
  "playerId": "玩家ID"
}
