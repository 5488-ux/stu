"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ai_1 = require("../../utils/ai");
const formatTime = (time) => {
    const date = new Date(time);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    return `${month}/${day} ${hour}:${minute}`;
};
const buildPreview = (session) => {
    const last = (session.messages || []).filter((msg) => msg.content).slice(-1)[0];
    return last ? last.content.replace(/\s+/g, ' ').slice(0, 48) : 'No messages';
};
if (typeof Page === 'function') {
    Page({
        data: {
            sessions: [],
        },
        onShow() {
            this.reload();
        },
        reload() {
            const sessions = (0, ai_1.loadChatSessions)();
            this.setData({
                sessions: sessions.map((session) => ({
                    ...session,
                    preview: buildPreview(session),
                    timeText: formatTime(session.updatedAt || session.createdAt || Date.now()),
                    countText: `${(session.messages || []).length} messages`,
                })),
            });
        },
        onOpenSession(e) {
            const id = e.currentTarget.dataset.id;
            if (!id)
                return;
            (0, ai_1.saveActiveSessionId)(id);
            wx.navigateBack();
        },
        onDeleteSession(e) {
            const id = e.currentTarget.dataset.id;
            if (!id)
                return;
            const sessions = (0, ai_1.loadChatSessions)().filter((session) => session.id !== id);
            const nextSessions = sessions.length ? sessions : [(0, ai_1.createChatSession)()];
            (0, ai_1.saveChatSessions)(nextSessions);
            (0, ai_1.saveActiveSessionId)(nextSessions[0].id);
            wx.showToast({ title: 'Deleted', icon: 'success' });
            this.reload();
        },
    });
}
