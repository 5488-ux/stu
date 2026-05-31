import {
  ImageGenerationRecord,
  clearImageGenerationRecords,
  deleteImageGenerationRecord,
  loadImageGenerationRecords,
} from '../../utils/ai'

interface ImageRecordView extends ImageGenerationRecord {
  timeText: string
  isDataUrl: boolean
}

interface ImagesData {
  records: ImageRecordView[]
}

const formatTime = (time: number) => {
  const date = new Date(time)
  const pad = (value: number) => `${value}`.padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

if (typeof Page === 'function') {
Page({
  data: {
    records: [],
  } as ImagesData,

  onShow() {
    this.reload()
  },

  reload() {
    this.setData({
      records: loadImageGenerationRecords().map((record) => ({
        ...record,
        timeText: formatTime(record.createdAt),
        isDataUrl: record.imageUrl.indexOf('data:') === 0,
      })),
    })
  },

  previewImage(e: WechatMiniprogram.CustomEvent<{ url: string }>) {
    const url = e.currentTarget.dataset.url as string
    if (!url || url.startsWith('data:')) {
      wx.showToast({ title: 'Base64 图片请复制后使用', icon: 'none' })
      return
    }

    wx.previewImage({ urls: [url], current: url })
  },

  copyImageUrl(e: WechatMiniprogram.CustomEvent<{ url: string }>) {
    const url = e.currentTarget.dataset.url as string
    wx.setClipboardData({ data: url || '' })
  },

  copyPrompt(e: WechatMiniprogram.CustomEvent<{ prompt: string }>) {
    const prompt = e.currentTarget.dataset.prompt as string
    wx.setClipboardData({ data: prompt || '' })
  },

  deleteRecord(e: WechatMiniprogram.CustomEvent<{ id: string }>) {
    const id = e.currentTarget.dataset.id as string
    deleteImageGenerationRecord(id)
    this.reload()
    wx.showToast({ title: '已删除', icon: 'success' })
  },

  clearAll() {
    if (!this.data.records.length) return

    wx.showModal({
      title: '清空作品',
      content: '确定清空所有图片生成历史吗？',
      confirmText: '清空',
      confirmColor: '#ff4f4f',
      success: (res) => {
        if (!res.confirm) return
        clearImageGenerationRecords()
        this.reload()
        wx.showToast({ title: '已清空', icon: 'success' })
      },
    })
  },
})
}
