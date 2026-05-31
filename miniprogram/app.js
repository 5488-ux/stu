"use strict";
const defineApp = typeof App === 'function' ? App : function (_options) { };
// Devtools/plugins may probe WeixinJSBridge even in Mini Program runtime.
// Provide a minimal no-op bridge to avoid ReferenceError without changing app logic.
const globalScope = typeof globalThis !== 'undefined'
    ? globalThis
    : typeof wx !== 'undefined'
        ? wx
        : {};
if (typeof globalScope.WeixinJSBridge === 'undefined') {
    const noop = () => { };
    globalScope.WeixinJSBridge = {
        invoke: noop,
        on: noop,
        subscribeHandler: noop,
    };
}
defineApp({
    globalData: {},
    onLaunch() {
        const logs = wx.getStorageSync('logs') || [];
        logs.unshift(Date.now());
        wx.setStorageSync('logs', logs);
        wx.login({
            success: (res) => {
                console.log(res.code);
            },
        });
    },
});
