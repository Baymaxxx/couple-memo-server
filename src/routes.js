const router = require('express').Router()
const { Room, Memo, Shield, Period, Summon } = require('./models')

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

// 统一入口：POST /api/sync
router.post('/sync', async (req, res) => {
  const { action, data = {} } = req.body
  try {
    switch (action) {

      // ========== 房间 ==========
      case 'createRoom': {
        let code, exists
        do {
          code = genCode()
          exists = await Room.findOne({ code })
        } while (exists)
        const room = await Room.create({ code, settings: data.settings || {}, members: 1 })
        return res.json({ success: true, roomId: room._id, code })
      }

      case 'joinRoom': {
        const room = await Room.findOne({ code: data.code.toUpperCase() })
        if (!room) return res.json({ success: false, error: '房间码不存在' })
        room.members = 2
        await room.save()
        return res.json({ success: true, roomId: room._id, settings: room.settings })
      }

      case 'getRoom': {
        const room = await Room.findById(data.roomId)
        if (!room) return res.json({ success: false, error: '房间不存在' })
        return res.json({ success: true, room: { _id: room._id, code: room.code, settings: room.settings, members: room.members } })
      }

      // ========== 设置 ==========
      case 'saveSettings': {
        await Room.findByIdAndUpdate(data.roomId, { settings: data.settings })
        return res.json({ success: true })
      }

      case 'loadSettings': {
        const room = await Room.findById(data.roomId)
        return res.json({ success: true, settings: room ? room.settings : null })
      }

      // ========== 备忘录 ==========
      case 'addMemo': {
        const memo = data.memo
        const doc = await Memo.findOneAndUpdate(
          { roomId: data.roomId, localId: memo.id || memo.localId },
          {
            localId:   memo.id || memo.localId,
            roomId:    data.roomId,
            content:   memo.content || '',
            category:  memo.category || 'daily',
            priority:  memo.priority || 'medium',
            assignee:  memo.assignee || 'both',
            reminder:  memo.reminder || '',
            note:      memo.note || '',
            done:      memo.done || false,
            updatedAt: new Date()
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        )
        return res.json({ success: true, _id: doc._id })
      }

      case 'loadMemos': {
        const memos = await Memo.find({ roomId: data.roomId }).sort({ createdAt: -1 }).limit(200)
        return res.json({ success: true, memos })
      }

      case 'updateMemo': {
        const updates = { ...data.updates, updatedAt: new Date() }
        delete updates._id
        delete updates.id
        delete updates.localId
        delete updates.roomId
        const result = await Memo.findOneAndUpdate(
          { roomId: data.roomId, localId: data.localId },
          updates
        )
        if (!result) return res.json({ success: false, error: 'memo not found' })
        return res.json({ success: true })
      }

      case 'deleteMemo': {
        await Memo.deleteOne({ roomId: data.roomId, localId: data.localId })
        return res.json({ success: true })
      }

      // ========== 屏蔽 ==========
      case 'setShield': {
        await Shield.findOneAndUpdate(
          { roomId: data.roomId },
          { active: data.active, since: data.active ? new Date() : null },
          { upsert: true }
        )
        return res.json({ success: true })
      }

      case 'getShield': {
        const shield = await Shield.findOne({ roomId: data.roomId })
        return res.json({ success: true, shield: shield || { active: false } })
      }

      // ========== 生理期 ==========
      case 'savePeriod': {
        const payload = { ...data.periodData, updatedAt: new Date() }
        delete payload._id
        await Period.findOneAndUpdate(
          { roomId: data.roomId },
          { ...payload, roomId: data.roomId },
          { upsert: true }
        )
        return res.json({ success: true })
      }

      case 'getPeriod': {
        const period = await Period.findOne({ roomId: data.roomId })
        return res.json({ success: true, periodData: period || null })
      }

      // ========== 呼唤 ==========
      case 'addSummon': {
        await Summon.create({ roomId: data.roomId, from: data.from })
        return res.json({ success: true })
      }

      case 'getSummons': {
        const logs = await Summon.find({ roomId: data.roomId }).sort({ at: -1 }).limit(20)
        return res.json({ success: true, logs })
      }

      default:
        return res.json({ success: false, error: `未知操作: ${action}` })
    }
  } catch (e) {
    console.error(`[routes] action=${action} error:`, e.message)
    return res.status(500).json({ success: false, error: e.message })
  }
})

module.exports = router
