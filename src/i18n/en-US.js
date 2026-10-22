export default {
  app: {
    name: 'Questionly'
  },
  /* Landing page (public home, shares the same design tokens as the workspace) */
  landing: {
    nav: { workspace: 'Workspace', pricing: 'Pricing', guide: 'Guide' },
    login: 'Sign in',
    account: { workspace: 'Open workspace', settings: 'Settings', logout: 'Sign out' },
    cta: 'Open workspace',
    hero: {
      eyebrow: 'AI exam parsing & paper building',
      title: 'Turn a paper exam into a searchable question bank',
      sub: 'Upload a PDF, a Word file or a photo: the AI extracts stems, choices, formulas, tables and figures, then works out the subject, grade, knowledge points and skills being tested. Search it in plain language, and lay the questions you pick into an A4 paper.',
      secondary: 'See what it does',
      play: 'Play demo',
      videoHint: 'The demo video is on the way — try the workspace first'
    },
    features: {
      eyebrow: 'Two core engines',
      title: 'First get the page in, then read every question',
      sub: 'Parsing rebuilds the page; analysis understands what each question is really testing. Together they make a bank you can actually use.',
      parse: {
        title: 'File parsing',
        desc: 'Scans, photos, PDFs and Word files become structured questions — layout, formulas, tables and figures all preserved.',
        p1: 'Splits stems, choices, solutions and answers in exam order',
        p2: 'Formulas and tables kept intact, figures re-hosted in your own storage',
        p3: 'Batch upload handles documents of a hundred pages or more'
      },
      analyze: {
        title: 'AI question analysis',
        desc: 'Beyond recognition: the model reads what each question tests and fills in searchable, structured metadata.',
        p1: 'Detects subject, grade, question type and difficulty',
        p2: 'Extracts knowledge points and tested skills into structured notes',
        p3: 'Edit the result in place — saving writes it back to the bank'
      }
    },
    search: {
      eyebrow: 'Third',
      title: 'Plain-language search',
      sub: 'You do not need to memorise chapter trees. Describe the question you want the way you would say it, and the model turns that into a query.',
      p1: 'Understands intent and constraints from natural language',
      p2: 'Matches stems and solutions together for better recall',
      p3: 'Add any result to a paper in one click',
      query: 'Find a few hard questions on function monotonicity for senior one',
      r1: 'Given that f(x)=x³−3ax+1 is increasing on (1,+∞), find the range of the real number a.',
      r2: 'Let f(x)=ln x−ax. Discuss the monotonicity of f(x) and find its minimum on [1,e].',
      r3: 'If f(x)=x²−2x+a is not monotonic on (0,3), find the range of a.',
      meta: 'Math · Senior 1 · Hard',
      foot: 'Search results are AI-generated — please verify before use'
    },
    compose: {
      eyebrow: 'Fourth',
      title: 'Immersive paper building',
      sub: 'The questions you pick are paginated onto an A4 layout. Edit the text, tune formatting and switch layouts like any editor — then hand it over.',
      p1: 'Fills line by line, breaking across pages only at character boundaries',
      p2: 'Formulas and images never split across pages, one or two columns per layout',
      p3: 'Fine-tune titles, numbering, marks and formatting with live preview',
      chip: 'A4 · two columns · auto paginated'
    },
    pricing: {
      /* Plan names: shared by the plans page, pay modal and order list; prices / credits / quota always come from credits_plan */
      basic: { name: 'Basic' },
      plus: { name: 'Plus' },
      pro: { name: 'Pro' }
    },
    footer: {
      tagline: 'Turn paper exams into a searchable, assemblable question bank.',
      product: 'Product',
      learn: 'Features',
      legal: 'Legal',
      terms: 'Terms of Service',
      privacy: 'Privacy Policy',
      rights: 'All rights reserved'
    }
  },
  /* Legal pages: the body text now lives in Markdown files under src/legal, so only the page chrome stays here */
  legal: {
    updated: 'Last updated: 19 October 2026 · Effective: 19 October 2026',
    back: 'Back to home',
    terms: {
      eyebrow: 'Legal',
      title: 'Terms of Service'
    },
    privacy: {
      eyebrow: 'Legal',
      title: 'Privacy Policy'
    }
  },
  nav: {
    section: 'Workspace',
    import: 'Import New File',
    recent: 'Recent Files',
    search: 'Search Bank',
    compose: 'Paper Builder',
    resources: 'My Resources',
    language: 'Language',
    theme: 'Theme',
    themeDark: 'Switch to dark',
    themeLight: 'Switch to light',
    account: 'Not signed in',
    portal: 'Portal Home',
    upgrade: 'Upgrade Plan',
    orders: 'My Orders',
    support: 'Help & Feedback'
  },
  lang: {
    zh: '中文',
    en: 'EN'
  },
  resources: {
    tabs: {
      files: 'My Files',
      papers: 'My Papers',
      questions: 'My Questions'
    },
    total: '{total} files in total',
    empty: 'No files yet — start from "Import New File"',
    needLogin: 'Sign in to view your files',
    files: {
      cardLabel: 'File',
      questionCount: '{count} questions',
      parsed: 'Parsed',
      delete: 'Delete',
      deleteTip: 'This file record cannot be restored. Questions already saved to the bank are kept.',
      deleted: 'Deleted'
    },
    papers: {
      cardLabel: 'Paper',
      total: '{total} papers in total',
      empty: 'No papers yet — create one in "Paper Builder"',
      needLogin: 'Sign in to view your papers'
    },
    questions: {
      total: '{total} questions in total',
      empty: 'No questions yet — import a file and save them to the bank',
      needLogin: 'Sign in to view your questions',
      detail: 'View details',
      stem: 'Question'
    }
  },
  tasks: {
    list: 'Recent Files',
    refresh: 'Refresh',
    empty: 'No records yet',
    column: {
      fileName: 'File',
      status: 'Status',
      questionCount: 'Questions',
      createdAt: 'Created'
    },
    status: {
      PENDING: 'Queued',
      PARSING: 'Parsing',
      SUCCESS: 'Done',
      FAILED: 'Failed'
    }
  },
  import: {
    subtitle: 'Upload papers, images or documents to extract questions and generate analysis reports',
    drop: {
      title: 'Click to choose a file, or drag and drop it here',
      hint: 'Supports png / jpg / jpeg / doc / docx / pdf, up to 100MB per file; you can also press Ctrl+V to paste a screenshot or file'
    },
    start: 'Start recognition',
    waiting: 'Recognizing document…',
    failed: 'Recognition failed, please retry',
    timeout: 'Recognition timed out, please retry',
    retry: 'Retry',
    choose: 'Choose file',
    remove: 'Remove file',
    error: {
      type: 'Only png / jpg / jpeg / doc / docx / pdf files are supported',
      size: 'File size cannot exceed 100MB'
    },
    cards: {
      recognize: {
        title: 'Recognition',
        desc: 'Powered by MinerU OCR, precisely extracts stems, equations, tables and illustrations from papers and documents.'
      },
      analyze: {
        title: 'AI Question Analysis',
        desc: 'Analyzes subject, grade, knowledge points and tested abilities, then generates a structured analysis report.'
      },
      search: {
        title: 'AI Question Search',
        desc: 'Describe what you need in natural language; it is translated into a database query to search your bank precisely.'
      }
    }
  },
  process: {
    loading: 'Loading parsed result…',
    loadFailed: 'Failed to load the parsed result',
    retry: 'Retry',
    total: '{total} questions',
    questionLabel: 'Question {n}',
    empty: 'No question detected',
    analyze: 'AI Analyze',
    analyzing: 'Analyzing',
    viewAnalysis: 'View AI Analysis',
    bankInfo: 'View bank info',
    panelTitle: 'AI Analysis',
    panelHint: 'Feel free to edit the content and save',
    tabAnalysis: 'AI Analysis',
    tabAnswer: 'Answer',
    aiSolve: 'AI Solve',
    answerSolving: 'Solving…',
    updateBank: 'Update bank',
    updated: 'Updated',
    close: 'Close',
    copyLatex: 'Copy LaTeX',
    copied: 'LaTeX copied',
    copyFailed: 'Copy failed, please try again',
    saveToBank: 'Save to bank',
    saving: 'Saving…',
    saved: 'Saved to bank',
    saveEmpty: 'No analysis result to save',
    edit: 'Edit',
    editDone: 'Done',
    mergeUp: 'Merge up',
    delete: 'Delete',
    deleteTip: 'This question will be removed from this page and will not reappear next time; questions already saved to the bank are not deleted',
    deleteSavedTip: 'This question is already saved; deleting here will not remove the bank record',
    editSavedTip: 'This question is already saved; edits will not be written back to the bank',
    mergeSavedTip: 'Merging involves saved questions; the result will not overwrite the bank',
    splitInFormula: 'Cursor is inside a formula, cannot split here',
    fmtUnderline: 'Underline',
    fmtDot: 'Dot',
    fmtItalic: 'Italic',
    fmtBold: 'Bold'
  },
  common: {
    confirm: 'Confirm',
    cancel: 'Cancel',
    back: 'Back'
  },
  compose: {
    back: 'Back',
    new: 'New paper',
    newHint: 'Search questions from your bank and typeset a new paper',
    recent: 'Recently edited',
    empty: 'No papers yet. Click the card above to create one.',
    needLogin: 'Sign in to see your papers',
    loadFailed: 'Failed to load the paper',
    search: {
      title: 'Search questions',
      placeholder: 'Describe the questions you need, e.g. "Gua-Dou principle"',
      button: 'Search',
      insert: 'Insert',
      hint: 'Search your question bank and insert questions into the paper',
      empty: 'No matching questions'
    },
    doc: {
      placeholder: 'Search on the left and click "Insert", or start typing here',
      page: 'Page {n}'
    },
    size: {
      three: '16pt',
      four: '14pt',
      smallFour: '12pt',
      five: '10.5pt',
      smallFive: '9pt'
    },
    options: {
      paperSize: 'Paper size',
      zoom: 'Zoom',
      zoomFit: 'Fit',
      format: 'Format',
      fontSize: 'Size',
      lineHeight: 'Spacing',
      align: 'Align',
      alignLeft: 'Align left',
      alignCenter: 'Center',
      alignRight: 'Align right',
      bold: 'Bold',
      italic: 'Italic',
      underline: 'Underline',
      title: 'Title',
      titlePlaceholder: 'Paper title',
      titleRequired: 'Please enter a title',
      untitled: 'Untitled paper',
      save: 'Save',
      saving: 'Saving…',
      saved: 'Saved',
      exportPdf: 'Export PDF',
      exportWord: 'Export Word',
      exporting: 'Generating…',
      exported: 'PDF download started',
      exportedWord: 'Word download started',
      exportEmpty: 'The paper is empty. Add questions before exporting',
      exportFailed: 'Failed to generate the file, please try again'
    }
  },
  auth: {
    close: 'Close',
    signIn: 'Sign in',
    signUp: 'Sign up',
    signInTitle: 'Welcome back',
    signInSub: 'Sign in to search your question bank',
    signUpTitle: 'Create account',
    signUpSub: 'Register with your email to search and analyze questions',
    email: 'Email',
    emailPlaceholder: "you{'@'}example.com",
    signupEmailPlaceholder: 'Enter your email address',
    password: 'Password',
    passwordPlaceholder: 'At least 8 chars, letters and digits',
    signupPasswordPlaceholder: 'Set your login password',
    code: 'Verification code',
    codePlaceholder: 'Enter the code',
    sendCode: 'Get code',
    submitting: 'Signing in…',
    signingUp: 'Signing up…',
    signInSuccess: 'Signed in',
    signUpSuccess: 'Signed up — 100 credits and 20 questions added to your account',
    codeSent: 'Verification code sent, please check your inbox',
    credits: 'credits',
    questions: 'questions',
    logout: 'Sign out',
    errEmailRequired: 'Email is required',
    errEmailFormat: 'Invalid email format',
    errPasswordRequired: 'Password is required',
    errPasswordRule: 'Password must be at least 8 chars with both letters and digits',
    errCodeRequired: 'Verification code is required'
  },
  /* 支付弹窗（微信 Native 扫码支付）：套餐档位文案复用 landing.pricing 里的 name */
  pay: {
    title: 'Upgrade plan',
    sub: 'Pay by WeChat QR code — quota arrives as soon as payment succeeds',
    qrAlt: 'WeChat Pay QR code',
    current: 'Current',
    highest: 'You are already on the highest plan',
    pending: 'Waiting for payment…',
    success: 'Payment successful, plan activated',
    closed: 'Order closed, please pick a plan again',
    expired: 'QR code expired, please pick a plan again',
    failHint: 'Failed to place the order, please try again later'
  },
  /* 我的订单（套餐名复用 landing.pricing 里的 name，这里只放列表与状态文案） */
  orders: {
    needLogin: 'Sign in to view your orders',
    empty: 'No orders yet — pick a plan from the account menu',
    total: '{total} orders in total',
    repay: 'Continue payment',
    tradeNo: 'Order no.',
    createdAt: 'Created',
    paidAt: 'Paid',
    status: {
      CREATED: 'Unpaid',
      PAID: 'Paid',
      CLOSED: 'Closed',
      FAILED: 'Failed'
    }
  },
  /* Standalone plans page (/plans): tiers and prices come from the backend credits_plan table */
  plans: {
    titleLead: 'Start free.',
    titleAccent: 'Upgrade when ready.',
    sub: 'No hidden fees. AI analysis, search and paper building stay free — quota arrives with your plan and stays valid for a full year.',
    popular: 'Most popular',
    best: 'Best value',
    free: 'Free',
    perYear: '/ year',
    forever: 'Always free, no card required',
    validFor: 'Valid for {days} days',
    included: 'Included',
    current: 'Current plan',
    noDowngrade: 'Cannot downgrade',
    ctaFree: 'Create free account',
    ctaBuy: 'Buy now',
    notOpen: 'Purchases are not open yet',
    footFree: 'Granted on sign-up · No card required',
    footBuy: 'Upgrades only · No downgrades',
    note: 'Every plan takes effect immediately; credits and question quota stay valid for one year. Upgrades only — downgrades are not supported.',
    loading: 'Loading plans…',
    empty: 'No plans are available right now'
  },
  /* Knowledge point binding: organized by stage and subject, multi-select per question */
  knowledge: {
    label: 'Knowledge points',
    select: 'Choose knowledge points',
    title: 'Link knowledge points',
    relTitle: 'Knowledge links',
    mergeHint: 'Saved together with the bank button below',
    unsavedHint: 'Not saved to the bank yet — selected knowledge points will be saved together with it',
    hint: 'Select as many as needed; the starred one is primary',
    searchPlaceholder: 'Search by name or alias',
    noData: 'No knowledge points available',
    loading: 'Loading…',
    noResult: 'No matching knowledge points',
    selected: '{count} selected',
    empty: 'No knowledge points linked yet',
    setPrimary: 'Set as primary',
    clear: 'Clear all',
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving…',
    saved: 'Knowledge points saved'
  },
  search: {
    placeholder: 'Describe the questions you need, e.g. "find questions about the Gua-Dou principle"',
    send: 'Send',
    micStart: 'Voice input',
    micStop: 'Stop recording',
    micDenied: 'Microphone unavailable, please check browser permission',
    recognizing: 'Recognizing…',
    thinking: 'Searching…',
    empty: {
      desc: 'Search your question bank in natural language with AI'
    },
    found: '{total} questions found',
    none: 'No matching questions. Try different wording.',
    failed: 'Search failed, please try again',
    prev: 'Prev',
    next: 'Next',
    page: 'Page {page} / {pages}',
    delete: 'Delete',
    deleteTip: 'This question will be removed from your bank permanently',
    deleted: 'Question deleted',
    saveEdit: 'Save changes',
    saveEditEmpty: 'Analysis content cannot be empty',
    updated: 'Changes saved'
  }
}
