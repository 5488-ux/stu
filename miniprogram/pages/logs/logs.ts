import { formatTime } from '../../utils/util'

if (typeof Component === 'function') {
Component({
  data: {
    logs: [],
  },
  lifetimes: {
    attached() {
      this.setData({
        logs: (wx.getStorageSync('logs') || []).map((log: string) => {
          return {
            date: formatTime(new Date(log)),
            timeStamp: log,
          }
        }),
      })
    },
  },
})
}
