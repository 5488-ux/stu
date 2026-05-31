export type ChatRole = 'system' | 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  pending?: boolean
}

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

export interface ModelOption {
  label: string
  value: string
}

export interface ModelPricing {
  provider: string
  model: string
  label: string
  inputPerMillionCny: number
  outputPerMillionCny: number
  note: string
}

export interface UsageRecord {
  date: string
  model: string
  inputTokens: number
  outputTokens: number
  costCny: number
  requests: number
}

export interface ImageGenerationRecord {
  id: string
  prompt: string
  model: string
  size: string
  imageUrl: string
  createdAt: number
}

export interface MultimodalConfig {
  enabled: boolean
  imageGeneration: boolean
  imageRecognition: boolean
  fileUpload: boolean
}

export interface ApiConfig {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  models: string[]
  multimodal?: MultimodalConfig
}

export interface AISettings {
  configs: ApiConfig[]
  activeConfigId: string
  activeModel: string
}

const AI_SETTINGS_KEY = 'ai_settings_v1'
const CHAT_SESSIONS_KEY = 'chat_sessions_v1'
const ACTIVE_SESSION_KEY = 'active_chat_session_v1'
const MODEL_USAGE_KEY = 'model_usage_v1'
const IMAGE_HISTORY_KEY = 'image_generation_history_v1'
const USD_TO_CNY = 7.25
const NEW_CHAT_TITLE = '\u65b0\u5bf9\u8bdd'

const usd = (value: number) => Number((value * USD_TO_CNY).toFixed(4))

export const MODEL_PRICING: ModelPricing[] = [
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
]

export const MODEL_OPTIONS: ModelOption[] = MODEL_PRICING.map((item) => ({
  label: item.label,
  value: item.model,
}))

export const MODEL_VALUES = MODEL_OPTIONS.map((model) => model.value)
export const MODEL_LABELS = MODEL_OPTIONS.map((model) => model.label)

const defaultConfig: ApiConfig = {
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
}

export const normalizeMultimodal = (config?: Partial<MultimodalConfig>): MultimodalConfig => ({
  enabled: !!config && !!config.enabled,
  imageGeneration: !!config && !!config.enabled && !!config.imageGeneration,
  imageRecognition: !!config && !!config.enabled && !!config.imageRecognition,
  fileUpload: !!config && !!config.enabled && !!config.fileUpload,
})

export const getDefaultSettings = (): AISettings => ({
  configs: [defaultConfig],
  activeConfigId: defaultConfig.id,
  activeModel: defaultConfig.models[0],
})

export const loadAISettings = (): AISettings => {
  const raw = wx.getStorageSync(AI_SETTINGS_KEY)
  if (!raw) {
    const defaults = getDefaultSettings()
    saveAISettings(defaults)
    return defaults
  }

  try {
    const parsed = raw as AISettings
    if (!parsed.configs || !parsed.configs.length) {
      throw new Error('empty settings')
    }

    const configs = parsed.configs.map((config) => ({
      ...config,
      models: config.models && config.models.length ? config.models : defaultConfig.models,
      multimodal: normalizeMultimodal(config.multimodal),
    }))
    const active = configs.find((c) => c.id === parsed.activeConfigId) || configs[0]
    const activeModel = active.models.includes(parsed.activeModel) ? parsed.activeModel : (active.models[0] || defaultConfig.models[0])

    return {
      configs,
      activeConfigId: active.id,
      activeModel,
    }
  } catch (_err) {
    const defaults = getDefaultSettings()
    saveAISettings(defaults)
    return defaults
  }
}

export const saveAISettings = (settings: AISettings) => {
  wx.setStorageSync(AI_SETTINGS_KEY, settings)
}

export const getActiveConfig = (settings: AISettings): ApiConfig => {
  return settings.configs.find((c) => c.id === settings.activeConfigId) || settings.configs[0]
}

export const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`

export const createChatSession = (title = NEW_CHAT_TITLE): ChatSession => {
  const now = Date.now()
  return {
    id: createId('chat'),
    title,
    messages: [],
    createdAt: now,
    updatedAt: now,
  }
}

export const loadChatSessions = (): ChatSession[] => {
  const sessions = wx.getStorageSync(CHAT_SESSIONS_KEY) as ChatSession[] | ''
  if (Array.isArray(sessions) && sessions.length) {
    return sessions
  }

  const session = createChatSession()
  saveChatSessions([session])
  saveActiveSessionId(session.id)
  return [session]
}

export const saveChatSessions = (sessions: ChatSession[]) => {
  wx.setStorageSync(CHAT_SESSIONS_KEY, sessions)
}

export const loadActiveSessionId = () => {
  return wx.getStorageSync(ACTIVE_SESSION_KEY) as string
}

export const saveActiveSessionId = (sessionId: string) => {
  wx.setStorageSync(ACTIVE_SESSION_KEY, sessionId)
}

export const buildSessionTitle = (content: string) => {
  const title = content.trim().replace(/\s+/g, ' ').slice(0, 16)
  return title || NEW_CHAT_TITLE
}

export const getTodayKey = () => {
  const date = new Date()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export const findModelPricing = (model: string) => {
  return MODEL_PRICING.find((item) => item.model === model) || MODEL_PRICING.find((item) => model.indexOf(item.model) >= 0)
}

export const estimateTokens = (text: string) => {
  const chinese = (text.match(/[\u4e00-\u9fff]/g) || []).length
  const other = Math.max(text.length - chinese, 0)
  return Math.max(1, Math.ceil(chinese + other / 4))
}

export const calcCostCny = (model: string, inputTokens: number, outputTokens: number) => {
  const pricing = findModelPricing(model)
  if (!pricing) return 0
  const inputCost = (inputTokens / 1000000) * pricing.inputPerMillionCny
  const outputCost = (outputTokens / 1000000) * pricing.outputPerMillionCny
  return Number((inputCost + outputCost).toFixed(6))
}

export const loadUsageRecords = (): UsageRecord[] => {
  const records = wx.getStorageSync(MODEL_USAGE_KEY) as UsageRecord[] | ''
  return Array.isArray(records) ? records : []
}

export const saveUsageRecords = (records: UsageRecord[]) => {
  wx.setStorageSync(MODEL_USAGE_KEY, records)
}

export const addUsageRecord = (model: string, inputTokens: number, outputTokens: number) => {
  const date = getTodayKey()
  const costCny = calcCostCny(model, inputTokens, outputTokens)
  const records = loadUsageRecords()
  const index = records.findIndex((item) => item.date === date && item.model === model)

  if (index >= 0) {
    const current = records[index]
    records[index] = {
      ...current,
      inputTokens: current.inputTokens + inputTokens,
      outputTokens: current.outputTokens + outputTokens,
      costCny: Number((current.costCny + costCny).toFixed(6)),
      requests: current.requests + 1,
    }
  } else {
    records.push({
      date,
      model,
      inputTokens,
      outputTokens,
      costCny,
      requests: 1,
    })
  }

  saveUsageRecords(records)
}

export const loadImageGenerationRecords = (): ImageGenerationRecord[] => {
  const records = wx.getStorageSync(IMAGE_HISTORY_KEY) as ImageGenerationRecord[] | ''
  return Array.isArray(records) ? records : []
}

export const saveImageGenerationRecords = (records: ImageGenerationRecord[]) => {
  wx.setStorageSync(IMAGE_HISTORY_KEY, records)
}

export const addImageGenerationRecord = (record: ImageGenerationRecord) => {
  const records = loadImageGenerationRecords()
  saveImageGenerationRecords([record].concat(records).slice(0, 80))
}

export const deleteImageGenerationRecord = (id: string) => {
  saveImageGenerationRecords(loadImageGenerationRecords().filter((record) => record.id !== id))
}

export const clearImageGenerationRecords = () => {
  saveImageGenerationRecords([])
}

export const getTodayUsage = (model: string) => {
  const date = getTodayKey()
  return loadUsageRecords().find((item) => item.date === date && item.model === model) || {
    date,
    model,
    inputTokens: 0,
    outputTokens: 0,
    costCny: 0,
    requests: 0,
  }
}
