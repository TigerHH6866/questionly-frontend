export default {
  app: {
    name: 'Questionly'
  },
  nav: {
    section: '工作区',
    import: '导入题目',
    search: '搜索题库',
    language: '语言',
    settings: '设置',
    account: '未登录'
  },
  lang: {
    zh: '中文',
    en: 'EN'
  },
  tasks: {
    list: '任务记录',
    detail: '任务详情'
  },
  import: {
    title: '导入题目',
    subtitle: '上传试卷、图片或文档，自动识别题目并生成分析报告',
    drop: {
      title: '点击选择文件，或将文件拖拽到此处',
      hint: '支持 png / jpg / jpeg / doc / docx / pdf，单文件不超过 100MB'
    },
    start: '开始识别处理',
    waiting: '正在识别处理文档…',
    failed: '识别失败，请重试',
    timeout: '识别超时，请重试',
    retry: '重试',
    choose: '选择文件',
    remove: '删除文件',
    error: {
      type: '仅支持 png / jpg / jpeg / doc / docx / pdf 格式的文件',
      size: '文件大小不能超过 100MB'
    },
    cards: {
      recognize: {
        title: '识别能力',
        desc: '基于 MinerU OCR，精准提取试卷与文档中的题干、公式、表格和插图。'
      },
      analyze: {
        title: '人工智能分析题目',
        desc: '自动分析科目、年级、知识点与考察能力，生成结构化的题目分析报告。'
      },
      search: {
        title: '人工智能搜索题目',
        desc: '用自然语言描述需求，自动转成数据库查询，精准检索你的题库。'
      }
    }
  },
  process: {
    title: '题目处理',
    loading: '正在加载解析结果…',
    loadFailed: '解析结果加载失败',
    retry: '重试',
    total: '共 {total} 题',
    questionLabel: '第 {n} 题',
    empty: '未识别到题目',
    analyze: 'AI 分析',
    analyzing: '分析中',
    viewAnalysis: '查看 AI 分析结果',
    panelTitle: 'AI 分析结果',
    close: '关闭',
    copyLatex: '复制 LaTeX',
    copied: '已复制 LaTeX 代码',
    copyFailed: '复制失败，请重试',
    finish: '结束',
    finishTip: '结束后未入库题目将不会保存'
  },
  common: {
    confirm: '确定',
    cancel: '取消'
  },
  search: {
    title: '搜索题库',
    empty: {
      title: '搜索题库功能开发中',
      desc: '完成后可用自然语言检索你的题库，例如「找一下瓜豆原理的题目」。'
    }
  }
}
