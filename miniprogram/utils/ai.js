"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTodayUsage = exports.clearImageGenerationRecords = exports.deleteImageGenerationRecord = exports.addImageGenerationRecord = exports.saveImageGenerationRecords = exports.loadImageGenerationRecords = exports.addUsageRecord = exports.saveUsageRecords = exports.loadUsageRecords = exports.calcCostCny = exports.estimateTokens = exports.findModelPricing = exports.getTodayKey = exports.buildSessionTitle = exports.saveActiveSessionId = exports.loadActiveSessionId = exports.saveChatSessions = exports.loadChatSessions = exports.createChatSession = exports.createId = exports.getActiveConfig = exports.saveAISettings = exports.loadAISettings = exports.getDefaultSettings = exports.normalizeMultimodal = exports.MODEL_LABELS = exports.MODEL_VALUES = exports.MODEL_OPTIONS = exports.MODEL_PRICING = void 0;
const AI_SETTINGS_KEY = 'ai_settings_v1';
const CHAT_SESSIONS_KEY = 'chat_sessions_v1';
const ACTIVE_SESSION_KEY = 'active_chat_session_v1';
const MODEL_USAGE_KEY = 'model_usage_v1';
const IMAGE_HISTORY_KEY = 'image_generation_history_v1';
const USD_TO_CNY = 7.25;
const NEW_CHAT_TITLE = '\u65b0\u5bf9\u8bdd';
const usd = (value) => Number((value * USD_TO_CNY).toFixed(4));
exports.MODEL_PRICING = [
    { provider: 'DeepSeek', model: 'deepseek-chat', label: 'DeepSeek Chat', inputPerMillionCny: usd(0.27), outputPerMillionCny: usd(1.1), note: 'DeepSeek 官方美元价格换算，未计缓存命中优惠' },
    { provider: 'DeepSeek', model: 'deepseek-reasoner', label: 'DeepSeek Reasoner', inputPerMillionCny: usd(0.55), outputPerMillionCny: usd(2.19), note: 'DeepSeek 官方美元价格换算，输出含推理 token' },
    { provider: 'OpenAI', model: 'gpt-4.1', label: 'GPT-4.1', inputPerMillionCny: usd(2), outputPerMillionCny: usd(8), note: 'OpenAI API 公开价格换算' },
    { provider: 'OpenAI', model: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', inputPerMillionCny: usd(0.4), outputPerMillionCny: usd(1.6), note: 'OpenAI API 公开价格换算' },
    { provider: 'OpenAI', model: 'gpt-4o', label: 'GPT-4o', inputPerMillionCny: usd(2.5), outputPerMillionCny: usd(10), note: 'OpenAI API 公开价格换算' },
    { provider: 'OpenAI', model: 'gpt-4o-mini', label: 'GPT-4o Mini', inputPerMillionCny: usd(0.15), outputPerMillionCny: usd(0.6), note: 'OpenAI API 公开价格换算' },
    { provider: 'Anthropic', model: 'claude-sonnet', label: 'Claude Sonnet', inputPerMillionCny: usd(3), outputPerMillionCny: usd(15), note: 'Claude Sonnet 系列常见 API 价格换算' },
    { provider: 'Anthropic', model: 'claude-haiku', label: 'Claude Haiku', inputPerMillionCny: usd(0.8), outputPerMillionCny: usd(4), note: 'Claude Haiku 系列常见 API 价格换算' },
    { provider: 'Anthropic', model: 'claude-opus', label: 'Claude Opus', inputPerMillionCny: usd(15), outputPerMillionCny: usd(75), note: 'Claude Opus 系列常见 API 价格换算' },
    { provider: 'Google', model: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', inputPerMillionCny: usd(1.25), outputPerMillionCny: usd(10), note: 'Gemini API 常见公开价格换算，长上下文可能不同' },
    { provider: 'Google', model: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', inputPerMillionCny: usd(0.3), outputPerMillionCny: usd(2.5), note: 'Gemini API 常见公开价格换算' },
    { provider: 'Qwen', model: 'qwen-plus', label: '通义千问 Plus', inputPerMillionCny: 0.8, outputPerMillionCny: 2, note: '国内主流模型预置估算价，可按实际账单调整' },
    { provider: 'Qwen', model: 'qwen-turbo', label: '通义千问 Turbo', inputPerMillionCny: 0.3, outputPerMillionCny: 0.6, note: '国内主流模型预置估算价，可按实际账单调整' },
    { provider: 'Moonshot', model: 'moonshot-v1-8k', label: 'Kimi 8K', inputPerMillionCny: 12, outputPerMillionCny: 12, note: '国内主流模型预置估算价，可按实际账单调整' },
    { provider: 'Doubao', model: 'doubao-pro', label: '豆包 Pro', inputPerMillionCny: 0.8, outputPerMillionCny: 2, note: '国内主流模型预置估算价，可按实际账单调整' },
];
exports.MODEL_OPTIONS = exports.MODEL_PRICING.map((item) => ({
    label: item.label,
    value: item.model,
}));
exports.MODEL_VALUES = exports.MODEL_OPTIONS.map((model) => model.value);
exports.MODEL_LABELS = exports.MODEL_OPTIONS.map((model) => model.label);
const defaultConfig = {
    id: 'deepseek-default',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    apiKey: '',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    multimodal: {
        enabled: false,
        imageGeneration: false,
        imageRecognition: false,
        fileUpload: false,
    },
};
const normalizeMultimodal = (config) => ({
    enabled: !!config && !!config.enabled,
    imageGeneration: !!config && !!config.enabled && !!config.imageGeneration,
    imageRecognition: !!config && !!config.enabled && !!config.imageRecognition,
    fileUpload: !!config && !!config.enabled && !!config.fileUpload,
});
exports.normalizeMultimodal = normalizeMultimodal;
const getDefaultSettings = () => ({
    configs: [defaultConfig],
    activeConfigId: defaultConfig.id,
    activeModel: defaultConfig.models[0],
});
exports.getDefaultSettings = getDefaultSettings;
const loadAISettings = () => {
    const raw = wx.getStorageSync(AI_SETTINGS_KEY);
    if (!raw) {
        const defaults = (0, exports.getDefaultSettings)();
        (0, exports.saveAISettings)(defaults);
        return defaults;
    }
    try {
        const parsed = raw;
        if (!parsed.configs || !parsed.configs.length) {
            throw new Error('empty settings');
        }
        const configs = parsed.configs.map((config) => ({
            ...config,
            models: config.models && config.models.length ? config.models : defaultConfig.models,
            multimodal: (0, exports.normalizeMultimodal)(config.multimodal),
        }));
        const active = configs.find((c) => c.id === parsed.activeConfigId) || configs[0];
        const activeModel = active.models.includes(parsed.activeModel) ? parsed.activeModel : (active.models[0] || defaultConfig.models[0]);
        return {
            configs,
            activeConfigId: active.id,
            activeModel,
        };
    }
    catch (_err) {
        const defaults = (0, exports.getDefaultSettings)();
        (0, exports.saveAISettings)(defaults);
        return defaults;
    }
};
exports.loadAISettings = loadAISettings;
const saveAISettings = (settings) => {
    wx.setStorageSync(AI_SETTINGS_KEY, settings);
};
exports.saveAISettings = saveAISettings;
const getActiveConfig = (settings) => {
    return settings.configs.find((c) => c.id === settings.activeConfigId) || settings.configs[0];
};
exports.getActiveConfig = getActiveConfig;
const createId = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
exports.createId = createId;
const createChatSession = (title = NEW_CHAT_TITLE) => {
    const now = Date.now();
    return {
        id: (0, exports.createId)('chat'),
        title,
        messages: [],
        createdAt: now,
        updatedAt: now,
    };
};
exports.createChatSession = createChatSession;
const loadChatSessions = () => {
    const sessions = wx.getStorageSync(CHAT_SESSIONS_KEY);
    if (Array.isArray(sessions) && sessions.length) {
        return sessions;
    }
    const session = (0, exports.createChatSession)();
    (0, exports.saveChatSessions)([session]);
    (0, exports.saveActiveSessionId)(session.id);
    return [session];
};
exports.loadChatSessions = loadChatSessions;
const saveChatSessions = (sessions) => {
    wx.setStorageSync(CHAT_SESSIONS_KEY, sessions);
};
exports.saveChatSessions = saveChatSessions;
const loadActiveSessionId = () => {
    return wx.getStorageSync(ACTIVE_SESSION_KEY);
};
exports.loadActiveSessionId = loadActiveSessionId;
const saveActiveSessionId = (sessionId) => {
    wx.setStorageSync(ACTIVE_SESSION_KEY, sessionId);
};
exports.saveActiveSessionId = saveActiveSessionId;
const buildSessionTitle = (content) => {
    const title = content.trim().replace(/\s+/g, ' ').slice(0, 16);
    return title || NEW_CHAT_TITLE;
};
exports.buildSessionTitle = buildSessionTitle;
const getTodayKey = () => {
    const date = new Date();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
};
exports.getTodayKey = getTodayKey;
const findModelPricing = (model) => {
    return exports.MODEL_PRICING.find((item) => item.model === model) || exports.MODEL_PRICING.find((item) => model.indexOf(item.model) >= 0);
};
exports.findModelPricing = findModelPricing;
const estimateTokens = (text) => {
    const chinese = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const other = Math.max(text.length - chinese, 0);
    return Math.max(1, Math.ceil(chinese + other / 4));
};
exports.estimateTokens = estimateTokens;
const calcCostCny = (model, inputTokens, outputTokens) => {
    const pricing = (0, exports.findModelPricing)(model);
    if (!pricing)
        return 0;
    const inputCost = (inputTokens / 1000000) * pricing.inputPerMillionCny;
    const outputCost = (outputTokens / 1000000) * pricing.outputPerMillionCny;
    return Number((inputCost + outputCost).toFixed(6));
};
exports.calcCostCny = calcCostCny;
const loadUsageRecords = () => {
    const records = wx.getStorageSync(MODEL_USAGE_KEY);
    return Array.isArray(records) ? records : [];
};
exports.loadUsageRecords = loadUsageRecords;
const saveUsageRecords = (records) => {
    wx.setStorageSync(MODEL_USAGE_KEY, records);
};
exports.saveUsageRecords = saveUsageRecords;
const addUsageRecord = (model, inputTokens, outputTokens) => {
    const date = (0, exports.getTodayKey)();
    const costCny = (0, exports.calcCostCny)(model, inputTokens, outputTokens);
    const records = (0, exports.loadUsageRecords)();
    const index = records.findIndex((item) => item.date === date && item.model === model);
    if (index >= 0) {
        const current = records[index];
        records[index] = {
            ...current,
            inputTokens: current.inputTokens + inputTokens,
            outputTokens: current.outputTokens + outputTokens,
            costCny: Number((current.costCny + costCny).toFixed(6)),
            requests: current.requests + 1,
        };
    }
    else {
        records.push({
            date,
            model,
            inputTokens,
            outputTokens,
            costCny,
            requests: 1,
        });
    }
    (0, exports.saveUsageRecords)(records);
};
exports.addUsageRecord = addUsageRecord;
const loadImageGenerationRecords = () => {
    const records = wx.getStorageSync(IMAGE_HISTORY_KEY);
    return Array.isArray(records) ? records : [];
};
exports.loadImageGenerationRecords = loadImageGenerationRecords;
const saveImageGenerationRecords = (records) => {
    wx.setStorageSync(IMAGE_HISTORY_KEY, records);
};
exports.saveImageGenerationRecords = saveImageGenerationRecords;
const addImageGenerationRecord = (record) => {
    const records = (0, exports.loadImageGenerationRecords)();
    (0, exports.saveImageGenerationRecords)([record].concat(records).slice(0, 80));
};
exports.addImageGenerationRecord = addImageGenerationRecord;
const deleteImageGenerationRecord = (id) => {
    (0, exports.saveImageGenerationRecords)((0, exports.loadImageGenerationRecords)().filter((record) => record.id !== id));
};
exports.deleteImageGenerationRecord = deleteImageGenerationRecord;
const clearImageGenerationRecords = () => {
    (0, exports.saveImageGenerationRecords)([]);
};
exports.clearImageGenerationRecords = clearImageGenerationRecords;
const getTodayUsage = (model) => {
    const date = (0, exports.getTodayKey)();
    return (0, exports.loadUsageRecords)().find((item) => item.date === date && item.model === model) || {
        date,
        model,
        inputTokens: 0,
        outputTokens: 0,
        costCny: 0,
        requests: 0,
    };
};
exports.getTodayUsage = getTodayUsage;
