if (typeof Page === 'function') {
Page({
  data: {
    activeTab: 'preview',
    code: '',
    html: '',
    previewNotice: '',
    previewError: '',
  },

  onLoad() {
    const code = wx.getStorageSync('html_preview_code_v1') || ''
    const hasScript = /<script[\s>]/i.test(code)
    const hasUnsupportedHtml = /<(iframe|canvas|svg|style|link|meta|head|html|body)[\s>]/i.test(code)
    const previewError = hasUnsupportedHtml
      ? '小程序 rich-text 只支持部分 HTML 标签，当前代码包含可能无法渲染的标签。'
      : ''
    this.setData({
      code,
      html: code,
      previewNotice: hasScript ? '小程序内预览只显示静态 HTML，script 交互代码不会执行。' : '',
      previewError,
    })
  },

  switchTab(e: WechatMiniprogram.CustomEvent<{ tab: string }>) {
    const tab = e.currentTarget.dataset.tab as string
    this.setData({ activeTab: tab === 'code' ? 'code' : 'preview' })
  },

  copyPreviewError() {
    const message = [
      'HTML 预览失败/受限',
      `提示：${this.data.previewNotice || '无'}`,
      `错误：${this.data.previewError || '无'}`,
      '',
      '代码：',
      this.data.code || '',
    ].join('\n')

    wx.setClipboardData({ data: message })
  },
})
}
