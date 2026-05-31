"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../../utils/util");
if (typeof Component === 'function') {
    Component({
        data: {
            logs: [],
        },
        lifetimes: {
            attached() {
                this.setData({
                    logs: (wx.getStorageSync('logs') || []).map((log) => {
                        return {
                            date: (0, util_1.formatTime)(new Date(log)),
                            timeStamp: log,
                        };
                    }),
                });
            },
        },
    });
}
