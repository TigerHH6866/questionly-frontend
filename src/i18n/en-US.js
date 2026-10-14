export default {
  app: {
    name: 'Questionly'
  },
  nav: {
    section: 'Workspace',
    import: 'Import Questions',
    recent: 'Recent Files',
    search: 'Search Bank',
    language: 'Language',
    settings: 'Settings',
    account: 'Not signed in'
  },
  lang: {
    zh: '中文',
    en: 'EN'
  },
  tasks: {
    list: 'Recent Files',
    detail: 'Task Detail',
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
    title: 'Import Questions',
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
    title: 'Question Processing',
    loading: 'Loading parsed result…',
    loadFailed: 'Failed to load the parsed result',
    retry: 'Retry',
    total: '{total} questions',
    questionLabel: 'Question {n}',
    empty: 'No question detected',
    analyze: 'AI Analyze',
    analyzing: 'Analyzing',
    viewAnalysis: 'View AI Analysis',
    panelTitle: 'AI Analysis',
    panelHint: 'Feel free to edit the content and save',
    close: 'Close',
    copyLatex: 'Copy LaTeX',
    copied: 'LaTeX copied',
    copyFailed: 'Copy failed, please try again',
    finish: 'Finish',
    finishTip: 'Unimported questions will not be saved after you finish',
    saveToBank: 'Save to bank',
    saving: 'Saving…',
    saved: 'Saved to bank',
    saveEmpty: 'No analysis result to save'
  },
  common: {
    confirm: 'Confirm',
    cancel: 'Cancel'
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
    password: 'Password',
    passwordPlaceholder: 'At least 8 chars, letters and digits',
    code: 'Verification code',
    codePlaceholder: 'Enter the code',
    sendCode: 'Get code',
    submitting: 'Signing in…',
    signInSuccess: 'Signed in',
    signUpPending: 'Sign up is coming soon',
    credits: 'credits',
    logout: 'Sign out',
    errEmailRequired: 'Email is required',
    errEmailFormat: 'Invalid email format',
    errPasswordRequired: 'Password is required',
    errPasswordRule: 'Password must be at least 8 chars with both letters and digits',
    errCodeRequired: 'Verification code is required'
  },
  search: {
    title: 'Search Bank',
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
