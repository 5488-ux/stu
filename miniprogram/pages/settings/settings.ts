if (typeof Page === 'function') {
Page({
  goApi() {
    wx.navigateTo({ url: '/pages/api/api' })
  },

  goLearning() {
    wx.navigateTo({ url: '/pages/learning/learning' })
  },

  goPrivacy() {
    wx.navigateTo({ url: '/pages/legal/legal?mode=privacy' })
  },

  goTerms() {
    wx.navigateTo({ url: '/pages/legal/legal?mode=terms' })
  },

  clearAllData() {
    wx.showModal({
      title: '清除所有信息',
      content: '这会删除 API 配置、聊天记录、用量记录、HTML预览缓存和协议同意记录。清除后需要重新同意协议并重新配置 API。',
      confirmText: '清除',
      confirmColor: '#e55353',
      cancelText: '取消',
      success: (res) => {
        if (!res.confirm) return

        wx.clearStorageSync()
        wx.showToast({ title: '已清除', icon: 'success' })
        setTimeout(() => {
          wx.reLaunch({ url: '/pages/index/index' })
        }, 500)
      },
    })
  },
})
}
