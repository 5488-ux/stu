import { MODEL_PRICING, findModelPricing, getTodayUsage } from '../../utils/ai'

interface UsageRow {
  model: string
  label: string
  provider: string
  totalTokens: number
  costText: string
  barWidth: number
}

interface UsageData {
  model: string
  label: string
  provider: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  requests: number
  costText: string
  inputPrice: string
  outputPrice: string
  note: string
  rows: UsageRow[]
}

const money = (value: number) => `CNY ${value.toFixed(4)}`

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
  } as UsageData,

  onLoad(query: { model: string }) {
    this.reload((query && query.model) || 'deepseek-chat')
  },

  reload(model: string) {
    const pricing = findModelPricing(model) || MODEL_PRICING[0]
    const usage = getTodayUsage(model)
    const rows = MODEL_PRICING.map((item) => {
      const itemUsage = getTodayUsage(item.model)
      return {
        model: item.model,
        label: item.label,
        provider: item.provider,
        totalTokens: itemUsage.inputTokens + itemUsage.outputTokens,
        costText: money(itemUsage.costCny),
        barWidth: 0,
      }
    })
    const maxTokens = Math.max.apply(null, rows.map((row) => row.totalTokens).concat([1]))
    const normalizedRows = rows.map((row) => ({
      ...row,
      barWidth: Math.max(6, Math.round((row.totalTokens / maxTokens) * 100)),
    }))

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
    })
  },

  onSelectModel(e: WechatMiniprogram.CustomEvent<{ model: string }>) {
    const model = e.currentTarget.dataset.model as string
    if (model) {
      this.reload(model)
    }
  },
})
}
