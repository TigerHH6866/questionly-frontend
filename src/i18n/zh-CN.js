export default {
  app: {
    name: '妙 题'
  },
  /* 落地页（公开主页，与工作区共用一套设计令牌） */
  landing: {
    nav: { workspace: '工作区', pricing: '定价', guide: '教程' },
    login: '登录',
    account: { workspace: '进入工作区', settings: '设置', logout: '退出登录' },
    cta: '开始使用',
    hero: {
      eyebrow: '教师的私有化试题工作台',
      title: '把试卷变成会思考可检索的结构化题库',
      sub: '上传 PDF、Word 或照片，AI 自动识别题干、选项、公式、表格与插图，分析学科、年级、知识点与考察能力；用自然语言就能检索，可自由组卷、编排讲义。',
      secondary: '看看能做什么',
      play: '播放演示',
      videoHint: '演示视频准备中，可先进入工作区体验'
    },
    features: {
      eyebrow: '两大核心能力',
      title: '先把纸面搬进系统，再把题目读明白',
      sub: '文件解析负责还原卷面，AI 分析负责理解每道题在考什么——两者合起来，才是真正可用的题库。',
      parse: {
        title: '文件解析',
        desc: '把扫描件、照片、PDF 与 Word 完整还原成结构化题目，版式、公式、表格与插图一个不少。',
        p1: '按题号顺序自动切分题干、选项、解答与答案',
        p2: '公式与表格、图片原样保留，Latex格式可直接复制使用',
        p3: '支持批量解析，上百页文档也能一次处理完'
      },
      analyze: {
        title: 'AI 自动分析',
        desc: '不只是识别文字，人工智能会读懂每道题的知识点和考点，补全可检索的结构化信息进入您的题库。',
        p1: '自动判定学科、年级、题型与难度',
        p2: '自动提炼知识点与考察能力，生成结构化解析',
        p3: '自动生成包含解题思路和解题过程的答案',
        p4: '识别结果可直接编辑，改完即入库'
      }
    },
    search: {
      eyebrow: '第三件事',
      title: '便捷搜索',
      sub: '不必记住章节与知识点目录，用平时说话的方式描述要找的题，人工智能会帮您找到一切。',
      p1: '自然语言提问，自动理解意图与限定条件',
      p2: '题干与解析同时匹配，召回更全',
      p3: '查到的题目可以一键加入试卷',
      query: '找几道考察「函数单调性」的高一压轴题',
      r1: '已知函数 f(x)=x³−3ax+1 在区间 (1,+∞) 上单调递增，求实数 a 的取值范围。',
      r2: '设 f(x)=ln x−ax，讨论 f(x) 的单调性，并求其在 [1,e] 上的最小值。',
      r3: '若函数 f(x)=x²−2x+a 在 (0,3) 上不单调，求 a 的取值范围。',
      meta: '数学 · 高一 · 压轴',
      foot: '检索结果由 AI 生成，请核对后再使用'
    },
    compose: {
      eyebrow: '第四件事',
      title: '沉浸式组卷',
      sub: '选中的题目按 A4 版式自动分页，像编辑器一样直接改字、调格式、换版面，改完即可交付。',
      p1: '逐行填充、页满自动跨页，断点只落在字符边界',
      p2: '公式与图片不跨页拆分，单栏双栏随版面切换',
      p3: '标题、题号、分值与格式微调，所见即所得',
      chip: 'A4 · 双栏 · 自动分页'
    },
    pricing: {
      /* 套餐名：套餐页、支付弹窗与订单列表共用；价格 / 积分 / 题目额度等一律以 credits_plan 表为准 */
      basic: { name: '基础' },
      plus: { name: '进阶' },
      pro: { name: '专业' }
    },
    footer: {
      tagline: '把纸面试卷变成可检索、可组卷的结构化题库。',
      product: '产品',
      learn: '功能',
      legal: '法律条款',
      terms: '用户协议',
      privacy: '隐私政策',
      rights: '保留所有权利'
    }
  },
  /* 法律页（用户协议 / 隐私政策）：正文改为 src/legal 下的 Markdown 文件承载，这里只留页面框架文案 */
  legal: {
    updated: '最后更新：2026 年 10 月 19 日 · 生效日期：2026 年 10 月 19 日',
    back: '返回首页',
    terms: {
      eyebrow: '法律条款',
      title: '用户协议'
    },
    privacy: {
      eyebrow: '法律条款',
      title: '隐私政策'
    }
  },
  nav: {
    section: '工作区',
    import: 'AI录题',
    recent: '近期文件',
    search: '搜索题库',
    compose: '沉浸式组卷',
    resources: '我的资源',
    language: '语言',
    theme: '主题',
    themeDark: '切换为深色',
    themeLight: '切换为浅色',
    account: '未登录',
    portal: '门户主页',
    upgrade: '升级套餐',
    orders: '我的订单',
    support: '帮助与反馈'
  },
  lang: {
    zh: '中文',
    en: 'EN'
  },
  resources: {
    tabs: {
      files: '我的文件',
      papers: '我的试卷',
      questions: '我的题目'
    },
    total: '共 {total} 个文件',
    empty: '还没有文件，先从「导入新文件」开始',
    needLogin: '登录后可查看自己的文件',
    files: {
      cardLabel: '文件',
      questionCount: '{count} 道题',
      parsed: '已解析',
      delete: '删除',
      deleteTip: '删除后该文件记录不可恢复，题库中已入库的题目不受影响',
      deleted: '已删除'
    },
    papers: {
      cardLabel: '试卷',
      total: '共 {total} 份试卷',
      empty: '还没有试卷，去「沉浸式组卷」新建一份',
      needLogin: '登录后可查看自己的试卷'
    },
    questions: {
      total: '共 {total} 道题',
      empty: '题库里还没有题目，先在「导入新文件」里分析入库',
      needLogin: '登录后可查看自己的题目',
      detail: '查看详情',
      stem: '题干'
    }
  },
  tasks: {
    list: '近期文件',
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
    subtitle: '上传文档或图片，Ai自动识别题目并分析入库',
    drop: {
      title: '点击选择文件，或将文件拖拽到此处',
      hint: '支持图片 / PDF  / Word / PPT，最大100MB 100页, 也可直接Ctrl+V / ⌘+V 粘贴截图或文件'
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
        desc: '先进的人工智能视觉模型，精准提取全学科试卷与文档中的题干、公式、表格和插图。'
      },
      analyze: {
        title: '智能分析',
        desc: '告别累人的手动录入，AI自动分析科目、年级、知识点与考察能力，生成结构化的题目分析内容。'
      },
      search: {
        title: '便捷搜索',
        desc: '不必拘泥于刻板的章节知识点，用大白话说想搜什么，人工智能会为您找到一切。'
      }
    }
  },
  process: {
    loading: '正在加载解析结果…',
    loadFailed: '解析结果加载失败',
    retry: '重试',
    total: '共 {total} 题',
    questionLabel: '第 {n} 题',
    empty: '未识别到题目',
    analyze: 'AI 分析入库',
    analyzing: '分析中',
    viewAnalysis: '查看 AI 分析结果',
    bankInfo: '查看入库信息',
    panelTitle: 'AI 分析结果',
    panelHint: '您可以自由修改内容并保存',
    tabAnalysis: 'AI 分析',
    tabAnswer: '答案分析',
    aiSolve: 'AI解题',
    answerSolving: '解题中…',
    updateBank: '更新题库',
    updated: '已更新',
    close: '关闭',
    copyLatex: '复制 LaTeX',
    copied: '已复制 LaTeX 代码',
    copyFailed: '复制失败，请重试',
    saveToBank: '存入题库',
    saving: '保存中…',
    saved: '已存入题库',
    saveEmpty: '没有可保存的修改',
    edit: '编辑',
    editDone: '完成',
    mergeUp: '并入上方',
    delete: '删除',
    deleteTip: '本题将从处理页移除，重新进入文件不再显示；不删除题库中已入库的题目',
    deleteSavedTip: '该题已入库，这里的删除不会移除题库中的记录',
    editSavedTip: '该题已入库，编辑结果不会回写到题库',
    mergeSavedTip: '合并涉及已入库的题目，合并结果不会覆盖题库中的原题',
    splitInFormula: '光标在公式内，无法在此处拆分',
    fmtUnderline: '下划线',
    fmtDot: '着重号',
    fmtItalic: '斜体',
    fmtBold: '加粗'
  },
  common: {
    confirm: '确定',
    cancel: '取消',
    back: '返回'
  },
  compose: {
    back: '返回',
    new: '新建组卷',
    newHint: '从题库搜索题目，排版生成一份新试卷',
    recent: '近期编辑',
    empty: '还没有试卷，点击上方卡片新建一份',
    needLogin: '登录后可查看自己的试卷',
    loadFailed: '试卷加载失败',
    search: {
      title: '搜索题目',
      placeholder: '描述你要找的题目，如「瓜豆原理」',
      button: '搜索',
      insert: '插入',
      hint: '输入关键词，从题库中搜索题目插入试卷',
      empty: '没有找到匹配的题目'
    },
    doc: {
      placeholder: '在左侧搜索题目并点击「插入」，或直接在这里输入内容',
      page: '第 {n} 页'
    },
    size: {
      three: '三号',
      four: '四号',
      smallFour: '小四',
      five: '五号',
      smallFive: '小五'
    },
    options: {
      paperSize: '版面',
      zoom: '显示比例',
      zoomFit: '适配',
      format: '文字格式',
      fontSize: '字号',
      lineHeight: '行距',
      align: '对齐',
      alignLeft: '左对齐',
      alignCenter: '居中对齐',
      alignRight: '右对齐',
      bold: '加粗',
      italic: '斜体',
      underline: '下划线',
      title: '试卷标题',
      titlePlaceholder: '请输入试卷标题',
      titleRequired: '请输入试卷标题',
      untitled: '未命名试卷',
      save: '保存',
      saving: '保存中…',
      saved: '已保存',
      exportPdf: '导出 PDF',
      exportWord: '导出 Word',
      exporting: '正在生成…',
      exported: 'PDF 已开始下载',
      exportedWord: 'Word 已开始下载',
      exportEmpty: '试卷还是空的，先插入题目再导出',
      exportFailed: '文件生成失败，请稍后重试'
    }
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
    signupEmailPlaceholder: '请输入您的邮箱地址',
    password: '密码',
    passwordPlaceholder: '8 位以上字母与数字组合',
    signupPasswordPlaceholder: '请设置您的登录密码',
    code: '验证码',
    codePlaceholder: '请输入验证码',
    sendCode: '获取验证码',
    submitting: '登录中…',
    signingUp: '注册中…',
    signInSuccess: '登录成功',
    signUpSuccess: '注册成功，已为你赠送 100 积分与 20 道题目额度',
    codeSent: '验证码已发送，请查收邮箱',
    credits: '积分',
    questions: '道题目',
    logout: '退出登录',
    errEmailRequired: '请输入邮箱',
    errEmailFormat: '邮箱格式不正确',
    errPasswordRequired: '请输入密码',
    errPasswordRule: '密码需为 8 位以上，且同时包含字母和数字',
    errCodeRequired: '请输入验证码'
  },
  /* 支付弹窗（微信 Native 扫码支付）：套餐档位文案复用 landing.pricing 里的 name */
  pay: {
    title: '升级套餐',
    sub: '微信扫码支付，支付成功后额度立即到账',
    qrAlt: '微信支付二维码',
    current: '当前套餐',
    highest: '当前已是最高套餐，无需升级',
    pending: '等待支付…',
    success: '支付成功，套餐已到账',
    closed: '订单已关闭，请重新选择套餐下单',
    expired: '二维码已过期，请重新选择套餐下单',
    failHint: '下单失败，请稍后重试或联系客服'
  },
  /* 我的订单（套餐名复用 landing.pricing 里的 name，这里只放列表与状态文案） */
  orders: {
    needLogin: '登录后可查看自己的订单',
    empty: '还没有订单，去账号菜单里选一个套餐吧',
    total: '共 {total} 笔订单',
    repay: '继续支付',
    tradeNo: '订单号',
    createdAt: '下单时间',
    paidAt: '支付时间',
    status: {
      CREATED: '待支付',
      PAID: '已支付',
      CLOSED: '已关闭',
      FAILED: '下单失败'
    }
  },
  /* 独立套餐页（/plans）：档位与金额取自后端 credits_plan，这里只放页面框架与通用卖点文案 */
  plans: {
    titleLead: '先免费试用，',
    titleAccent: '需要时再升级。',
    sub: '没有任何隐藏费用。AI 分析、检索与组卷始终免费，额度随套餐一次性到账，有效期一年。',
    popular: '最受欢迎',
    best: '超值优选',
    free: '免费',
    perYear: '/ 年',
    forever: '长期有效，无需付费',
    validFor: '有效期 {days} 天',
    included: '已包含',
    current: '当前套餐',
    noDowngrade: '不可降级',
    ctaFree: '免费开始',
    ctaBuy: '立即购买',
    notOpen: '暂未开放购买',
    footFree: '注册即赠 · 无需绑定支付',
    footBuy: '仅支持升级 · 不支持降级',
    note: '所有套餐购买后立即生效，积分与题目额度有效期一年；同一账号仅支持升级，不支持降级。',
    loading: '正在加载套餐…',
    empty: '暂时没有可购买的套餐'
  },
  /* 知识点绑定：按学段/学科维护，一道题可关联多个知识点 */
  knowledge: {
    label: '知识点',
    select: '关联知识点',
    title: '关联知识点',
    relTitle: '知识点关联',
    mergeHint: '随下方「存入题库 / 更新题库」一起保存',
    unsavedHint: '本题尚未存入题库，选择的知识点将在入库时一并保存',
    hint: '可多选，星标为主知识点',
    searchPlaceholder: '搜索知识点名称或别名',
    noData: '暂无知识点数据',
    loading: '加载中…',
    noResult: '没有匹配的知识点',
    selected: '已选 {count} 个',
    empty: '尚未关联知识点',
    setPrimary: '设为主知识点',
    clear: '清空',
    cancel: '取消',
    save: '保存',
    saving: '保存中…',
    saved: '知识点已保存'
  },
  search: {
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
