/**
 * 本地集成测试脚本
 * 使用内存版 MongoDB，无需外部数据库
 * 参数格式与 cloud.js 保持一致
 */
const { MongoMemoryServer } = require('mongodb-memory-server')

async function runTests() {
  console.log('🚀 启动内存版 MongoDB...')
  const mongod = await MongoMemoryServer.create()
  const uri = mongod.getUri()
  console.log(`✅ MongoDB 内存实例启动: ${uri}\n`)

  // 设置环境变量（在 require 之前）
  process.env.MONGO_URI = uri
  process.env.PORT = '3001'
  process.env.NODE_ENV = 'test'

  const http = require('http')
  const express = require('express')
  const mongoose = require('mongoose')
  const cors = require('cors')
  const helmet = require('helmet')

  const app = express()
  app.use(helmet())
  app.use(cors())
  app.use(express.json())

  await mongoose.connect(uri)
  console.log('✅ MongoDB 连接成功')

  app.use('/api', require('./src/routes'))
  app.get('/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }))

  const server = app.listen(3001)
  console.log('✅ 服务器启动在端口 3001\n')

  // HTTP 请求工具
  async function callAPI(action, data = {}) {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify({ action, data })
      const req = http.request({
        hostname: 'localhost', port: 3001, path: '/api/sync', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
      }, (res) => {
        let raw = ''
        res.on('data', c => raw += c)
        res.on('end', () => { try { resolve(JSON.parse(raw)) } catch { resolve(raw) } })
      })
      req.on('error', reject)
      req.write(body)
      req.end()
    })
  }

  async function checkHealth() {
    return new Promise((resolve, reject) => {
      http.get('http://localhost:3001/health', (res) => {
        let raw = ''
        res.on('data', c => raw += c)
        res.on('end', () => resolve(JSON.parse(raw)))
      }).on('error', reject)
    })
  }

  let passed = 0, failed = 0
  function assert(label, condition, detail = '') {
    if (condition) { console.log(`  ✅ ${label}`); passed++ }
    else { console.log(`  ❌ ${label}${detail ? ': ' + detail : ''}`); failed++ }
  }

  // ===== 测试开始 =====

  console.log('=== /health ===')
  const health = await checkHealth()
  assert('ok === true', health.ok === true)

  // ---- 创建房间 ----
  console.log('\n=== createRoom ===')
  const r1 = await callAPI('createRoom', { settings: { theme: 'light' } })
  assert('success', r1.success === true, JSON.stringify(r1))
  assert('返回 roomId', !!r1.roomId)
  assert('返回 code（6位）', typeof r1.code === 'string' && r1.code.length === 6)
  const roomId = r1.roomId
  const roomCode = r1.code
  console.log(`  → roomId=${roomId}, code=${roomCode}`)

  // ---- 加入房间 ----
  console.log('\n=== joinRoom ===')
  const r2 = await callAPI('joinRoom', { code: roomCode })
  assert('success', r2.success === true, JSON.stringify(r2))
  assert('返回 roomId', r2.roomId === roomId)

  // ---- 错误的房间码 ----
  console.log('\n=== joinRoom（错误码）===')
  const r2b = await callAPI('joinRoom', { code: 'XXXXXX' })
  assert('返回 success:false', r2b.success === false)

  // ---- 获取房间 ----
  console.log('\n=== getRoom ===')
  const r3 = await callAPI('getRoom', { roomId })
  assert('success', r3.success === true, JSON.stringify(r3))
  assert('code 匹配', r3.room?.code === roomCode)

  // ---- 保存设置 ----
  console.log('\n=== saveSettings ===')
  const r4 = await callAPI('saveSettings', { roomId, settings: { theme: 'dark', fontSize: 16 } })
  assert('success', r4.success === true, JSON.stringify(r4))

  // ---- 读取设置 ----
  console.log('\n=== loadSettings ===')
  const r5 = await callAPI('loadSettings', { roomId })
  assert('success', r5.success === true, JSON.stringify(r5))
  assert('theme=dark', r5.settings?.theme === 'dark')

  // ---- 添加备忘录 ----
  console.log('\n=== addMemo ===')
  const memo1 = { localId: 'local-001', content: '买牛奶', category: 'daily', color: '#ff6b6b', date: new Date().toISOString() }
  const r6 = await callAPI('addMemo', { roomId, memo: memo1 })
  assert('success', r6.success === true, JSON.stringify(r6))
  assert('返回 _id', !!r6._id)

  // ---- 再添加一条 ----
  const memo2 = { localId: 'local-002', content: '看电影', category: 'plan', color: '#4ecdc4', date: new Date().toISOString() }
  const r6b = await callAPI('addMemo', { roomId, memo: memo2 })
  assert('addMemo 第2条 success', r6b.success === true, JSON.stringify(r6b))

  // ---- 加载备忘录 ----
  console.log('\n=== loadMemos ===')
  const r7 = await callAPI('loadMemos', { roomId })
  assert('success', r7.success === true, JSON.stringify(r7))
  assert('返回数组', Array.isArray(r7.memos))
  assert('包含 local-001', r7.memos?.some(m => m.localId === 'local-001'))
  assert('包含 local-002', r7.memos?.some(m => m.localId === 'local-002'))
  assert('共2条', r7.memos?.length === 2)

  // ---- 更新备忘录 ----
  console.log('\n=== updateMemo ===')
  const r8 = await callAPI('updateMemo', { roomId, localId: 'local-001', updates: { content: '买牛奶和面包', done: true } })
  assert('success', r8.success === true, JSON.stringify(r8))

  // 验证更新
  const r8b = await callAPI('loadMemos', { roomId })
  const updated = r8b.memos?.find(m => m.localId === 'local-001')
  assert('content 已更新', updated?.content === '买牛奶和面包')
  assert('done=true', updated?.done === true)

  // ---- 删除备忘录 ----
  console.log('\n=== deleteMemo ===')
  const r9 = await callAPI('deleteMemo', { roomId, localId: 'local-002' })
  assert('success', r9.success === true, JSON.stringify(r9))

  // 验证删除
  const r9b = await callAPI('loadMemos', { roomId })
  assert('剩余1条', r9b.memos?.length === 1)
  assert('local-002 已删除', !r9b.memos?.some(m => m.localId === 'local-002'))

  // ---- 屏蔽功能 ----
  console.log('\n=== setShield / getShield ===')
  const r10 = await callAPI('setShield', { roomId, active: true })
  assert('setShield success', r10.success === true, JSON.stringify(r10))

  const r11 = await callAPI('getShield', { roomId })
  assert('getShield success', r11.success === true, JSON.stringify(r11))
  assert('active=true', r11.shield?.active === true)

  const r10b = await callAPI('setShield', { roomId, active: false })
  assert('取消屏蔽 success', r10b.success === true)

  // ---- 生理期 ----
  console.log('\n=== savePeriod / getPeriod ===')
  const periodData = { lastStart: '2026-03-01', cycleLength: 28, periodLength: 5 }
  const r12 = await callAPI('savePeriod', { roomId, periodData })
  assert('savePeriod success', r12.success === true, JSON.stringify(r12))

  const r13 = await callAPI('getPeriod', { roomId })
  assert('getPeriod success', r13.success === true, JSON.stringify(r13))
  assert('lastStart 匹配', r13.periodData?.lastStart === '2026-03-01')

  // ---- 呼唤 ----
  console.log('\n=== addSummon / getSummons ===')
  const r14 = await callAPI('addSummon', { roomId, from: 'user-1' })
  assert('addSummon success', r14.success === true, JSON.stringify(r14))

  const r15 = await callAPI('getSummons', { roomId })
  assert('getSummons success', r15.success === true, JSON.stringify(r15))
  assert('返回 logs 数组', Array.isArray(r15.logs))
  assert('包含1条记录', r15.logs?.length === 1)

  // ---- 未知操作 ----
  console.log('\n=== 未知操作 ===')
  const r16 = await callAPI('unknownAction', {})
  assert('返回 success:false', r16.success === false)

  // ===== 结果汇总 =====
  console.log(`\n${'='.repeat(45)}`)
  console.log(`测试结果: ${passed} 通过, ${failed} 失败`)
  console.log('='.repeat(45))

  server.close()
  await mongoose.disconnect()
  await mongod.stop()

  if (failed > 0) {
    console.log('\n❌ 有测试失败，请修复后再部署！')
    process.exit(1)
  } else {
    console.log('\n🎉 所有测试通过！可以安全部署。')
  }
}

runTests().catch(err => {
  console.error('测试运行失败:', err)
  process.exit(1)
})
