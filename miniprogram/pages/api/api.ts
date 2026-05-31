import {
  AISettings,
  MODEL_LABELS,
  MODEL_OPTIONS,
  MODEL_VALUES,
  createId,
  getActiveConfig,
  loadAISettings,
  normalizeMultimodal,
  saveAISettings,
} from '../../utils/ai'

const API_SETUP_SKIPPED_KEY = 'api_setup_skipped_v1'

interface ModelView {
  label: string
  value: string
}

interface ConfigView {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  models: string[]
  modelViews: ModelView[]
  multimodalText: string
  abilityTags: string[]
}

interface SettingsData {
  settings: AISettings
  configs: ConfigView[]
  configNames: string[]
  activeConfigIndex: number
  activeModels: string[]
  activeModelIndex: number
  modelLabels: string[]
  draftName: string
  draftBaseUrl: string
  draftApiKey: string
  draftModelIndex: number
  draftCustomModel: string
  isFirstSetup: boolean
  draftMultimodalEnabled: boolean
  draftImageGeneration: boolean
  draftImageRecognition: boolean
  draftFileUpload: boolean
}

const getModelLabel = (value: string) => {
  const option = MODEL_OPTIONS.find((item) => item.value === value)
  return option ? option.label : value
}

if (typeof Page === 'function') {
Page({
  data: {
    settings: loadAISettings(),
    configs: [],
    configNames: [],
    activeConfigIndex: 0,
    activeModels: [],
    activeModelIndex: 0,
    modelLabels: MODEL_LABELS,
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
  } as SettingsData,

  onLoad(query: { first?: string }) {
    this.setData({ isFirstSetup: query.first === '1' })
  },

  onShow() {
    this.reload()
  },

  reload() {
    const settings = loadAISettings()
    const activeConfig = getActiveConfig(settings)
    const activeConfigIndex = settings.configs.findIndex((c) => c.id === activeConfig.id)
    const activeModels = activeConfig.models && activeConfig.models.length ? activeConfig.models : MODEL_VALUES
    const activeModelIndex = Math.max(activeModels.findIndex((m) => m === settings.activeModel), 0)
    const configs = settings.configs.map((config) => {
      const models = config.models && config.models.length ? config.models : MODEL_VALUES
      const multimodal = normalizeMultimodal(config.multimodal)
      const abilities = [
        multimodal.imageGeneration ? '生成图' : '',
        multimodal.imageRecognition ? '识别图' : '',
        multimodal.fileUpload ? '上传文件' : '',
      ].filter(Boolean)
      const abilityTags = [
        '文本',
        multimodal.imageGeneration ? '生图' : '',
        multimodal.imageRecognition ? '识图' : '',
        multimodal.fileUpload ? '文件' : '',
      ].filter(Boolean)
      return {
        ...config,
        models,
        multimodalText: abilities.length ? abilities.join(' / ') : '未开启多模态',
        abilityTags,
        modelViews: models.map((model) => ({
          value: model,
          label: getModelLabel(model),
        })),
      }
    })

    this.setData({
      settings,
      configs,
      configNames: configs.map((c) => c.name),
      activeConfigIndex,
      activeModels,
      activeModelIndex,
      modelLabels: MODEL_LABELS,
    })
  },

  onSwitchConfig(e: WechatMiniprogram.CustomEvent<{ value: string }>) {
    const index = Number(e.detail.value)
    const settings = loadAISettings()
    const picked = settings.configs[index]
    if (!picked) return

    const models = picked.models && picked.models.length ? picked.models : MODEL_VALUES
    settings.activeConfigId = picked.id
    settings.activeModel = models[0] || MODEL_VALUES[0]
    saveAISettings(settings)
    this.reload()
  },

  onSwitchModel(e: WechatMiniprogram.CustomEvent<{ value: string }>) {
    const index = Number(e.detail.value)
    const settings = loadAISettings()
    const active = getActiveConfig(settings)
    const models = active.models && active.models.length ? active.models : MODEL_VALUES
    const model = models[index]
    if (!model) return

    settings.activeModel = model
    saveAISettings(settings)
    this.reload()
  },

  onNameInput(e: WechatMiniprogram.CustomEvent<{ value: string }>) {
    this.setData({ draftName: e.detail.value })
  },

  onBaseUrlInput(e: WechatMiniprogram.CustomEvent<{ value: string }>) {
    this.setData({ draftBaseUrl: e.detail.value })
  },

  onApiKeyInput(e: WechatMiniprogram.CustomEvent<{ value: string }>) {
    this.setData({ draftApiKey: e.detail.value.trim() })
  },

  onDraftModelChange(e: WechatMiniprogram.CustomEvent<{ value: string }>) {
    this.setData({ draftModelIndex: Number(e.detail.value) })
  },

  onCustomModelInput(e: WechatMiniprogram.CustomEvent<{ value: string }>) {
    this.setData({ draftCustomModel: e.detail.value.trim() })
  },

  onMultimodalChange(e: WechatMiniprogram.CustomEvent<{ value: boolean }>) {
    const enabled = e.detail.value
    this.setData({
      draftMultimodalEnabled: enabled,
      draftImageGeneration: enabled ? this.data.draftImageGeneration : false,
      draftImageRecognition: enabled ? this.data.draftImageRecognition : false,
      draftFileUpload: enabled ? this.data.draftFileUpload : false,
    })
  },

  onImageGenerationChange(e: WechatMiniprogram.CustomEvent<{ value: boolean }>) {
    this.setData({ draftImageGeneration: e.detail.value })
  },

  onImageRecognitionChange(e: WechatMiniprogram.CustomEvent<{ value: boolean }>) {
    this.setData({ draftImageRecognition: e.detail.value })
  },

  onFileUploadChange(e: WechatMiniprogram.CustomEvent<{ value: boolean }>) {
    this.setData({ draftFileUpload: e.detail.value })
  },

  skipFirstSetup() {
    wx.setStorageSync(API_SETUP_SKIPPED_KEY, {
      skipped: true,
      skippedAt: Date.now(),
    })
    wx.redirectTo({ url: '/pages/index/index' })
  },

  onModelMore(e: WechatMiniprogram.CustomEvent<{ model: string }>) {
    const model = e.currentTarget.dataset.model as string
    if (!model) return

    wx.navigateTo({ url: `/pages/usage/usage?model=${model}` })
  },

  onAddConfig() {
    const name = this.data.draftName.trim()
    const baseUrl = this.data.draftBaseUrl.trim() || 'https://api.deepseek.com'
    const apiKey = this.data.draftApiKey.trim()
    const customModel = this.data.draftCustomModel.trim()
    const activeModel = customModel || MODEL_VALUES[this.data.draftModelIndex] || MODEL_VALUES[0]
    const models = [activeModel]
    const multimodal = normalizeMultimodal({
      enabled: this.data.draftMultimodalEnabled,
      imageGeneration: this.data.draftImageGeneration,
      imageRecognition: this.data.draftImageRecognition,
      fileUpload: this.data.draftFileUpload,
    })

    if (!name || !apiKey || !activeModel) {
      wx.showToast({ title: 'Missing info', icon: 'none' })
      return
    }

    const settings = loadAISettings()
    settings.configs.push({ id: createId('cfg'), name, baseUrl, apiKey, models, multimodal })
    settings.activeConfigId = settings.configs[settings.configs.length - 1].id
    settings.activeModel = activeModel
    saveAISettings(settings)
    wx.removeStorageSync(API_SETUP_SKIPPED_KEY)

    this.setData({
      draftApiKey: '',
      draftCustomModel: '',
      draftMultimodalEnabled: false,
      draftImageGeneration: false,
      draftImageRecognition: false,
      draftFileUpload: false,
    })
    wx.showToast({ title: 'Added', icon: 'success' })
    this.reload()
    if (this.data.isFirstSetup) {
      wx.redirectTo({ url: '/pages/index/index' })
    }
  },

  onDeleteConfig(e: WechatMiniprogram.CustomEvent<{ id: string }>) {
    const id = e.currentTarget.dataset.id as string
    const settings = loadAISettings()
    if (settings.configs.length <= 1) {
      wx.showToast({ title: 'Keep one config', icon: 'none' })
      return
    }

    settings.configs = settings.configs.filter((cfg) => cfg.id !== id)
    if (!settings.configs.find((c) => c.id === settings.activeConfigId)) {
      settings.activeConfigId = settings.configs[0].id
      settings.activeModel = settings.configs[0].models[0] || MODEL_VALUES[0]
    }

    saveAISettings(settings)
    wx.showToast({ title: 'Deleted', icon: 'success' })
    this.reload()
  },
})
}
