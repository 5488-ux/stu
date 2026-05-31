"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ai_1 = require("../../utils/ai");
const API_SETUP_SKIPPED_KEY = 'api_setup_skipped_v1';
const getModelLabel = (value) => {
    const option = ai_1.MODEL_OPTIONS.find((item) => item.value === value);
    return option ? option.label : value;
};
if (typeof Page === 'function') {
    Page({
        data: {
            settings: (0, ai_1.loadAISettings)(),
            configs: [],
            configNames: [],
            activeConfigIndex: 0,
            activeModels: [],
            activeModelIndex: 0,
            modelLabels: ai_1.MODEL_LABELS,
            draftName: 'DeepSeek',
            draftBaseUrl: 'https://api.deepseek.com',
            draftApiKey: '',
            draftModelIndex: 0,
            draftCustomModel: '',
            isFirstSetup: false,
            draftMultimodalEnabled: false,
            draftImageGeneration: false,
            draftImageRecognition: false,
            draftFileUpload: false,
        },
        onLoad(query) {
            this.setData({ isFirstSetup: query.first === '1' });
        },
        onShow() {
            this.reload();
        },
        reload() {
            const settings = (0, ai_1.loadAISettings)();
            const activeConfig = (0, ai_1.getActiveConfig)(settings);
            const activeConfigIndex = settings.configs.findIndex((c) => c.id === activeConfig.id);
            const activeModels = activeConfig.models && activeConfig.models.length ? activeConfig.models : ai_1.MODEL_VALUES;
            const activeModelIndex = Math.max(activeModels.findIndex((m) => m === settings.activeModel), 0);
            const configs = settings.configs.map((config) => {
                const models = config.models && config.models.length ? config.models : ai_1.MODEL_VALUES;
                const multimodal = (0, ai_1.normalizeMultimodal)(config.multimodal);
                const abilities = [
                    multimodal.imageGeneration ? '生成图' : '',
                    multimodal.imageRecognition ? '识别图' : '',
                    multimodal.fileUpload ? '上传文件' : '',
                ].filter(Boolean);
                const abilityTags = [
                    '文本',
                    multimodal.imageGeneration ? '生图' : '',
                    multimodal.imageRecognition ? '识图' : '',
                    multimodal.fileUpload ? '文件' : '',
                ].filter(Boolean);
                return {
                    ...config,
                    models,
                    multimodalText: abilities.length ? abilities.join(' / ') : '未开启多模态',
                    abilityTags,
                    modelViews: models.map((model) => ({
                        value: model,
                        label: getModelLabel(model),
                    })),
                };
            });
            this.setData({
                settings,
                configs,
                configNames: configs.map((c) => c.name),
                activeConfigIndex,
                activeModels,
                activeModelIndex,
                modelLabels: ai_1.MODEL_LABELS,
            });
        },
        onSwitchConfig(e) {
            const index = Number(e.detail.value);
            const settings = (0, ai_1.loadAISettings)();
            const picked = settings.configs[index];
            if (!picked)
                return;
            const models = picked.models && picked.models.length ? picked.models : ai_1.MODEL_VALUES;
            settings.activeConfigId = picked.id;
            settings.activeModel = models[0] || ai_1.MODEL_VALUES[0];
            (0, ai_1.saveAISettings)(settings);
            this.reload();
        },
        onSwitchModel(e) {
            const index = Number(e.detail.value);
            const settings = (0, ai_1.loadAISettings)();
            const active = (0, ai_1.getActiveConfig)(settings);
            const models = active.models && active.models.length ? active.models : ai_1.MODEL_VALUES;
            const model = models[index];
            if (!model)
                return;
            settings.activeModel = model;
            (0, ai_1.saveAISettings)(settings);
            this.reload();
        },
        onNameInput(e) {
            this.setData({ draftName: e.detail.value });
        },
        onBaseUrlInput(e) {
            this.setData({ draftBaseUrl: e.detail.value });
        },
        onApiKeyInput(e) {
            this.setData({ draftApiKey: e.detail.value.trim() });
        },
        onDraftModelChange(e) {
            this.setData({ draftModelIndex: Number(e.detail.value) });
        },
        onCustomModelInput(e) {
            this.setData({ draftCustomModel: e.detail.value.trim() });
        },
        onMultimodalChange(e) {
            const enabled = e.detail.value;
            this.setData({
                draftMultimodalEnabled: enabled,
                draftImageGeneration: enabled ? this.data.draftImageGeneration : false,
                draftImageRecognition: enabled ? this.data.draftImageRecognition : false,
                draftFileUpload: enabled ? this.data.draftFileUpload : false,
            });
        },
        onImageGenerationChange(e) {
            this.setData({ draftImageGeneration: e.detail.value });
        },
        onImageRecognitionChange(e) {
            this.setData({ draftImageRecognition: e.detail.value });
        },
        onFileUploadChange(e) {
            this.setData({ draftFileUpload: e.detail.value });
        },
        skipFirstSetup() {
            wx.setStorageSync(API_SETUP_SKIPPED_KEY, {
                skipped: true,
                skippedAt: Date.now(),
            });
            wx.redirectTo({ url: '/pages/index/index' });
        },
        onModelMore(e) {
            const model = e.currentTarget.dataset.model;
            if (!model)
                return;
            wx.navigateTo({ url: `/pages/usage/usage?model=${model}` });
        },
        onAddConfig() {
            const name = this.data.draftName.trim();
            const baseUrl = this.data.draftBaseUrl.trim() || 'https://api.deepseek.com';
            const apiKey = this.data.draftApiKey.trim();
            const customModel = this.data.draftCustomModel.trim();
            const activeModel = customModel || ai_1.MODEL_VALUES[this.data.draftModelIndex] || ai_1.MODEL_VALUES[0];
            const models = [activeModel];
            const multimodal = (0, ai_1.normalizeMultimodal)({
                enabled: this.data.draftMultimodalEnabled,
                imageGeneration: this.data.draftImageGeneration,
                imageRecognition: this.data.draftImageRecognition,
                fileUpload: this.data.draftFileUpload,
            });
            if (!name || !apiKey || !activeModel) {
                wx.showToast({ title: 'Missing info', icon: 'none' });
                return;
            }
            const settings = (0, ai_1.loadAISettings)();
            settings.configs.push({ id: (0, ai_1.createId)('cfg'), name, baseUrl, apiKey, models, multimodal });
            settings.activeConfigId = settings.configs[settings.configs.length - 1].id;
            settings.activeModel = activeModel;
            (0, ai_1.saveAISettings)(settings);
            wx.removeStorageSync(API_SETUP_SKIPPED_KEY);
            this.setData({
                draftApiKey: '',
                draftCustomModel: '',
                draftMultimodalEnabled: false,
                draftImageGeneration: false,
                draftImageRecognition: false,
                draftFileUpload: false,
            });
            wx.showToast({ title: 'Added', icon: 'success' });
            this.reload();
            if (this.data.isFirstSetup) {
                wx.redirectTo({ url: '/pages/index/index' });
            }
        },
        onDeleteConfig(e) {
            const id = e.currentTarget.dataset.id;
            const settings = (0, ai_1.loadAISettings)();
            if (settings.configs.length <= 1) {
                wx.showToast({ title: 'Keep one config', icon: 'none' });
                return;
            }
            settings.configs = settings.configs.filter((cfg) => cfg.id !== id);
            if (!settings.configs.find((c) => c.id === settings.activeConfigId)) {
                settings.activeConfigId = settings.configs[0].id;
                settings.activeModel = settings.configs[0].models[0] || ai_1.MODEL_VALUES[0];
            }
            (0, ai_1.saveAISettings)(settings);
            wx.showToast({ title: 'Deleted', icon: 'success' });
            this.reload();
        },
    });
}
