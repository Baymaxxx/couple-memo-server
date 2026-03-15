require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const helmet = require('helmet')

const app = express()
const PORT = process.env.PORT || 3000
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/couple-memo'

app.use(helmet())
app.use(cors())
app.use(express.json())

// 不在连接失败时退出，让 mongoose 自动重连
mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
  .then(() => console.log('[DB] MongoDB 连接成功'))
  .catch(err => console.error('[DB] 初始连接失败，将持续重试:', err.message))

mongoose.connection.on('error', err => console.error('[DB] 连接错误:', err.message))
mongoose.connection.on('disconnected', () => console.log('[DB] 断开连接，正在重连...'))
mongoose.connection.on('reconnected', () => console.log('[DB] 重连成功'))

app.use('/api', require('./routes'))

app.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState
  // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  res.json({
    ok: true,
    time: new Date().toISOString(),
    db: ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] || 'unknown'
  })
})

app.listen(PORT, () => console.log(`[Server] 运行在端口 ${PORT}`))
