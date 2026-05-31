"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ai_1 = require("../../utils/ai");
const money = (value) => `CNY ${value.toFixed(4)}`;
if (typeof Page === 'function') {
    Page({
        data: {
            model: '',
            label: '',
            provider: '',
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            requests: 0,
            costText: 'CNY 0.0000',
            inputPrice: 'CNY 0 / million input tokens',
            outputPrice: 'CNY 0 / million output tokens',
            note: '',
            rows: [],
        },
        onLoad(query) {
            this.reload((query && query.model) || 'deepseek-chat');
        },
        reload(model) {
            const pricing = (0, ai_1.findModelPricing)(model) || ai_1.MODEL_PRICING[0];
            const usage = (0, ai_1.getTodayUsage)(model);
            const rows = ai_1.MODEL_PRICING.map((item) => {
                const itemUsage = (0, ai_1.getTodayUsage)(item.model);
                return {
                    model: item.model,
                    label: item.label,
                    provider: item.provider,
                    totalTokens: itemUsage.inputTokens + itemUsage.outputTokens,
                    costText: money(itemUsage.costCny),
                    barWidth: 0,
                };
            });
            const maxTokens = Math.max.apply(null, rows.map((row) => row.totalTokens).concat([1]));
            const normalizedRows = rows.map((row) => ({
                ...row,
                barWidth: Math.max(6, Math.round((row.totalTokens / maxTokens) * 100)),
            }));
            this.setData({
                model,
                label: pricing.label,
                provider: pricing.provider,
                inputTokens: usage.inputTokens,
                outputTokens: usage.outputTokens,
                totalTokens: usage.inputTokens + usage.outputTokens,
                requests: usage.requests,
                costText: money(usage.costCny),
                inputPrice: `${money(pricing.inputPerMillionCny)} / million input tokens`,
                outputPrice: `${money(pricing.outputPerMillionCny)} / million output tokens`,
                note: pricing.note,
                rows: normalizedRows,
            });
        },
        onSelectModel(e) {
            const model = e.currentTarget.dataset.model;
            if (model) {
                this.reload(model);
            }
        },
    });
}
