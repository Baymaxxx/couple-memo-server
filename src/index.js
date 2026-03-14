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

mongoose.connect(MONGO_URI)
  .then(() => console.log('[DB] MongoDB 连接成功'))
  .catch(err => { console.error('[DB] 连接失败:', err); process.exit(1) })

app.use('/api', require('./routes'))
app.get('/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }))

app.listen(PORT, () => console.log(`[Server] 运行在端口 ${PORT}`))
