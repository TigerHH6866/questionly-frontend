/**
 * 题目元信息（学段 / 学科 / 布鲁姆认知目标 / 难度）：
 * 固定档位 + 从 AI 分析报告里自动匹配。
 * 分析报告前两节形如：
 *   ### 1. 学段：高中      学科：物理
 *   ### 2. 布鲁姆认知目标分类：理解题    难度：普通题
 * 匹配不到时返回空字符串，交给用户自己下拉选择。
 */
export const STAGES = ['小学', '初中', '高中']
export const SUBJECTS = [
  '语文',
  '数学',
  '英语',
  '物理',
  '化学',
  '生物',
  '政治',
  '历史',
  '地理',
  '道德与法治',
  '科学'
]
export const BLOOM_TYPES = ['基础题', '理解题', '应用题', '分析题', '评价题', '创造题']
export const DIFFICULTIES = ['普通题', '中档题', '较难题', '压轴题']

/** 取「键：值」里的值，值截到第一个空白 / 冒号 / 括号 */
export function extractMetaValue(markdown, keys) {
  if (!markdown) return ''
  for (const key of keys) {
    const match = String(markdown).match(new RegExp(`${key}\\s*[:：]\\s*([^\\s：:（(]+)`))
    if (match) return match[1]
  }
  return ''
}

/** 具体年级折算到学段：高一 -> 高中，七年级 -> 初中 */
export function normalizeStage(raw) {
  const value = String(raw || '').trim()
  if (!value) return ''
  if (value.includes('小学') || /[一二三四五六]年级/.test(value)) return '小学'
  if (value.includes('初中') || /初[一二三]/.test(value) || /[七八九]年级/.test(value)) return '初中'
  if (value.includes('高中') || /高[一二三]/.test(value)) return '高中'
  return ''
}

/** 学科别名归一：思想政治 -> 政治，道法 -> 道德与法治 */
export function normalizeSubject(raw) {
  const value = String(raw || '').trim()
  if (!value) return ''
  if (value.includes('思想政治') || value.includes('思想品德')) return '政治'
  if (value.includes('道法') || value.includes('道德与法治') || value.includes('品德')) return '道德与法治'
  return SUBJECTS.find((subject) => value.includes(subject)) || ''
}

/** 布鲁姆认知目标归一：理解 -> 理解题 */
export function normalizeBloom(raw) {
  const value = String(raw || '').trim()
  if (!value) return ''
  const hit = ['基础', '理解', '应用', '分析', '评价', '创造'].find((level) => value.includes(level))
  return hit ? `${hit}题` : ''
}

/** 难度归一：容易 -> 普通题，困难 -> 较难题 */
export function normalizeDifficulty(raw) {
  const value = String(raw || '').trim()
  if (!value) return ''
  const hit = ['普通', '中档', '较难', '压轴'].find((level) => value.includes(level))
  if (hit) return `${hit}题`
  if (value.includes('容易') || value.includes('简单')) return '普通题'
  if (value.includes('中等')) return '中档题'
  if (value.includes('困难')) return '较难题'
  return ''
}

/** 从分析报告 Markdown 中解析四个维度的取值 */
export function parseQuestionMeta(markdown) {
  return {
    stage: normalizeStage(extractMetaValue(markdown, ['学段'])),
    subject: normalizeSubject(extractMetaValue(markdown, ['学科', '科目'])),
    bloomType: normalizeBloom(
      extractMetaValue(markdown, ['布鲁姆认知目标分类', '布鲁姆认知目标', '认知目标'])
    ),
    difficulty: normalizeDifficulty(extractMetaValue(markdown, ['难度']))
  }
}
