import {
  AISettings,
  ChatMessage,
  ChatSession,
  addImageGenerationRecord,
  addUsageRecord,
  buildSessionTitle,
  createChatSession,
  createId,
  estimateTokens,
  getActiveConfig,
  loadAISettings,
  loadActiveSessionId,
  loadChatSessions,
  normalizeMultimodal,
  saveAISettings,
  saveActiveSessionId,
  saveChatSessions,
} from '../../utils/ai'

interface ChatData {
  settings: AISettings
  activeName: string
  activeModel: string
  activeModels: string[]
  activeModelIndex: number
  activeMultimodal: {
    enabled: boolean
    imageGeneration: boolean
    imageRecognition: boolean
    fileUpload: boolean
  }
  inputText: string
  isStreaming: boolean
  messages: DisplayChatMessage[]
  scrollToId: string
  scrollTop: number
  showBottomJump: boolean
  searchText: string
  searchMatchCount: number
  webSearchEnabled: boolean
  learningEnabled: boolean
  learningGrade: number
  learningMode: boolean
  imageGenerationMode: boolean
  imageSizeOptions: string[]
  imageSizeValues: string[]
  imageSizeIndex: number
  visionTemplates: string[]
  pendingAttachments: PendingAttachment[]
  sessions: ChatSession[]
  sessionNames: string[]
  activeSessionId: string
  activeSessionIndex: number
}

interface DisplayChatMessage extends ChatMessage {
  segments: MessageSegment[]
}

interface MessageSegment {
  id: string
  type: 'html' | 'code'
  html?: string
  code?: string
  language?: string
  canPreview?: boolean
}

interface PendingAttachment {
  id: string
  kind: 'image' | 'file'
  name: string
  path: string
  mimeType: string
  base64?: string
  text?: string
}

let utf8Remainder = ''
const LEGAL_ACCEPTED_KEY = 'legal_accepted_v1'
const API_SETUP_SKIPPED_KEY = 'api_setup_skipped_v1'
const LEARNING_GRADE_KEY = 'learning_grade_v1'
const LEARNING_API_BASE = 'https://seek.789113.cn'
const IMAGE_SIZE_LABELS = ['方图 1:1', '横图 16:9', '竖图 9:16']
const IMAGE_SIZE_VALUES = ['1024x1024', '1536x1024', '1024x1536']
const VISION_TEMPLATES = ['提取文字', '分析图片', '翻译图片内容', '生成同款文案']

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const renderInlineMarkdown = (text: string) => {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code style="background:#eef3ff;border-radius:4px;padding:1px 4px;">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const highlightSearch = (html: string, searchText: string) => {
  const query = searchText.trim()
  if (!query) return html

  return html.replace(new RegExp(escapeRegExp(escapeHtml(query)), 'gi'), (match) => (
    `<span style="background:#fff2a8;border-radius:3px;padding:0 2px;">${match}</span>`
  ))
}

const isTableRow = (line: string) => line.includes('|') && line.replace(/\|/g, '').trim().length > 0

const isTableSeparator = (line: string) => {
  const cells = splitTableRow(line)
  return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()))
}

const splitTableRow = (line: string) => {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return trimmed.split('|').map((cell) => cell.trim())
}

const renderTable = (rows: string[][], searchText: string) => {
  if (!rows.length) return ''

  const width = Math.max(22, Math.floor(100 / Math.max(rows[0].length, 1)))
  return [
    '<div style="margin:8px 0;border:1px solid #dfe7f5;border-radius:6px;overflow:hidden;">',
    ...rows.map((row, rowIndex) => {
      const bg = rowIndex === 0 ? '#f2f6ff' : '#ffffff'
      const weight = rowIndex === 0 ? '700' : '400'
      const cells = row.map((cell) =>
        `<span style="display:inline-block;vertical-align:top;width:${width}%;min-height:26px;padding:6px;border-right:1px solid #dfe7f5;box-sizing:border-box;font-weight:${weight};word-break:break-all;">${highlightSearch(renderInlineMarkdown(cell), searchText)}</span>`
      )
      return `<div style="border-bottom:1px solid #dfe7f5;background:${bg};white-space:normal;">${cells.join('')}</div>`
    }),
    '</div>',
  ].join('')
}

const isHtmlCode = (language: string, code: string) => {
  const lang = language.toLowerCase()
  return lang === 'html' || lang === 'htm' || /<\s*html[\s>]|<\s*body[\s>]|<\s*div[\s>]/i.test(code)
}

const renderMarkdownSegments = (content: string, pending?: boolean, searchText = ''): MessageSegment[] => {
  if (!content) {
    return [{ id: 'pending', type: 'html', html: pending ? '思考中...' : '' }]
  }

  let inCode = false
  let codeLanguage = ''
  const codeLines: string[] = []
  const html: string[] = []
  const segments: MessageSegment[] = []
  const lines = content.split('\n')

  const flushHtml = () => {
    if (!html.length) return
    segments.push({ id: `html-${segments.length}`, type: 'html', html: html.join('') })
    html.length = 0
  }

  const flushCode = () => {
    if (!codeLines.length) return
    const code = codeLines.join('\n')
    flushHtml()
    segments.push({
      id: `code-${segments.length}`,
      type: 'code',
      code,
      language: codeLanguage || 'code',
      canPreview: isHtmlCode(codeLanguage, code),
    })
    codeLines.length = 0
    codeLanguage = ''
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (line.trim().startsWith('```')) {
      if (inCode) flushCode()
      codeLanguage = line.trim().replace(/^```/, '').trim()
      inCode = !inCode
      continue
    }

    if (inCode) {
      codeLines.push(line)
      continue
    }

    if (isTableRow(line) && index + 1 < lines.length && isTableSeparator(lines[index + 1])) {
      const tableRows = [splitTableRow(line)]
      index += 2
      while (index < lines.length && isTableRow(lines[index])) {
        tableRows.push(splitTableRow(lines[index]))
        index += 1
      }
      index -= 1
      html.push(renderTable(tableRows, searchText))
      continue
    }

    const image = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
    if (image) {
      const src = escapeHtml(image[2])
      html.push(`<img src="${src}" style="max-width:100%;border-radius:8px;margin:6px 0;" />`)
      continue
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/)
    if (heading) {
      const size = heading[1].length === 1 ? 34 : heading[1].length === 2 ? 31 : 28
      html.push(`<div style="margin:10px 0 6px;font-size:${size}rpx;font-weight:700;">${highlightSearch(renderInlineMarkdown(heading[2]), searchText)}</div>`)
      continue
    }

    const bullet = line.match(/^\s*[-*]\s+(.+)$/)
    if (bullet) {
      html.push(`<div style="margin:4px 0;">• ${highlightSearch(renderInlineMarkdown(bullet[1]), searchText)}</div>`)
      continue
    }

    const numbered = line.match(/^\s*(\d+)\.\s+(.+)$/)
    if (numbered) {
      html.push(`<div style="margin:4px 0;">${numbered[1]}. ${highlightSearch(renderInlineMarkdown(numbered[2]), searchText)}</div>`)
      continue
    }

    if (!line.trim()) {
      html.push('<br/>')
      continue
    }

    html.push(`<div style="margin:4px 0;">${highlightSearch(renderInlineMarkdown(line), searchText)}</div>`)
  }

  flushCode()
  flushHtml()
  return segments
}

const countSearchMatches = (messages: ChatMessage[], searchText: string) => {
  const query = searchText.trim().toLowerCase()
  if (!query) return 0

  return messages.reduce((total, message) => {
    let count = 0
    let index = message.content.toLowerCase().indexOf(query)
    while (index >= 0) {
      count += 1
      index = message.content.toLowerCase().indexOf(query, index + query.length)
    }
    return total + count
  }, 0)
}

const renderMessages = (messages: ChatMessage[], searchText = ''): DisplayChatMessage[] =>
  messages.map((message) => ({
    ...message,
    segments: renderMarkdownSegments(message.content, message.pending, searchText),
  }))

const toStoredMessages = (messages: ChatMessage[]): ChatMessage[] =>
  messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    pending: message.pending,
  }))

const decodeChunk = (arrayBuffer: ArrayBuffer) => {
  const bytes = new Uint8Array(arrayBuffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }

  try {
    return decodeURIComponent(escape(binary))
  } catch (_err) {
    return binary
  }
}

const getFileName = (path: string, fallback: string) => {
  const parts = path.split(/[\\/]/)
  return parts[parts.length - 1] || fallback
}

const guessMimeType = (name: string, kind: 'image' | 'file') => {
  const lower = name.toLowerCase()
  if (kind === 'image') {
    if (lower.endsWith('.png')) return 'image/png'
    if (lower.endsWith('.webp')) return 'image/webp'
    return 'image/jpeg'
  }

  if (lower.endsWith('.json')) return 'application/json'
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'text/html'
  if (lower.endsWith('.css')) return 'text/css'
  if (lower.endsWith('.js') || lower.endsWith('.ts')) return 'text/javascript'
  if (lower.endsWith('.csv')) return 'text/csv'
  if (lower.endsWith('.md') || lower.endsWith('.txt')) return 'text/plain'
  return 'application/octet-stream'
}

const isTextLikeFile = (name: string, mimeType: string) => {
  const lower = name.toLowerCase()
  return mimeType.startsWith('text/') || /\.(txt|md|json|csv|html|htm|css|js|ts|xml|log)$/i.test(lower)
}

const buildLearningPrompt = (grade: number, materials: Array<{ grade: number; title: string; content_md: string }>) => {
  const textbook = materials.map((item) => `【${item.grade}年级】${item.title}\n${item.content_md}`).join('\n\n---\n\n')
  return [
    `你现在是小学${grade}年级数学老师。`,
    '当前只能回答数学题；如果用户问的不是数学题，请温和提醒“学习模式目前只能问数学题”。',
    '必须严格依据下面教材内容讲解，只能使用一到当前年级已经提供的教材知识。',
    '如果教材没有相关知识点，直接说明“这个知识点教材里还没有提供，不能超纲讲”。',
    '讲解要有趣、像老师带着学生一步一步想，不要直接堆答案。',
    '不要使用超出教材范围的方法、公式或术语。',
    `可用教材如下：\n${textbook || '暂无教材内容'}`,
  ].join('\n')
}

if (typeof Page === 'function') {
Page({
  data: {
    settings: loadAISettings(),
    activeName: 'DeepSeek',
    activeModel: 'deepseek-chat',
    activeModels: [],
    activeModelIndex: 0,
    activeMultimodal: {
      enabled: false,
      imageGeneration: false,
      imageRecognition: false,
      fileUpload: false,
    },
    inputText: '',
    isStreaming: false,
    messages: [],
    scrollToId: '',
    scrollTop: 0,
    showBottomJump: false,
    searchText: '',
    searchMatchCount: 0,
    webSearchEnabled: false,
    learningEnabled: false,
    learningGrade: 0,
    learningMode: false,
    imageGenerationMode: false,
    imageSizeOptions: IMAGE_SIZE_LABELS,
    imageSizeValues: IMAGE_SIZE_VALUES,
    imageSizeIndex: 0,
    visionTemplates: VISION_TEMPLATES,
    pendingAttachments: [],
    sessions: [],
    sessionNames: [],
    activeSessionId: '',
    activeSessionIndex: 0,
  } as ChatData,

  charQueue: [] as string[],
  queueTimer: 0 as number,
  streamEnded: false as boolean,
  lastScrollAt: 0 as number,
  requestInputText: '' as string,
  requestModel: '' as string,
  requestAttachments: [] as PendingAttachment[],
  learningSystemPrompt: '' as string,
  usageRecorded: false as boolean,

  onLoad() {
    if (!this.ensureLegalAccepted()) return
    if (!this.ensureApiSetup()) return
    this.loadSessions()
  },

  onShow() {
    if (!this.ensureLegalAccepted()) return
    if (!this.ensureApiSetup()) return
    this.refreshActiveConfig()
    if (!this.data.isStreaming) {
      this.loadSessions()
    }
  },

  ensureLegalAccepted() {
    if (wx.getStorageSync(LEGAL_ACCEPTED_KEY)) return true
    wx.redirectTo({ url: '/pages/legal/legal' })
    return false
  },

  ensureApiSetup() {
    const settings = loadAISettings()
    const hasApiKey = settings.configs.some((config) => !!config.apiKey)
    if (hasApiKey || wx.getStorageSync(API_SETUP_SKIPPED_KEY)) return true

    wx.redirectTo({ url: '/pages/api/api?first=1' })
    return false
  },

  refreshActiveConfig() {
    const settings = loadAISettings()
    const active = getActiveConfig(settings)
    const activeModelIndex = Math.max(active.models.findIndex((model) => model === settings.activeModel), 0)
    const activeMultimodal = normalizeMultimodal(active.multimodal)
    const learningGrade = Number(wx.getStorageSync(LEARNING_GRADE_KEY) || 0)
    this.setData({
      settings,
      activeName: active.name,
      activeModel: settings.activeModel,
      activeModels: active.models,
      activeModelIndex,
      activeMultimodal,
      learningGrade,
      learningEnabled: learningGrade >= 1 && learningGrade <= 6,
      learningMode: learningGrade >= 1 && learningGrade <= 6 ? this.data.learningMode : false,
      imageGenerationMode: activeMultimodal.imageGeneration ? this.data.imageGenerationMode : false,
      pendingAttachments: activeMultimodal.enabled ? this.data.pendingAttachments : [],
    })
  },

  loadSessions() {
    const sessions = loadChatSessions()
    let activeSessionId = loadActiveSessionId()
    let activeSessionIndex = sessions.findIndex((session) => session.id === activeSessionId)
    if (activeSessionIndex < 0) {
      activeSessionIndex = 0
      activeSessionId = sessions[0].id
      saveActiveSessionId(activeSessionId)
    }

    this.setData({
      sessions,
      sessionNames: sessions.map((session) => session.title),
      activeSessionId,
      activeSessionIndex,
      messages: renderMessages(sessions[activeSessionIndex].messages || [], this.data.searchText),
      searchMatchCount: countSearchMatches(sessions[activeSessionIndex].messages || [], this.data.searchText),
    }, () => this.scrollToBottom(true))
  },

  saveCurrentSession(messages: ChatMessage[]) {
    const sessions = loadChatSessions()
    const now = Date.now()
    const storedMessages = toStoredMessages(messages)
    const nextSessions = sessions.map((session) => {
      if (session.id !== this.data.activeSessionId) return session
      const firstUser = storedMessages.find((msg) => msg.role === 'user')
      const title = session.title === '新对话' && firstUser ? buildSessionTitle(firstUser.content) : session.title
      return {
        ...session,
        title,
        messages: storedMessages,
        updatedAt: now,
      }
    })

    saveChatSessions(nextSessions)
    this.setData({
      sessions: nextSessions,
      sessionNames: nextSessions.map((session) => session.title),
      activeSessionIndex: nextSessions.findIndex((session) => session.id === this.data.activeSessionId),
    })
  },

  onSwitchSession(e: WechatMiniprogram.CustomEvent<{ value: string }>) {
    if (this.data.isStreaming) {
      wx.showToast({ title: 'Busy, try later', icon: 'none' })
      return
    }

    const index = Number(e.detail.value)
    const session = this.data.sessions[index]
    if (!session) return

    saveActiveSessionId(session.id)
    this.setData({
      activeSessionId: session.id,
      activeSessionIndex: index,
      messages: renderMessages(session.messages || [], this.data.searchText),
      searchMatchCount: countSearchMatches(session.messages || [], this.data.searchText),
      inputText: '',
      scrollToId: '',
      scrollTop: 0,
    }, () => this.scrollToBottom(true))
  },

  onSwitchModel(e: WechatMiniprogram.CustomEvent<{ value: string }>) {
    if (this.data.isStreaming) {
      wx.showToast({ title: 'Busy, try later', icon: 'none' })
      return
    }

    const index = Number(e.detail.value)
    const settings = loadAISettings()
    const active = getActiveConfig(settings)
    const model = active.models[index]
    if (!model) return

    settings.activeModel = model
    saveAISettings(settings)
    this.setData({
      settings,
      activeModel: model,
      activeModels: active.models,
      activeModelIndex: index,
    })
  },

  onNewSession() {
    if (this.data.isStreaming) {
      wx.showToast({ title: 'Busy, try later', icon: 'none' })
      return
    }

    const sessions = loadChatSessions()
    const session = createChatSession()
    const nextSessions = [session].concat(sessions)
    saveChatSessions(nextSessions)
    saveActiveSessionId(session.id)
    this.setData({
      sessions: nextSessions,
      sessionNames: nextSessions.map((item) => item.title),
      activeSessionId: session.id,
      activeSessionIndex: 0,
      messages: [],
      inputText: '',
      scrollToId: '',
      scrollTop: 0,
    })
  },

  onInput(e: WechatMiniprogram.CustomEvent<{ value: string }>) {
    this.setData({ inputText: e.detail.value })
  },

  onSearchInput(e: WechatMiniprogram.CustomEvent<{ value: string }>) {
    const searchText = e.detail.value
    const messages = toStoredMessages(this.data.messages)
    this.setData({
      searchText,
      messages: renderMessages(messages, searchText),
      searchMatchCount: countSearchMatches(messages, searchText),
    })
  },

  clearSearch() {
    const messages = toStoredMessages(this.data.messages)
    this.setData({
      searchText: '',
      messages: renderMessages(messages),
      searchMatchCount: 0,
    })
  },

  onWebSearchChange(e: WechatMiniprogram.CustomEvent<{ value: boolean }>) {
    this.setData({ webSearchEnabled: e.detail.value })
  },

  toggleLearningMode() {
    if (!this.data.learningEnabled || this.data.isStreaming) return
    this.setData({ learningMode: !this.data.learningMode })
  },

  toggleImageGenerationMode() {
    if (!this.data.activeMultimodal.imageGeneration || this.data.isStreaming) return

    this.setData({ imageGenerationMode: !this.data.imageGenerationMode })
  },

  onImageSizeChange(e: WechatMiniprogram.CustomEvent<{ value: string }>) {
    this.setData({ imageSizeIndex: Number(e.detail.value) })
  },

  goImageHistory() {
    wx.navigateTo({ url: '/pages/images/images' })
  },

  applyVisionTemplate(e: WechatMiniprogram.CustomEvent<{ text: string }>) {
    const text = e.currentTarget.dataset.text as string
    if (!text) return

    const promptMap: Record<string, string> = {
      提取文字: '请提取图片中的所有文字，并保持原有顺序。',
      分析图片: '请详细分析这张图片的内容、重点和可能的用途。',
      翻译图片内容: '请识别图片中的文字，并翻译成中文。',
      生成同款文案: '请根据这张图片生成一段同风格、可直接使用的文案。',
    }
    const nextText = promptMap[text] || text
    this.setData({ inputText: this.data.inputText ? `${this.data.inputText}\n${nextText}` : nextText })
  },

  readFile(path: string, encoding: 'base64' | 'utf8', success: (data: string) => void) {
    wx.getFileSystemManager().readFile({
      filePath: path,
      encoding,
      success: (res) => success(String(res.data || '')),
      fail: () => wx.showToast({ title: '文件读取失败', icon: 'none' }),
    })
  },

  chooseImageForRecognition() {
    if (!this.data.activeMultimodal.imageRecognition || this.data.isStreaming) return

    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const path = res.tempFilePaths[0]
        if (!path) return

        const name = getFileName(path, 'image.jpg')
        this.readFile(path, 'base64', (base64) => {
          const attachment: PendingAttachment = {
            id: createId('att'),
            kind: 'image',
            name,
            path,
            mimeType: guessMimeType(name, 'image'),
            base64,
          }
          this.setData({
            pendingAttachments: this.data.pendingAttachments.concat([attachment]),
          })
          wx.showToast({ title: '图片已添加', icon: 'success' })
        })
      },
    })
  },

  chooseFileForUpload() {
    if (!this.data.activeMultimodal.fileUpload || this.data.isStreaming) return

    ;(wx as any).chooseMessageFile({
      count: 1,
      type: 'file',
      success: (res: { tempFiles: Array<{ path: string; name: string; size: number }> }) => {
        const file = res.tempFiles && res.tempFiles[0]
        if (!file || !file.path) return

        const name = file.name || getFileName(file.path, 'file')
        const mimeType = guessMimeType(name, 'file')
        const addAttachment = (data: Partial<PendingAttachment>) => {
          const attachment: PendingAttachment = {
            id: createId('att'),
            kind: 'file',
            name,
            path: file.path,
            mimeType,
            ...data,
          }
          this.setData({
            pendingAttachments: this.data.pendingAttachments.concat([attachment]),
          })
          wx.showToast({ title: '文件已添加', icon: 'success' })
        }

        if (isTextLikeFile(name, mimeType) && file.size <= 1024 * 1024) {
          this.readFile(file.path, 'utf8', (text) => addAttachment({ text }))
        } else {
          this.readFile(file.path, 'base64', (base64) => addAttachment({ base64 }))
        }
      },
      fail: () => wx.showToast({ title: '未选择文件', icon: 'none' }),
    })
  },

  removeAttachment(e: WechatMiniprogram.CustomEvent<{ id: string }>) {
    const id = e.currentTarget.dataset.id as string
    this.setData({
      pendingAttachments: this.data.pendingAttachments.filter((item) => item.id !== id),
    })
  },

  onMessageScroll(e: WechatMiniprogram.CustomEvent<{ scrollTop: number; scrollHeight: number; deltaY: number }>) {
    const detail = e.detail
    const query = wx.createSelectorQuery()
    query.select('.messages').boundingClientRect((rect) => {
      const height = rect ? rect.height : 0
      const distanceToBottom = detail.scrollHeight - detail.scrollTop - height
      const showBottomJump = distanceToBottom > 160
      if (showBottomJump !== this.data.showBottomJump) {
        this.setData({ showBottomJump })
      }
    }).exec()
  },

  onConfirm() {
    this.onSend()
  },

  goSettings() {
    wx.navigateTo({ url: '/pages/settings/settings' })
  },

  goHistory() {
    if (this.data.isStreaming) {
      wx.showToast({ title: 'Busy, try later', icon: 'none' })
      return
    }

    wx.navigateTo({ url: '/pages/history/history' })
  },

  findCodeSegment(messageId: string, segmentId: string) {
    const message = this.data.messages.find((item) => item.id === messageId)
    return message ? message.segments.find((segment) => segment.id === segmentId && segment.type === 'code') : undefined
  },

  copyCode(e: WechatMiniprogram.CustomEvent<{ messageId: string; segmentId: string }>) {
    const segment = this.findCodeSegment(e.currentTarget.dataset.messageId as string, e.currentTarget.dataset.segmentId as string)
    const code = segment ? segment.code || '' : ''
    wx.setClipboardData({ data: code || '' })
  },

  previewCode(e: WechatMiniprogram.CustomEvent<{ messageId: string; segmentId: string }>) {
    const segment = this.findCodeSegment(e.currentTarget.dataset.messageId as string, e.currentTarget.dataset.segmentId as string)
    const code = segment ? segment.code || '' : ''
    if (!code) return

    wx.setStorageSync('html_preview_code_v1', code)
    wx.navigateTo({ url: '/pages/preview/preview' })
  },

  onSend() {
    const content = this.data.inputText.trim()
    const attachments = this.data.pendingAttachments
    if ((!content && !attachments.length) || this.data.isStreaming) return

    const settings = loadAISettings()
    const active = getActiveConfig(settings)
    if (!active.apiKey) {
      wx.showToast({ title: 'Set API Key first', icon: 'none' })
      return
    }

    const displayContent = [
      content || '请分析我上传的内容',
      ...attachments.map((item) => item.kind === 'image' ? `\n[图片：${item.name}]` : `\n[文件：${item.name}]`),
      this.data.imageGenerationMode ? '\n[生成图模式]' : '',
    ].join('')

    const userMessage: ChatMessage = {
      id: createId('user'),
      role: 'user',
      content: displayContent,
    }

    const assistantId = createId('assistant')
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      pending: true,
    }

    const nextMessages = toStoredMessages(this.data.messages).concat([userMessage, assistantMessage])
    this.requestInputText = [content || '请分析我上传的内容', ...attachments.map((item) => item.text || item.name)].join('\n')
    this.requestModel = settings.activeModel
    this.requestAttachments = attachments
    this.learningSystemPrompt = ''
    this.usageRecorded = false

    this.setData({
      messages: renderMessages(nextMessages, this.data.searchText),
      searchMatchCount: countSearchMatches(nextMessages, this.data.searchText),
      inputText: '',
      pendingAttachments: [],
      isStreaming: true,
      scrollToId: assistantId,
      settings,
      activeName: active.name,
      activeModel: settings.activeModel,
    }, () => this.scrollToBottom(true))
    this.saveCurrentSession(nextMessages)
    if (this.data.imageGenerationMode) {
      this.startImageGeneration(assistantId, content || displayContent)
    } else if (this.data.learningMode) {
      this.prepareLearningAndStart(assistantId, nextMessages)
    } else {
      this.startStream(assistantId, nextMessages)
    }
  },

  prepareLearningAndStart(assistantId: string, nextMessages: ChatMessage[]) {
    wx.request({
      url: `${LEARNING_API_BASE}/api/materials`,
      method: 'GET',
      data: {
        grade: this.data.learningGrade,
        subject: 'math',
      },
      success: (res: any) => {
        const data = res.data || {}
        const materials = Array.isArray(data.materials) ? data.materials : []
        this.learningSystemPrompt = buildLearningPrompt(this.data.learningGrade, materials)
        this.startStream(assistantId, nextMessages)
      },
      fail: () => {
        this.learningSystemPrompt = buildLearningPrompt(this.data.learningGrade, [])
        this.startStream(assistantId, nextMessages)
      },
    })
  },

  startImageGeneration(assistantId: string, prompt: string) {
    const settings = loadAISettings()
    const active = getActiveConfig(settings)
    const url = `${active.baseUrl.replace(/\/$/, '')}/images/generations`
    const size = this.data.imageSizeValues[this.data.imageSizeIndex] || this.data.imageSizeValues[0]

    wx.request({
      url,
      method: 'POST',
      timeout: 120000,
      header: {
        'content-type': 'application/json',
        Authorization: `Bearer ${active.apiKey}`,
      },
      data: {
        model: settings.activeModel,
        prompt,
        n: 1,
        size,
      },
      success: (res: any) => {
        if (res.statusCode >= 400) {
          this.finishStream(assistantId, `\n\n[图片生成失败：API error ${res.statusCode}]`)
          return
        }

        const data = res.data || {}
        const item = data.data && data.data[0]
        const imageUrl = item && (item.url || (item.b64_json ? `data:image/png;base64,${item.b64_json}` : ''))
        if (!imageUrl) {
          this.finishStream(assistantId, '\n\n[图片生成失败：接口没有返回图片地址]')
          return
        }

        addImageGenerationRecord({
          id: createId('img'),
          prompt,
          model: settings.activeModel,
          size,
          imageUrl,
          createdAt: Date.now(),
        })
        this.finishStream(assistantId, `图片生成完成：\n\n![生成图片](${imageUrl})\n\n${imageUrl}`)
      },
      fail: () => {
        this.finishStream(assistantId, '\n\n[图片生成请求失败，请检查 Base URL 或模型是否支持生成图]')
      },
    })

  },

  startStream(assistantId: string, messages: ChatMessage[]) {
    utf8Remainder = ''
    this.charQueue = []
    this.streamEnded = false
    this.lastScrollAt = 0

    const settings = loadAISettings()
    const active = getActiveConfig(settings)
    const url = `${active.baseUrl.replace(/\/$/, '')}/chat/completions`
    const history: any[] = messages
      .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
      .map((msg) => ({ role: msg.role, content: msg.content }))
    const lastUserIndex = history.map((msg) => msg.role).lastIndexOf('user')
    if (lastUserIndex >= 0 && this.requestAttachments.length) {
      const textParts = [this.data.inputText || this.requestInputText || history[lastUserIndex].content]
      this.requestAttachments
        .filter((item) => item.kind === 'file')
        .forEach((item) => {
          if (item.text) {
            textParts.push(`\n\n文件 ${item.name} 内容：\n${item.text}`)
          } else {
            textParts.push(`\n\n已上传文件：${item.name}。当前接口不一定支持二进制文件直传，请根据文件名和用户问题说明可处理范围。`)
          }
        })

      const contentParts: any[] = [{ type: 'text', text: textParts.join('') }]
      this.requestAttachments
        .filter((item) => item.kind === 'image' && item.base64)
        .forEach((item) => {
          contentParts.push({
            type: 'image_url',
            image_url: { url: `data:${item.mimeType};base64,${item.base64}` },
          })
        })
      history[lastUserIndex] = { role: 'user', content: contentParts }
    }
    let requestMessages = this.data.webSearchEnabled
      ? [{ role: 'system', content: '用户已开启联网搜索。若当前模型或服务商支持联网搜索，请优先检索最新信息并在回答中说明信息来源；若不支持，请明确说明无法真实联网搜索。' }].concat(history)
      : history
    if (this.learningSystemPrompt) {
      requestMessages = [{ role: 'system', content: this.learningSystemPrompt }].concat(requestMessages)
    }

    const requestOptions: any = {
      url,
      method: 'POST',
      timeout: 120000,
      enableChunked: true,
      header: {
        'content-type': 'application/json',
        Authorization: `Bearer ${active.apiKey}`,
      },
      data: {
        model: settings.activeModel,
        messages: requestMessages,
        stream: true,
        stream_options: { include_usage: true },
      },
      fail: () => {
        this.finishStream(assistantId, '\n\n[Request failed. Check network or API URL]')
      },
    }

    if (this.data.webSearchEnabled) {
      const baseUrl = active.baseUrl.toLowerCase()
      if (baseUrl.indexOf('moonshot') >= 0 || baseUrl.indexOf('kimi') >= 0) {
        requestOptions.data.tools = [{ type: 'builtin_function', function: { name: '$web_search' } }]
      } else if (baseUrl.indexOf('openai.com') >= 0 && settings.activeModel.indexOf('search') >= 0) {
        requestOptions.data.web_search_options = {}
      }
    }

    const requestTask = wx.request(requestOptions)

    ;(requestTask as any).onChunkReceived((res: { data: ArrayBuffer }) => {
      const text = decodeChunk(res.data)
      const merged = utf8Remainder + text
      const lines = merged.split('\n')
      utf8Remainder = lines.pop() || ''

      lines.forEach((line) => {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) return

        const payload = trimmed.slice(5).trim()
        if (payload === '[DONE]') {
          this.finishStream(assistantId)
          return
        }

        try {
          const json = JSON.parse(payload)
          if (json && json.usage) {
            this.recordExactUsage(settings.activeModel, json.usage)
          }

          const choices = (json && json.choices) || []
          const first = choices[0] || {}
          const deltaObj = first.delta || {}
          const delta = deltaObj.content || ''
          if (delta) {
            for (const ch of delta) {
              this.charQueue.push(ch)
            }
            this.consumeQueue(assistantId)
          }
        } catch (_err) {
          // Ignore incomplete payload fragments.
        }
      })
    })

    ;(requestTask as any).onHeadersReceived((res: { statusCode: number }) => {
      if (res.statusCode >= 400) {
        this.finishStream(assistantId, '\n\n[API error: ' + res.statusCode + ']')
      }
    })
  },

  recordExactUsage(model: string, usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) {
    if (this.usageRecorded) return

    const inputTokens = usage.prompt_tokens || 0
    const outputTokens = usage.completion_tokens || Math.max((usage.total_tokens || 0) - inputTokens, 0)
    if (!inputTokens && !outputTokens) return

    addUsageRecord(model, inputTokens, outputTokens)
    this.usageRecorded = true
  },

  recordEstimatedUsage(messages: ChatMessage[], assistantId: string) {
    if (this.usageRecorded) return

    const assistant = messages.find((msg) => msg.id === assistantId)
    const inputTokens = estimateTokens(this.requestInputText)
    const outputTokens = estimateTokens(assistant ? assistant.content : '')
    addUsageRecord(this.requestModel || this.data.activeModel, inputTokens, outputTokens)
    this.usageRecorded = true
  },

  consumeQueue(assistantId: string) {
    if (this.queueTimer) return

    this.queueTimer = setInterval(() => {
      const piece = this.takeChars(4)
      if (!piece) {
        clearInterval(this.queueTimer)
        this.queueTimer = 0
        if (this.streamEnded) {
          this.markAssistantDone(assistantId)
        }
        return
      }

      const messages = this.data.messages.map((msg) => {
        if (msg.id !== assistantId) return msg
        return {
          ...msg,
          pending: false,
          content: msg.content + piece,
        }
      })

      const now = Date.now()
      const shouldScroll = now - this.lastScrollAt > 120 || this.streamEnded
      if (shouldScroll) {
        this.lastScrollAt = now
      }

      this.setData({
        messages: renderMessages(messages, this.data.searchText),
        searchMatchCount: countSearchMatches(messages, this.data.searchText),
        scrollToId: shouldScroll ? 'messages-bottom' : this.data.scrollToId,
        scrollTop: shouldScroll ? this.data.scrollTop + 10000 : this.data.scrollTop,
      })
    }, 32) as unknown as number
  },

  scrollToBottom(force = false) {
    const now = Date.now()
    if (!force && now - this.lastScrollAt <= 120) return

    this.lastScrollAt = now
    this.setData({
      scrollToId: 'messages-bottom',
      scrollTop: this.data.scrollTop + 10000,
      showBottomJump: false,
    })
  },

  takeChars(maxCount: number) {
    let text = ''
    while (text.length < maxCount && this.charQueue.length) {
      text += this.charQueue.shift()
    }
    return text
  },

  finishStream(assistantId: string, suffix = '') {
    if (suffix) {
      for (const ch of suffix) {
        this.charQueue.push(ch)
      }
    }

    this.streamEnded = true
    this.consumeQueue(assistantId)

    if (!this.queueTimer && !this.charQueue.length) {
      this.markAssistantDone(assistantId)
    }
  },

  markAssistantDone(assistantId: string) {
    const messages = this.data.messages.map((msg) => {
      if (msg.id !== assistantId) return msg
      return {
        ...msg,
        pending: false,
      }
    })

    this.recordEstimatedUsage(messages, assistantId)
    this.setData({
      messages: renderMessages(messages, this.data.searchText),
      searchMatchCount: countSearchMatches(messages, this.data.searchText),
      isStreaming: false,
      scrollToId: 'messages-bottom',
      scrollTop: this.data.scrollTop + 10000,
    })
    this.saveCurrentSession(messages)
  },
})
}
