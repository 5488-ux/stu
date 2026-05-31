"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ai_1 = require("../../utils/ai");
const formatTime = (time) => {
    const date = new Date(time);
    const pad = (value) => `${value}`.padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
if (typeof Page === 'function') {
    Page({
        data: {
            records: [],
        },
        onShow() {
            this.reload();
        },
        reload() {
            this.setData({
                records: (0, ai_1.loadImageGenerationRecords)().map((record) => ({
                    ...record,
                    timeText: formatTime(record.createdAt),
                    isDataUrl: record.imageUrl.indexOf('data:') === 0,
                })),
            });
        },
        previewImage(e) {
            const url = e.currentTarget.dataset.url;
            if (!url || url.startsWith('data:')) {
                wx.showToast({ title: 'Base64 图片请复制后使用', icon: 'none' });
                return;
            }
            wx.previewImage({ urls: [url], current: url });
        },
        copyImageUrl(e) {
            const url = e.currentTarget.dataset.url;
            wx.setClipboardData({ data: url || '' });
        },
        copyPrompt(e) {
            const prompt = e.currentTarget.dataset.prompt;
            wx.setClipboardData({ data: prompt || '' });
        },
        deleteRecord(e) {
            const id = e.currentTarget.dataset.id;
            (0, ai_1.deleteImageGenerationRecord)(id);
            this.reload();
            wx.showToast({ title: '已删除', icon: 'success' });
        },
        clearAll() {
            if (!this.data.records.length)
                return;
            wx.showModal({
                title: '清空作品',
                content: '确定清空所有图片生成历史吗？',
                confirmText: '清空',
                confirmColor: '#ff4f4f',
                success: (res) => {
                    if (!res.confirm)
                        return;
                    (0, ai_1.clearImageGenerationRecords)();
                    this.reload();
                    wx.showToast({ title: '已清空', icon: 'success' });
                },
            });
        },
    });
}
