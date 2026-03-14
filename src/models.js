const mongoose = require('mongoose')
const { Schema } = mongoose

// ---- 房间 ----
const RoomSchema = new Schema({
  code:       { type: String, required: true, unique: true, uppercase: true },
  settings:   { type: Object, default: {} },
  members:    { type: Number, default: 1 },
  createdAt:  { type: Date, default: Date.now }
})

// ---- 备忘录 ----
const MemoSchema = new Schema({
  localId:   { type: String, required: true },
  roomId:    { type: String, required: true },
  content:   { type: String, default: '' },
  category:  { type: String, default: 'daily' },
  priority:  { type: String, default: 'medium' },
  assignee:  { type: String, default: 'both' },
  reminder:  { type: String, default: '' },
  note:      { type: String, default: '' },
  done:      { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})
MemoSchema.index({ roomId: 1, localId: 1 }, { unique: true })

// ---- 屏蔽 ----
const ShieldSchema = new Schema({
  roomId:    { type: String, required: true, unique: true },
  active:    { type: Boolean, default: false },
  since:     { type: Date }
})

// ---- 生理期 ----
const PeriodSchema = new Schema({
  roomId:       { type: String, required: true, unique: true },
  cycleLength:  { type: Number, default: 28 },
  periodLength: { type: Number, default: 5 },
  records:      { type: Array, default: [] },
  updatedAt:    { type: Date, default: Date.now }
})

// ---- 呼唤记录 ----
const SummonSchema = new Schema({
  roomId: { type: String, required: true },
  from:   { type: String, default: '' },
  at:     { type: Date, default: Date.now }
})

module.exports = {
  Room:   mongoose.model('Room',   RoomSchema),
  Memo:   mongoose.model('Memo',   MemoSchema),
  Shield: mongoose.model('Shield', ShieldSchema),
  Period: mongoose.model('Period', PeriodSchema),
  Summon: mongoose.model('Summon', SummonSchema)
}
