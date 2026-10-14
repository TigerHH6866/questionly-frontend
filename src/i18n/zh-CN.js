export default {
  app: {
    name: 'Questionly'
  },
  nav: {
    section: '工作区',
    import: '导入题目',
    recent: '近期文件',
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
    list: '近期文件',
    detail: '任务详情',
    refresh: '刷新',
    empty: '暂无记录',
    column: {
      fileName: '文件名',
      status: '状态',
      questionCount: '题目数',
      createdAt: '创建时间'
    },
    status: {
      PENDING: '排队中',
      PARSING: '解析中',
      SUCCESS: '已完成',
      FAILED: '失败'
    }
  },
  import: {
    title: '导入题目',
    subtitle: '上传试卷、图片或文档，自动识别题目并生成分析报告',
    drop: {
      title: '点击选择文件，或将文件拖拽到此处',
      hint: '支持 png / jpg / jpeg / doc / docx / pdf，单文件不超过 100MB；也可直接 Ctrl+V 粘贴截图或文件'
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
    panelHint: '您可以自由修改内容并保存',
    close: '关闭',
    copyLatex: '复制 LaTeX',
    copied: '已复制 LaTeX 代码',
    copyFailed: '复制失败，请重试',
    finish: '结束',
    finishTip: '结束后未入库题目将不会保存',
    saveToBank: '存入题库',
    saving: '保存中…',
    saved: '已存入题库',
    saveEmpty: '暂无可保存的分析结果'
  },
  common: {
    confirm: '确定',
    cancel: '取消'
  },
  auth: {
    close: '关闭',
    signIn: '登录',
    signUp: '注册',
    signInTitle: '欢迎回来',
    signInSub: '登录后即可检索你的题库',
    signUpTitle: '创建账号',
    signUpSub: '使用邮箱注册，畅享题目检索与分析',
    email: '邮箱',
    emailPlaceholder: "you{'@'}example.com",
    password: '密码',
    passwordPlaceholder: '8 位以上字母与数字组合',
    code: '验证码',
    codePlaceholder: '请输入验证码',
    sendCode: '获取验证码',
    submitting: '登录中…',
    signInSuccess: '登录成功',
    signUpPending: '注册功能即将开放，敬请期待',
    credits: '积分',
    logout: '退出登录',
    errEmailRequired: '请输入邮箱',
    errEmailFormat: '邮箱格式不正确',
    errPasswordRequired: '请输入密码',
    errPasswordRule: '密码需为 8 位以上，且同时包含字母和数字',
    errCodeRequired: '请输入验证码'
  },
  search: {
    title: '搜索题库',
    placeholder: '用自然语言描述你要找的题目，如「找一下瓜豆原理的题目」',
    send: '发送',
    micStart: '语音输入',
    micStop: '结束录音',
    micDenied: '无法访问麦克风，请检查浏览器权限',
    recognizing: '识别中…',
    thinking: '正在检索…',
    empty: {
      desc: '用自然语言检索你的题库，AI会找到一切'
    },
    found: '找到 {total} 道题',
    none: '没有找到匹配的题目，换个说法再试试',
    failed: '检索失败，请重新提问',
    prev: '上一页',
    next: '下一页',
    page: '第 {page} / {pages} 页',
    delete: '删除',
    deleteTip: '删除后该题目将从题库中移除，且不可恢复',
    deleted: '题目已删除',
    saveEdit: '保存修改',
    saveEditEmpty: '分析内容不能为空',
    updated: '已保存修改'
  }
}
