import { ChatSession, createChatSession, loadChatSessions, saveActiveSessionId, saveChatSessions } from '../../utils/ai'

interface HistoryItem extends ChatSession {
  preview: string
  timeText: string
  countText: string
}

interface HistoryData {
  sessions: HistoryItem[]
}

const formatTime = (time: number) => {
  const date = new Date(time)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours().toString().padStart(2, '0')
  const minute = date.getMinutes().toString().padStart(2, '0')
  return `${month}/${day} ${hour}:${minute}`
}

const buildPreview = (session: ChatSession) => {
  const last = (session.messages || []).filter((msg) => msg.content).slice(-1)[0]
  return last ? last.content.replace(/\s+/g, ' ').slice(0, 48) : 'No messages'
}

if (typeof Page === 'function') {
Page({
  data: {
    sessions: [],
  } as HistoryData,

  onShow() {
    this.reload()
  },

  reload() {
    const sessions = loadChatSessions()
    this.setData({
      sessions: sessions.map((session) => ({
        ...session,
        preview: buildPreview(session),
        timeText: formatTime(session.updatedAt || session.createdAt || Date.now()),
        countText: `${(session.messages || []).length} messages`,
      })),
    })
  },

  onOpenSession(e: WechatMiniprogram.CustomEvent<{ id: string }>) {
    const id = e.currentTarget.dataset.id as string
    if (!id) return

    saveActiveSessionId(id)
    wx.navigateBack()
  },

  onDeleteSession(e: WechatMiniprogram.CustomEvent<{ id: string }>) {
    const id = e.currentTarget.dataset.id as string
    if (!id) return

    const sessions = loadChatSessions().filter((session) => session.id !== id)
    const nextSessions = sessions.length ? sessions : [createChatSession()]
    saveChatSessions(nextSessions)
    saveActiveSessionId(nextSessions[0].id)
    wx.showToast({ title: 'Deleted', icon: 'success' })
    this.reload()
  },
})
}
