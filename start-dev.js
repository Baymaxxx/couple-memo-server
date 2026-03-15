/**
 * 开发环境启动脚本
 * 使用内存版 MongoDB，无需外部数据库
 */
const { MongoMemoryServer } = require('mongodb-memory-server')

async function startServer() {
  console.log('🚀 启动 Couple Memo 开发服务器...')
  console.log('')

  // 启动内存版 MongoDB
  console.log('📦 启动内存版 MongoDB...')
  const mongod = await MongoMemoryServer.create()
  const uri = mongod.getUri()
  console.log(`✅ MongoDB 内存实例启动`)
  console.log(`   URI: ${uri}`)
  console.log('')

  // 设置环境变量
  process.env.MONGO_URI = uri
  process.env.PORT = process.env.PORT || '3000'

  // 启动 Express 服务
  require('./src/index')

  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✨ 开发服务器已启动！')
  console.log('')
  console.log('   🌐 健康检查: http://localhost:3000/health')
  console.log('   📡 API 接口: http://localhost:3000/api/sync')
  console.log('   💾 数据库: 内存模式（重启后数据会清空）')
  console.log('')
  console.log('   按 Ctrl+C 停止服务')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

startServer().catch(err => {
  console.error('❌ 启动失败:', err)
  process.exit(1)
})
