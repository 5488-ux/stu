"use strict";
const LEARNING_GRADE_KEY = 'learning_grade_v1';
if (typeof Page === 'function') {
    Page({
        data: {
            grades: ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'],
            gradeIndex: 0,
            savedGrade: 0,
        },
        onShow() {
            const savedGrade = Number(wx.getStorageSync(LEARNING_GRADE_KEY) || 0);
            this.setData({
                savedGrade,
                gradeIndex: savedGrade >= 1 && savedGrade <= 6 ? savedGrade - 1 : 0,
            });
        },
        onGradeChange(e) {
            this.setData({ gradeIndex: Number(e.detail.value) });
        },
        saveGrade() {
            const grade = this.data.gradeIndex + 1;
            wx.setStorageSync(LEARNING_GRADE_KEY, grade);
            wx.showToast({ title: '已保存', icon: 'success' });
            setTimeout(() => wx.navigateBack(), 500);
        },
        clearGrade() {
            wx.removeStorageSync(LEARNING_GRADE_KEY);
            this.setData({ savedGrade: 0, gradeIndex: 0 });
            wx.showToast({ title: '已关闭学习', icon: 'success' });
        },
    });
}
