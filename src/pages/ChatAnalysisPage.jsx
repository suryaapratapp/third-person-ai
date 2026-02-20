import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowDown,
  ArrowRight,
  ChevronDown,
  FileUp,
  LogIn,
  MessageSquareText,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from 'lucide-react'
import AnalysisProgress from '../components/chat-analysis/AnalysisProgress'
import IntentOnboardingModal from '../components/chat-analysis/IntentOnboardingModal'
import DemoAiUnavailableModal from '../components/DemoAiUnavailableModal'
import DemoModeInfoModal from '../components/DemoModeInfoModal'
import GlassCard from '../components/GlassCard'
import MessagingAppIcon from '../components/MessagingAppIcon'
import PrivacySafetyModal from '../components/PrivacySafetyModal'
import SectionTitle from '../components/SectionTitle'
import ExportGuideModal from '../components/chat-analysis/ExportGuideModal'
import {
  APP_LABELS,
  MAX_IMPORT_FILE_SIZE_BYTES,
} from '../contracts/chatImportContract'
import { useAuth } from '../context/AuthContext'
import { useDemoMode } from '../context/DemoModeContext'
import { usePrivacy } from '../context/PrivacyContext'
import { setAnalysisClientMeta } from '../services/analysisServiceApi'
import {
  getSupportedImportModes,
  parseChatFromFile,
  parseChatFromText,
  toParticipantPair,
} from '../services/chatImportService'
import {
  createUploadSession,
  getAnalysisStatus,
  getStatus,
  pasteText,
  runAnalysis,
  uploadFile,
} from '../services/uploadSessionServiceApi'
import { runDemoAnalysis } from '../services/demoAiService'
import { getIntent, getIntentLabel, setIntent } from '../services/preferencesService'

const exportGuideImages = {
  whatsapp: [
    new URL('../assets/export-guides/whatsapp/step-1.svg', import.meta.url).href,
    new URL('../assets/export-guides/whatsapp/step-2.svg', import.meta.url).href,
    new URL('../assets/export-guides/whatsapp/step-3.svg', import.meta.url).href,
  ],
  imessage: [
    new URL('../assets/export-guides/imessage/step-1.svg', import.meta.url).href,
    new URL('../assets/export-guides/imessage/step-2.svg', import.meta.url).href,
    new URL('../assets/export-guides/imessage/step-3.svg', import.meta.url).href,
  ],
  telegram: [
    new URL('../assets/export-guides/telegram/step-1.svg', import.meta.url).href,
    new URL('../assets/export-guides/telegram/step-2.svg', import.meta.url).href,
    new URL('../assets/export-guides/telegram/step-3.svg', import.meta.url).href,
  ],
  instagram: [
    new URL('../assets/export-guides/instagram/step-1.svg', import.meta.url).href,
    new URL('../assets/export-guides/instagram/step-2.svg', import.meta.url).href,
    new URL('../assets/export-guides/instagram/step-3.svg', import.meta.url).href,
  ],
  messenger: [
    new URL('../assets/export-guides/messenger/step-1.svg', import.meta.url).href,
    new URL('../assets/export-guides/messenger/step-2.svg', import.meta.url).href,
    new URL('../assets/export-guides/messenger/step-3.svg', import.meta.url).href,
  ],
  snapchat: [
    new URL('../assets/export-guides/snapchat/step-1.svg', import.meta.url).href,
    new URL('../assets/export-guides/snapchat/step-2.svg', import.meta.url).href,
    new URL('../assets/export-guides/snapchat/step-3.svg', import.meta.url).href,
  ],
}

const supportedApps = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    exportSteps: [
      { title: 'Open a chat thread', description: 'Open the thread you want to export and tap the top menu.' },
      { title: 'Choose Export Chat', description: 'Select Export Chat and choose without media to keep file size low.' },
      { title: 'Save as text file', description: 'Share or save the exported file to your device, then upload it here.' },
    ],
  },
  {
    id: 'imessage',
    label: 'iMessage',
    exportSteps: [
      { title: 'Open Messages on Mac', description: 'Use the conversation list and open the thread to export.' },
      { title: 'Copy chat transcript', description: 'Copy chat messages and omit media attachments for clean parsing.' },
      { title: 'Paste into this app', description: 'Paste your transcript into the Paste tab to continue.' },
    ],
  },
  {
    id: 'telegram',
    label: 'Telegram',
    exportSteps: [
      { title: 'Open desktop app settings', description: 'Go to advanced settings and choose export Telegram data.' },
      { title: 'Pick selected chats', description: 'Select only needed chats and disable media exports.' },
      { title: 'Save JSON export', description: 'Upload the resulting JSON file here.' },
    ],
  },
  {
    id: 'instagram',
    label: 'Instagram',
    exportSteps: [
      { title: 'Request account data', description: 'In privacy settings request a data download for messages.' },
      { title: 'Choose JSON format', description: 'Pick JSON and avoid media if possible.' },
      { title: 'Download and upload', description: 'Upload the messages export in this flow.' },
    ],
  },
  {
    id: 'messenger',
    label: 'Messenger',
    exportSteps: [
      { title: 'Open account center', description: 'Navigate to your information download options.' },
      { title: 'Select message history', description: 'Choose messages and skip attachments.' },
      { title: 'Upload JSON file', description: 'Upload the downloaded export to continue.' },
    ],
  },
  {
    id: 'snapchat',
    label: 'Snapchat',
    exportSteps: [
      { title: 'Open My Data', description: 'Log in to My Data and select chat history.' },
      { title: 'Request export', description: 'Generate text-focused output where available.' },
      { title: 'Paste transcript', description: 'Paste exported text into the Paste tab.' },
    ],
  },
].map((app) => ({ ...app, guideImages: exportGuideImages[app.id] }))

const stepConfig = [
  { id: 1, label: 'Add chat (Upload/Paste)' },
  { id: 2, label: 'Parse & Preview' },
  { id: 3, label: 'Run Analysis' },
]

const fileHintLabels = {
  whatsapp: '.txt export',
  telegram: '.json export',
  instagram: '.json / export folder',
  messenger: '.json / export folder',
  imessage: '.csv / .txt transcript',
  snapchat: '.json export',
}

const pasteHelperExamples = [
  '[10/02/2026, 01:21] Mehak: hey\n[10/02/2026, 01:22] Surya: hi',
  'Mehak: hey\nSurya: hi',
  'Ankit: Are we meeting?\nMehak: Yes after 8\nSurya: Works for me',
]

const formatExamples = {
  whatsapp: [
    '[10/02/2026, 13:25] Alex: Are you free tonight?',
    '[10/02/2026, 13:26] Jordan: Yes, let us plan dinner.',
  ],
  imessage: [
    '[2026-02-10 13:25:10] Alex: Hey, checking in.',
    '2026-02-10 13:27:03,Jordan,Got your message.',
  ],
  telegram: [
    '{"messages":[{"date":"2026-02-10T13:25:00","from":"Alex","text":"Hi"}]}',
    '<div class="message"><div class="from_name">Alex</div><div class="text">Hi</div></div>',
  ],
  instagram: [
    '{"messages":[{"sender_name":"Alex","timestamp_ms":1770000000000,"content":"Hey"}]}',
    'ZIP: messages/inbox/<thread>/message_1.json',
  ],
  messenger: [
    '{"messages":[{"sender_name":"Jordan","timestamp_ms":1770003000000,"content":"How are you?"}]}',
    'ZIP: messages/inbox/<thread>/message_1.json',
  ],
  snapchat: [
    '{"chat_history":[{"sender":"alex_user","timestamp":"2026-02-01T10:10:10Z","content":"Hey"}]}',
    'ZIP: chat_history.json',
  ],
}

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function toAcceptAttribute(extensions) {
  if (!extensions.length) return ''
  return extensions.map((ext) => `.${ext}`).join(',')
}

function toModeBadges(appId) {
  return [fileHintLabels[appId] || '.txt export']
}

function getApiErrorStatus(error) {
  return error?.error?.status ?? null
}

function getApiErrorMessage(error, fallbackMessage) {
  return error?.error?.message || error?.message || fallbackMessage
}

function countLikelyTimestampLines(text) {
  const lines = text.split(/\r?\n/)
  const pattern = /^(\[?\d{1,4}[\/\.-]\d{1,2}[\/\.-]\d{1,4}[\],\s]+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APMapm]{2})?\]?|\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4},\s*\d{1,2}:\d{2})/
  return lines.filter((line) => pattern.test(line.trim())).length
}

function detectParticipantsFromText(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const names = new Set()
  lines.forEach((line) => {
    const bracketMatch = line.match(/^\[[^\]]+\]\s*([^:]{1,40}):\s+/)
    const dashMatch = line.match(/^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}.*-\s*([^:]{1,40}):\s+/)
    const simpleMatch = line.match(/^([^:\[\]-]{1,40}):\s+.+/)
    const candidate = bracketMatch?.[1] || dashMatch?.[1] || simpleMatch?.[1] || ''
    if (!candidate) return
    const value = candidate.replace(/\s+/g, ' ').trim()
    if (value && value.length > 1) names.add(value)
  })
  return [...names].slice(0, 8)
}

function buildDemoInputText(activeTab, chatText, importResult) {
  if (activeTab === 'paste') return chatText.trim()
  const rows = Array.isArray(importResult?.messages) && importResult.messages.length
    ? importResult.messages
    : Array.isArray(importResult?.sample)
      ? importResult.sample
      : []

  if (!rows.length) return ''

  return rows
    .map((item) => {
      const stamp = item.timestampISO ? `[${item.timestampISO}] ` : ''
      const sender = item.sender ? `${item.sender}: ` : ''
      return `${stamp}${sender}${item.text || ''}`.trim()
    })
    .join('\n')
}

export default function ChatAnalysisPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    enabled: demoModeEnabled,
    consent: demoModeConsent,
    fullTextSessionEnabled,
    setConsent: setDemoModeConsent,
    setEnabled: setDemoModeEnabled,
    setFullTextSessionEnabled,
  } = useDemoMode()
  const { hideNames, maskSensitiveInfo } = usePrivacy()
  const userId = user?.email ?? null
  const [selectedApp, setSelectedApp] = useState('')
  const [openGuideApp, setOpenGuideApp] = useState(null)
  const [activeTab, setActiveTab] = useState('upload')
  const [selectedFile, setSelectedFile] = useState(null)
  const [chatText, setChatText] = useState('')
  const [importResult, setImportResult] = useState(null)
  const [errors, setErrors] = useState({ sourceApp: '', file: '', text: '', import: '', run: '' })
  const [isParsing, setIsParsing] = useState(false)
  const [progressState, setProgressState] = useState('Reading patterns')
  const [isRunning, setIsRunning] = useState(false)
  const [parseFailure, setParseFailure] = useState(null)
  const [latestAnalysisId, setLatestAnalysisId] = useState('')
  const [uploadSessionId, setUploadSessionId] = useState('')
  const [lastPastedSyncText, setLastPastedSyncText] = useState('')
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false)
  const [intent, setIntentState] = useState(() => getIntent(userId))
  const [isChangeFocusOpen, setIsChangeFocusOpen] = useState(false)
  const [isFormatsOpen, setIsFormatsOpen] = useState(false)
  const [isPasteExamplesOpen, setIsPasteExamplesOpen] = useState(false)
  const [pasteTimeline, setPasteTimeline] = useState('')
  const [timelineStartDate, setTimelineStartDate] = useState('')
  const [timelineEndDate, setTimelineEndDate] = useState('')
  const [isMissingDetailsOpen, setIsMissingDetailsOpen] = useState(false)
  const [manualParticipants, setManualParticipants] = useState(['', ''])
  const [isDemoInfoOpen, setIsDemoInfoOpen] = useState(false)
  const [demoConsentRequired, setDemoConsentRequired] = useState(false)
  const [pendingRunAfterConsent, setPendingRunAfterConsent] = useState(false)
  const [demoFailureState, setDemoFailureState] = useState({
    open: false,
    message: '',
  })

  useEffect(() => {
    setIntentState(getIntent(userId))
  }, [userId])

  useEffect(() => {
    if (!pendingRunAfterConsent || !demoModeConsent || isRunning) return
    setPendingRunAfterConsent(false)
    setDemoConsentRequired(false)
    setIsDemoInfoOpen(false)
    void handleRunAnalysis()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoModeConsent, pendingRunAfterConsent, isRunning])

  const selectedAppData = useMemo(
    () => supportedApps.find((app) => app.id === selectedApp) ?? null,
    [selectedApp],
  )

  const modes = useMemo(() => getSupportedImportModes(selectedApp), [selectedApp])
  const canUseFile = Boolean(selectedApp && modes.file)
  const canUsePaste = true
  const pasteTimestampMatches = useMemo(() => countLikelyTimestampLines(chatText), [chatText])
  const pastedParticipants = useMemo(() => detectParticipantsFromText(chatText), [chatText])
  const hasManualParticipants = manualParticipants.filter((value) => value.trim()).length >= 2
  const hasManualTimeline =
    Boolean(pasteTimeline) &&
    (pasteTimeline !== 'more' || (timelineStartDate && timelineEndDate))

  useEffect(() => {
    if (!selectedApp && activeTab === 'paste') return

    if (activeTab === 'upload' && !modes.file && modes.paste) {
      setActiveTab('paste')
    }

    if (activeTab === 'paste' && !modes.paste && modes.file) {
      setActiveTab('upload')
    }
  }, [activeTab, modes.file, modes.paste, selectedApp])

  useEffect(() => {
    if (activeTab !== 'paste') return undefined
    if (!canUsePaste) return undefined

    const trimmed = chatText.trim()
    if (!trimmed) {
      setImportResult(null)
      setErrors((prev) => ({ ...prev, text: '', import: '', run: '' }))
      return undefined
    }

    let canceled = false
    setIsParsing(true)
    const timeoutId = window.setTimeout(async () => {
      try {
        const parsed = await parseChatFromText(selectedApp || 'universal', trimmed)
        if (canceled) return

        if (!parsed.stats.messageCount) {
          setImportResult(null)
          setErrors((prev) => ({
            ...prev,
            text: '',
            import: 'No messages detected. Try a different export or paste text.',
            run: '',
          }))
          return
        }

        setImportResult(parsed)
        setErrors((prev) => ({ ...prev, text: '', import: '', run: '' }))
      } catch (error) {
        if (canceled) return
        setImportResult(null)
        setErrors((prev) => ({
          ...prev,
          text: '',
          import: error?.message || 'Unable to parse this pasted text right now.',
          run: '',
        }))
      } finally {
        if (!canceled) setIsParsing(false)
      }
    }, 320)

    return () => {
      canceled = true
      window.clearTimeout(timeoutId)
      setIsParsing(false)
    }
  }, [activeTab, canUsePaste, chatText, selectedApp])

  useEffect(() => {
    if (activeTab !== 'paste') return
    if (!importResult || !chatText.trim()) return
    if (chatText.trim() === lastPastedSyncText) return

    let cancelled = false

    async function syncPaste() {
      try {
        setParseFailure(null)
        const sessionId = await ensureUploadSession()
        if (!sessionId || cancelled) return
        await pasteText(sessionId, chatText.trim())
        if (cancelled) return
        setLastPastedSyncText(chatText.trim())
        await pollUploadSessionStatus(sessionId)
      } catch (error) {
        if (!cancelled) {
          const status = getApiErrorStatus(error)
          if (status === 422 && error?.error?.data?.error === 'ParseFailed') {
            setParseFailure(error.error.data)
            setErrors((prev) => ({
              ...prev,
              import: 'We could not parse this export. Review the guidance below.',
            }))
            return
          }

          if (status === 401 || status === 403) {
            setErrors((prev) => ({ ...prev, import: 'Session expired. Please sign in again.' }))
            return
          }

          if (status === 429) {
            setErrors((prev) => ({ ...prev, import: 'Too many requests. Waiting a moment...' }))
            return
          }

          setErrors((prev) => ({
            ...prev,
            import: getApiErrorMessage(error, 'Unable to sync pasted text to backend.'),
          }))
        }
      }
    }

    void syncPaste()

    return () => {
      cancelled = true
    }
  }, [activeTab, chatText, importResult, lastPastedSyncText, selectedApp])

  const ensureUploadSession = async () => {
    if (uploadSessionId) return uploadSessionId
    const sourceApp = selectedApp || 'whatsapp'
    try {
      const session = await createUploadSession(sourceApp)
      setUploadSessionId(session.id)
      return session.id
    } catch (error) {
      const status = getApiErrorStatus(error)
      if (status === 401 || status === 403) {
        setErrors((prev) => ({ ...prev, run: 'Session expired. Please sign in again.' }))
        return null
      }

      setErrors((prev) => ({
        ...prev,
        run: getApiErrorMessage(error, 'Unable to create upload session.'),
      }))
      return null
    }
  }

  const pollUploadSessionStatus = async (sessionId) => {
    let delayMs = 2000

    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        const payload = await getStatus(sessionId)
        const status = payload?.session?.status

        if (status === 'PARSED') {
          const reportCount = Number(payload?.parseReport?.parsedCount ?? 0)
          if ((!importResult || importResult.stats.messageCount < reportCount) && reportCount > 0) {
            setImportResult((prev) => ({
              ...(prev || {
                participants: [],
                messages: [],
                stats: {},
                warnings: [],
                sample: [],
              }),
              participants: Array.isArray(payload?.parseReport?.participants)
                ? payload.parseReport.participants
                : prev?.participants || [],
              stats: {
                ...(prev?.stats || {}),
                messageCount: reportCount,
                participantCount: Array.isArray(payload?.parseReport?.participants)
                  ? payload.parseReport.participants.length
                  : prev?.stats?.participantCount || 0,
              },
              warnings: Array.isArray(payload?.parseReport?.warnings)
                ? payload.parseReport.warnings
                : prev?.warnings || [],
            }))
          }
          setParseFailure(null)
          return true
        }

        if (status === 'FAILED') {
          setErrors((prev) => ({
            ...prev,
            import: 'Parsing failed on the server. Please try a different export.',
          }))
          return false
        }
      } catch (error) {
        const status = getApiErrorStatus(error)
        if (status === 401 || status === 403) {
          setErrors((prev) => ({ ...prev, import: 'Session expired. Please sign in again.' }))
          return false
        }

        if (status === 429) {
          setErrors((prev) => ({ ...prev, import: 'Too many requests. Waiting a moment...' }))
          await new Promise((resolve) => window.setTimeout(resolve, delayMs))
          delayMs = Math.min(delayMs * 2, 10000)
          continue
        }

        if (status === 422) {
          const parseData = error?.error?.data
          if (parseData?.error === 'ParseFailed') {
            setParseFailure(parseData)
            setErrors((prev) => ({
              ...prev,
              import: 'We could not parse this export. Review the guidance below.',
            }))
            return false
          }
        }

        setErrors((prev) => ({
          ...prev,
          import: getApiErrorMessage(error, 'Unable to check parse status right now.'),
        }))
        return false
      }

      await new Promise((resolve) => window.setTimeout(resolve, delayMs))
      delayMs = Math.min(delayMs * 2, 10000)
    }
    return false
  }

  const handleAppSelect = (appId) => {
    setSelectedApp(appId)
    setOpenGuideApp(null)
    setLatestAnalysisId('')
    setSelectedFile(null)
    setChatText('')
    setImportResult(null)
    setUploadSessionId('')
    setLastPastedSyncText('')
    setParseFailure(null)
    setPasteTimeline('')
    setTimelineStartDate('')
    setTimelineEndDate('')
    setManualParticipants(['', ''])
    setIsMissingDetailsOpen(false)
    setErrors({ sourceApp: '', file: '', text: '', import: '', run: '' })
  }

  const parseSelectedFile = async (file) => {
    if (!selectedApp) {
      setErrors((prev) => ({ ...prev, sourceApp: 'Select a messaging app to begin.' }))
      return
    }

    if (!canUseFile) {
      setErrors((prev) => ({ ...prev, file: `File upload for ${APP_LABELS[selectedApp]} coming soon.` }))
      return
    }

    setIsParsing(true)
    try {
      setParseFailure(null)
      const parsed = await parseChatFromFile(selectedApp, file)
      const sessionId = await ensureUploadSession()
      if (sessionId) {
        await uploadFile(sessionId, file)
        const parsedOnServer = await pollUploadSessionStatus(sessionId)
        if (!parsedOnServer) return
      }

      const serverPendingPreview = parsed.warnings?.some((warning) => warning.includes('Server parse pending'))

      if (!parsed.stats.messageCount && !serverPendingPreview) {
        setImportResult(null)
        setErrors((prev) => ({
          ...prev,
          file: '',
          import: 'No messages detected. Try a different export or paste text.',
          run: '',
        }))
        return
      }

      setImportResult(parsed)
      setErrors((prev) => ({ ...prev, file: '', import: '', run: '' }))
    } catch (error) {
      const status = getApiErrorStatus(error)
      if (status === 422 && error?.error?.data?.error === 'ParseFailed') {
        setParseFailure(error.error.data)
        setImportResult(null)
        setErrors((prev) => ({
          ...prev,
          file: '',
          import: 'We could not parse this export. Review the guidance below.',
          run: '',
        }))
        return
      }

      if (status === 401 || status === 403) {
        setImportResult(null)
        setErrors((prev) => ({
          ...prev,
          file: 'Session expired. Please sign in again.',
          import: '',
          run: '',
        }))
        return
      }

      if (status === 429) {
        setImportResult(null)
        setErrors((prev) => ({
          ...prev,
          file: 'Too many requests. Waiting a moment...',
          import: '',
          run: '',
        }))
        return
      }

      setImportResult(null)
      setErrors((prev) => ({
        ...prev,
        file: getApiErrorMessage(error, 'Unable to parse this file right now.'),
        import: '',
        run: '',
      }))
    } finally {
      setIsParsing(false)
    }
  }

  const handleFileSelect = (file) => {
    if (!file) return

    setLatestAnalysisId('')
    setParseFailure(null)
    setSelectedFile(file)
    setErrors((prev) => ({ ...prev, file: '', import: '', run: '' }))

    if (file.size > MAX_IMPORT_FILE_SIZE_BYTES) {
      setImportResult(null)
      setErrors((prev) => ({
        ...prev,
        file: 'File is too large. Please upload a file under 10MB.',
      }))
      return
    }

    void parseSelectedFile(file)
  }

  const handleDrop = (event) => {
    event.preventDefault()
    const file = event.dataTransfer?.files?.[0]
    handleFileSelect(file)
  }

  const canRunAnalysis =
    (activeTab === 'upload'
      ? Boolean(selectedFile) && Boolean(selectedApp)
      : chatText.trim().length >= 200) &&
    !isRunning &&
    !isParsing

  const progressSteps = [
    'Reading patterns',
    'Mapping emotions',
    'Identifying dynamics',
    'Generating insights',
    'Preparing dashboard',
  ]

  const currentStep = useMemo(() => {
    if (isRunning || latestAnalysisId) return 3
    if (importResult?.stats?.messageCount) return 2
    return 1
  }, [importResult?.stats?.messageCount, isRunning, latestAnalysisId])

  const setClientMetaForAnalysis = (analysisId) => {
    const participantPair = toParticipantPair(
      importResult?.participants?.length
        ? importResult.participants
        : manualParticipants.filter((value) => value.trim()),
    )
    setAnalysisClientMeta(analysisId, {
      participants: importResult?.participants || manualParticipants.filter((value) => value.trim()),
      intent,
      privacy: {
        hideNamesUsed: hideNames,
        maskSensitiveUsed: maskSensitiveInfo,
      },
      inputMethod: activeTab,
      inputMeta: {
        fileName: selectedFile?.name || null,
        fileSize: selectedFile?.size || null,
        textLength: activeTab === 'paste' ? chatText.trim().length : 0,
      },
      dateRange: {
        startDateISO: importResult?.stats?.startDateISO || timelineStartDate || null,
        endDateISO: importResult?.stats?.endDateISO || timelineEndDate || null,
        estimatedDays: importResult?.stats?.estimatedDays || null,
        timelineHint:
          activeTab === 'paste'
            ? pasteTimeline || null
            : null,
      },
      warnings: importResult?.warnings || [],
      participantPair,
      manualDetails: {
        participants: manualParticipants.filter((value) => value.trim()),
        manualDateRange: {
          preset: pasteTimeline || null,
          start: timelineStartDate || null,
          end: timelineEndDate || null,
        },
      },
    })
  }

  const runBackendAnalysisFlow = async () => {
    try {
      const sessionId = await ensureUploadSession()
      if (!sessionId) {
        setErrors((prev) => ({ ...prev, run: 'Unable to create upload session.' }))
        return
      }

      const run = await runAnalysis(sessionId)
      const analysisId = run.analysisRunId

      setClientMetaForAnalysis(analysisId)

      let progressIndex = 0
      setProgressState(progressSteps[progressIndex])
      let delayMs = 2000

      for (let attempt = 0; attempt < 90; attempt += 1) {
        let status
        try {
          status = await getAnalysisStatus(analysisId)
        } catch (error) {
          const errorStatus = getApiErrorStatus(error)
          if (errorStatus === 401 || errorStatus === 403) {
            setErrors((prev) => ({ ...prev, run: 'Session expired. Please sign in again.' }))
            break
          }

          if (errorStatus === 429) {
            setErrors((prev) => ({ ...prev, run: 'Too many requests. Waiting a moment...' }))
            await new Promise((resolve) => window.setTimeout(resolve, delayMs))
            delayMs = Math.min(delayMs * 2, 10000)
            continue
          }

          setErrors((prev) => ({
            ...prev,
            run: getApiErrorMessage(error, 'Unable to check analysis status right now.'),
          }))
          break
        }

        if (status.status === 'COMPLETED' || status.status === 'READY') {
          setProgressState(progressSteps[4])
          setLatestAnalysisId(analysisId)
          break
        }

        if (status.status === 'FAILED') {
          setErrors((prev) => ({
            ...prev,
            run: 'Analysis failed. Please try again with a different export.',
          }))
          break
        }

        if (progressIndex < progressSteps.length - 1) {
          progressIndex += 1
          setProgressState(progressSteps[progressIndex])
        }

        await new Promise((resolve) => window.setTimeout(resolve, delayMs))
        delayMs = Math.min(delayMs * 2, 10000)
      }
    } catch (error) {
      const status = getApiErrorStatus(error)
      if (status === 401 || status === 403) {
        setErrors((prev) => ({ ...prev, run: 'Session expired. Please sign in again.' }))
      } else if (status === 429) {
        setErrors((prev) => ({ ...prev, run: 'Too many requests. Waiting a moment...' }))
      } else {
        setErrors((prev) => ({
          ...prev,
          run: getApiErrorMessage(error, 'Unable to run analysis right now.'),
        }))
      }
    }
  }

  const runDemoAnalysisFlow = async () => {
    let progressIndex = 0
    setProgressState(progressSteps[progressIndex])

    const progressTimer = window.setInterval(() => {
      progressIndex = Math.min(progressIndex + 1, progressSteps.length - 1)
      setProgressState(progressSteps[progressIndex])
    }, 1000)

    try {
      const manualParticipantNames = manualParticipants.map((value) => value.trim()).filter(Boolean)
      const inputText = buildDemoInputText(activeTab, chatText, importResult)
      if (!inputText) {
        setErrors((prev) => ({
          ...prev,
          run: 'Add more chat content so Demo Mode can generate insights.',
        }))
        return
      }

      const analysis = await runDemoAnalysis({
        inputText,
        sourceApp: activeTab === 'paste' ? selectedApp || 'paste' : selectedApp,
        intent,
        inputMethod: activeTab,
        manualParticipants: manualParticipantNames,
        manualDateRange: {
          preset: pasteTimeline || undefined,
          start: timelineStartDate || undefined,
          end: timelineEndDate || undefined,
        },
        sendFullText: Boolean(fullTextSessionEnabled),
        privacy: {
          hideNamesUsed: hideNames,
          maskSensitiveUsed: maskSensitiveInfo,
        },
      })

      setProgressState(progressSteps[4])
      setLatestAnalysisId(analysis.id)
    } catch (error) {
      if (error?.code === 'DEMO_CONSENT_REQUIRED') {
        setPendingRunAfterConsent(true)
        setDemoConsentRequired(true)
        setIsDemoInfoOpen(true)
        return
      }

      setErrors((prev) => ({
        ...prev,
        run: 'Demo AI unavailable right now.',
      }))
      setDemoFailureState({
        open: true,
        message: error?.message || 'Demo AI unavailable right now.',
      })
    } finally {
      window.clearInterval(progressTimer)
    }
  }

  const handleRunAnalysis = async (options = {}) => {
    const nextErrors = { sourceApp: '', file: '', text: '', import: '', run: '' }

    if (activeTab === 'upload' && !selectedApp) {
      nextErrors.sourceApp = 'Pick an app first so we can parse correctly.'
    }

    if (activeTab === 'upload' && !selectedFile) {
      nextErrors.run = 'Select an export file before running analysis.'
    }
    if (activeTab === 'paste' && chatText.trim().length < 200) {
      nextErrors.run = 'Paste a bit more text for meaningful insights.'
    }

    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) return

    if (demoModeEnabled && !options.forceMock && !demoModeConsent) {
      setPendingRunAfterConsent(true)
      setDemoConsentRequired(true)
      setIsDemoInfoOpen(true)
      return
    }

    setIsRunning(true)
    setLatestAnalysisId('')
    setProgressState('Reading patterns')

    try {
      if (demoModeEnabled && !options.forceMock) {
        await runDemoAnalysisFlow()
      } else {
        if (demoModeEnabled && options.forceMock) {
          setErrors((prev) => ({
            ...prev,
            run: '',
          }))
        }
        await runBackendAnalysisFlow()
      }
    } finally {
      setIsRunning(false)
    }
  }

  const uploadDisabledReason = !selectedApp
    ? 'Select a messaging app to begin'
    : !modes.file
      ? `File upload for ${selectedAppData?.label ?? 'this app'} coming soon`
      : ''

  const pasteDisabledReason = ''

  return (
    <main className="px-4 pb-14 pt-8 sm:px-6 lg:px-8">
      <IntentOnboardingModal
        open={!intent || isChangeFocusOpen}
        canDismiss={Boolean(intent)}
        onDismiss={() => setIsChangeFocusOpen(false)}
        onSelect={(selectedIntent) => {
          setIntent(selectedIntent, userId)
          setIntentState(selectedIntent)
          setIsChangeFocusOpen(false)
        }}
      />
      <section className="mx-auto max-w-6xl">
        <SectionTitle
          eyebrow="Chat Analysis"
          title="Upload or paste chats and generate relationship insights"
          subtitle="Select source app, parse the import locally, validate preflight stats, then run analysis."
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-cyan-200/30 bg-cyan-300/10 px-3 py-1 text-xs font-medium text-cyan-100">
            Intent: {getIntentLabel(intent) ?? 'Not set'}
          </span>
          <button
            type="button"
            onClick={() => setIsChangeFocusOpen(true)}
            className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium text-slate-100 transition hover:bg-white/15"
          >
            Change intent
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-white/15 bg-slate-950/40 p-3 sm:p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-100/80">Analysis Flow</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            {stepConfig.map((step, index) => {
              const active = currentStep === step.id
              const complete = currentStep > step.id
              return (
                <div key={step.id} className="flex items-center gap-2 sm:flex-1">
                  <div
                    className={`w-full rounded-xl border px-3 py-2 text-xs sm:text-sm ${
                      active
                        ? 'border-cyan-200/45 bg-cyan-300/10 text-cyan-100'
                        : complete
                          ? 'border-emerald-200/35 bg-emerald-300/10 text-emerald-100'
                          : 'border-white/15 bg-slate-900/60 text-slate-100/75'
                    }`}
                  >
                    <p className="font-semibold">Step {step.id}</p>
                    <p className="mt-1">{step.label}</p>
                  </div>
                  {index < stepConfig.length - 1 ? (
                    <>
                      <ArrowRight className="hidden h-4 w-4 text-cyan-100/70 drop-shadow-[0_0_8px_rgba(34,211,238,0.35)] sm:block" />
                      <ArrowDown className="h-4 w-4 text-cyan-100/70 drop-shadow-[0_0_8px_rgba(34,211,238,0.35)] sm:hidden" />
                    </>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl">
        <GlassCard className={`border-white/15 bg-slate-950/45 p-5 transition sm:p-6 ${activeTab === 'paste' ? 'opacity-70' : ''}`}>
          <h2 className="text-lg font-semibold text-white">Supported Messaging Apps</h2>
          <p className="mt-1 text-sm text-slate-100/75">
            {activeTab === 'paste'
              ? 'Paste works with any chat format. App selection is optional in this mode.'
              : 'Choose an app for upload parsing.'}
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {supportedApps.map((app) => {
              const modeBadges = toModeBadges(app.id)
              const isSelected = selectedApp === app.id
              return (
                <div
                  key={app.id}
                  className={`rounded-xl border p-3 transition ${
                    isSelected ? 'border-cyan-200/50 bg-cyan-300/10' : 'border-white/15 bg-slate-900/50'
                  }`}
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 text-left"
                    onClick={() => handleAppSelect(app.id)}
                  >
                    <MessagingAppIcon app={app.id} className="h-10 w-10" size={22} />
                    <span className="text-sm font-semibold text-white">{app.label}</span>
                  </button>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {modeBadges.map((badge) => (
                      <span
                        key={`${app.id}-${badge}`}
                        className="rounded-full border border-cyan-200/30 bg-cyan-300/10 px-2 py-1 text-[11px] font-medium text-cyan-100/90"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="mt-3 inline-flex items-center rounded-full border border-cyan-200/35 bg-gradient-to-r from-cyan-300/15 via-violet-300/15 to-rose-300/15 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-cyan-900/20 transition hover:brightness-110"
                    onClick={() => setOpenGuideApp(app)}
                  >
                    Export steps
                  </button>
                </div>
              )
            })}
          </div>
          {errors.sourceApp ? <p className="mt-2 text-xs text-rose-200">{errors.sourceApp}</p> : null}
        </GlassCard>
      </section>

      <section className="mx-auto mt-6 max-w-6xl">
        <GlassCard className="border-white/15 bg-slate-950/45 p-5 sm:p-6">
          <div className="inline-flex rounded-xl border border-white/15 bg-slate-900/60 p-1">
            <button
              type="button"
              title={uploadDisabledReason || 'Upload export file'}
              onClick={() => {
                setActiveTab('upload')
                if (!selectedApp) {
                  setErrors((prev) => ({ ...prev, sourceApp: 'Pick an app first so we can parse correctly.' }))
                }
              }}
              disabled={Boolean(selectedApp && !canUseFile)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                activeTab === 'upload'
                  ? 'bg-white text-indigo-700'
                  : 'text-slate-100/85 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45'
              }`}
            >
              Upload Export File
            </button>
            <button
              type="button"
              title={pasteDisabledReason || 'Paste chat text'}
              onClick={() => setActiveTab('paste')}
              disabled={false}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                activeTab === 'paste'
                  ? 'bg-white text-indigo-700'
                  : 'text-slate-100/85 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45'
              }`}
            >
              Paste Chat Text
            </button>
          </div>

          <div className="mt-4 rounded-xl border border-white/15 bg-slate-900/45">
            <button
              type="button"
              onClick={() => setIsFormatsOpen((value) => !value)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              aria-expanded={isFormatsOpen}
            >
              <div>
                <p className="text-sm font-semibold text-white">Supported formats</p>
                <p className="mt-1 text-xs text-slate-100/70">
                  {selectedApp
                    ? `${APP_LABELS[selectedApp]} accepted: ${
                      modes.acceptedExtensions.length ? `.${modes.acceptedExtensions.join(', .')}` : 'Paste only'
                    }`
                    : 'Select an app to see recommended format examples'}
                </p>
              </div>
              <ChevronDown className={`h-4 w-4 text-slate-100/80 transition ${isFormatsOpen ? 'rotate-180' : ''}`} />
            </button>
            {isFormatsOpen ? (
              <div className="border-t border-white/10 px-4 py-3">
                {(selectedApp ? formatExamples[selectedApp] : []).map((example, index) => (
                  <div key={`${selectedApp}-example-${index}`} className="mt-2 rounded-lg border border-white/10 bg-slate-950/50 p-2">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-cyan-100/75">Example {index + 1}</p>
                    <p className="mt-1 break-words font-mono text-[11px] text-slate-100/85">{example}</p>
                  </div>
                ))}
                {selectedApp ? (
                  <p className="mt-2 text-xs text-slate-100/70">Use text-focused exports and avoid media attachments when possible.</p>
                ) : null}
              </div>
            ) : null}
          </div>

          {!selectedApp && activeTab === 'upload' ? (
            <div className="mt-4 rounded-xl border border-dashed border-white/20 bg-slate-900/45 p-4 text-sm text-slate-100/75">
              Pick an app first so we can parse correctly.
            </div>
          ) : null}

          {selectedApp && activeTab === 'upload' ? (
            <div className="mt-4">
              <label
                htmlFor="chat-file"
                onDrop={canUseFile ? handleDrop : undefined}
                onDragOver={canUseFile ? (event) => event.preventDefault() : undefined}
                className={`flex flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-10 text-center transition ${
                  canUseFile
                    ? 'cursor-pointer border-white/25 bg-slate-900/40 hover:bg-slate-900/65'
                    : 'cursor-not-allowed border-white/15 bg-slate-900/20 opacity-60'
                }`}
              >
                <UploadCloud className="h-8 w-8 text-cyan-100" />
                <p className="mt-3 text-sm font-semibold text-white">Drop file here or click to browse</p>
                <p className="mt-1 text-xs text-slate-100/70">
                  {modes.acceptedExtensions.length
                    ? `Accepted format: .${modes.acceptedExtensions.join(', .')}`
                    : 'File import for this app is coming soon'}
                </p>
              </label>

              <input
                id="chat-file"
                type="file"
                accept={toAcceptAttribute(modes.acceptedExtensions)}
                className="hidden"
                disabled={!canUseFile}
                onChange={(event) => handleFileSelect(event.target.files?.[0])}
              />

              {selectedFile ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/15 bg-slate-950/60 p-3">
                  <div className="flex items-center gap-3">
                    <FileUp className="h-5 w-5 text-cyan-100" />
                    <div>
                      <p className="text-sm font-medium text-white">{selectedFile.name}</p>
                      <p className="text-xs text-slate-100/70">{formatBytes(selectedFile.size)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-slate-100 transition hover:bg-white/10"
                    onClick={() => {
                      setSelectedFile(null)
                      setImportResult(null)
                      setErrors((prev) => ({ ...prev, file: '', import: '', run: '' }))
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              ) : null}
              {errors.file ? <p className="mt-2 text-xs text-rose-200">{errors.file}</p> : null}
            </div>
          ) : null}

          {activeTab === 'paste' ? (
            <div className="mt-4">
              <div className="mb-3 rounded-xl border border-white/15 bg-slate-900/55 p-3">
                <p className="text-sm font-semibold text-white">Format helper</p>
                <p className="mt-1 text-xs text-slate-100/75">
                  Paste any conversation text. Works best with speaker names and timestamps, but optional.
                </p>
                <button
                  type="button"
                  onClick={() => setIsPasteExamplesOpen((value) => !value)}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-cyan-100 transition hover:underline"
                >
                  Show example formats
                  <ChevronDown className={`h-3.5 w-3.5 transition ${isPasteExamplesOpen ? 'rotate-180' : ''}`} />
                </button>
                {isPasteExamplesOpen ? (
                  <div className="mt-2 space-y-2">
                    {pasteHelperExamples.map((example, index) => (
                      <pre key={`paste-example-${index}`} className="overflow-x-auto rounded-lg border border-white/10 bg-slate-950/55 p-2 text-[11px] text-slate-100/85">{example}</pre>
                    ))}
                  </div>
                ) : null}
              </div>

              <textarea
                value={chatText}
                onChange={(event) => {
                  setChatText(event.target.value)
                  setLatestAnalysisId('')
                  setErrors((prev) => ({ ...prev, text: '', import: '', run: '' }))
                }}
                rows={10}
                placeholder="Paste chat text here. Include timestamps and speaker names when available."
                className="w-full rounded-2xl border border-white/20 bg-slate-900/60 px-4 py-3 text-sm text-white outline-none ring-cyan-200/60 transition focus:ring"
              />
              <div className="mt-2 flex items-center justify-between text-xs text-slate-100/70">
                <span>Paste mode works with any chat format.</span>
                <span>{chatText.length} characters</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-cyan-200/30 bg-cyan-300/10 px-2.5 py-1 text-xs font-medium text-cyan-100">
                  {pastedParticipants.length > 2
                    ? `Group chat: ${pastedParticipants.length} detected`
                    : `Participants: ${pastedParticipants.length} detected`}
                </span>
                {pastedParticipants.length > 0 ? (
                  <span className="text-xs text-slate-100/70">{pastedParticipants.slice(0, 4).join(', ')}</span>
                ) : null}
              </div>
              {pastedParticipants.length === 1 ? (
                <p className="mt-1 text-xs text-amber-100">We need at least 2 people (or distinct speaker labels) for best results.</p>
              ) : null}
              <p className="mt-1 text-xs text-slate-100/70">
                Preflight: detected {pasteTimestampMatches} likely timestamped lines.
                {pasteTimestampMatches < 3 ? ' Add more timestamped lines for reliable parsing.' : ''}
              </p>

              <div className="mt-3 rounded-xl border border-white/15 bg-slate-900/55">
                <button
                  type="button"
                  onClick={() => setIsMissingDetailsOpen((value) => !value)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                  aria-expanded={isMissingDetailsOpen}
                >
                  <div>
                    <p className="text-sm font-semibold text-white">Add missing details (optional)</p>
                    <p className="mt-1 text-xs text-slate-100/75">
                      If your pasted text does not include names or dates, add them here. Otherwise we will infer during analysis.
                    </p>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-slate-100/80 transition ${isMissingDetailsOpen ? 'rotate-180' : ''}`} />
                </button>
                {isMissingDetailsOpen ? (
                  <div className="border-t border-white/10 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/80">Participant names</p>
                    <p className="mt-1 text-xs text-slate-100/75">Use first names or nicknames.</p>
                    <div className="mt-2 space-y-2">
                      {manualParticipants.map((value, index) => (
                        <input
                          key={`manual-participant-${index}`}
                          value={value}
                          onChange={(event) => {
                            const next = [...manualParticipants]
                            next[index] = event.target.value
                            setManualParticipants(next)
                          }}
                          placeholder={index === 0 ? 'Person A' : index === 1 ? 'Person B' : `Person ${index + 1}`}
                          className="h-9 w-full rounded-lg border border-white/15 bg-slate-950/65 px-3 text-xs text-white outline-none ring-cyan-200/60 transition focus:ring"
                        />
                      ))}
                      <button
                        type="button"
                        onClick={() => setManualParticipants((prev) => [...prev, ''])}
                        className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium text-slate-100 transition hover:bg-white/10"
                      >
                        + Add person
                      </button>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/80">Approx date range</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {[
                          { value: 'days', label: '1-3 days' },
                          { value: 'weeks', label: '1-3 weeks' },
                          { value: 'month', label: '1 month' },
                          { value: 'more', label: 'More / custom' },
                        ].map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setPasteTimeline(option.value)}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                              pasteTimeline === option.value
                                ? 'border-cyan-200/40 bg-cyan-300/10 text-cyan-100'
                                : 'border-white/20 bg-white/5 text-slate-100/85 hover:bg-white/10'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                      {pasteTimeline === 'more' ? (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <label className="text-xs text-slate-100/80">
                            Start date
                            <input
                              type="date"
                              value={timelineStartDate}
                              onChange={(event) => setTimelineStartDate(event.target.value)}
                              className="mt-1 h-9 w-full rounded-lg border border-white/15 bg-slate-950/65 px-2 text-xs text-white outline-none"
                            />
                          </label>
                          <label className="text-xs text-slate-100/80">
                            End date
                            <input
                              type="date"
                              value={timelineEndDate}
                              onChange={(event) => setTimelineEndDate(event.target.value)}
                              className="mt-1 h-9 w-full rounded-lg border border-white/15 bg-slate-950/65 px-2 text-xs text-white outline-none"
                            />
                          </label>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
              {errors.text ? <p className="mt-2 text-xs text-rose-200">{errors.text}</p> : null}
            </div>
          ) : null}

          {isParsing ? <p className="mt-3 text-xs text-cyan-100/90">Parsing import...</p> : null}
          {errors.import ? (
            <div
              className={`mt-3 rounded-xl border p-3 text-xs ${
                errors.import.includes('Session expired')
                  ? 'border-rose-200/35 bg-rose-300/10 text-rose-100'
                  : errors.import.includes('Too many requests')
                    ? 'border-amber-200/35 bg-amber-300/10 text-amber-100'
                    : 'border-rose-200/30 bg-rose-300/10 text-rose-100'
              }`}
            >
              <p>{errors.import.includes('Too many requests') ? "We're waiting a moment before retrying." : errors.import}</p>
              {errors.import.includes('Session expired') ? (
                <button
                  type="button"
                  onClick={() => navigate('/auth/signin')}
                  className="mt-2 inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-white/20"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Sign in again
                </button>
              ) : null}
            </div>
          ) : null}
          {parseFailure ? (
            <div className="mt-3 rounded-xl border border-rose-200/30 bg-rose-300/10 p-3 text-xs text-rose-100">
              <p className="font-semibold">{parseFailure.reason || 'Parse failed'}</p>
              {Array.isArray(parseFailure.expectedExamples) && parseFailure.expectedExamples.length ? (
                <div className="mt-2 rounded-lg border border-white/15 bg-slate-950/40 p-2 text-[11px] text-slate-100/90">
                  <p className="font-semibold text-slate-100">Accepted examples</p>
                  {parseFailure.expectedExamples.slice(0, 3).map((example) => (
                    <p key={example} className="mt-1 font-mono text-[10px]">
                      {example}
                    </p>
                  ))}
                </div>
              ) : null}
              {Array.isArray(parseFailure.tips) && parseFailure.tips.length ? (
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  {parseFailure.tips.slice(0, 4).map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              ) : null}
              {parseFailure.stats ? (
                <p className="mt-2 text-[11px] text-slate-100/80">
                  Matched lines: {parseFailure.stats.matchedLines ?? 0} / {parseFailure.stats.totalLines ?? 0}
                </p>
              ) : null}
              {Array.isArray(parseFailure.firstIgnoredLines) && parseFailure.firstIgnoredLines.length ? (
                <div className="mt-2 rounded-lg border border-white/15 bg-slate-950/40 p-2 text-[11px] text-slate-100/90">
                  <p className="font-semibold text-slate-100">Ignored sample lines</p>
                  {parseFailure.firstIgnoredLines.slice(0, 3).map((item) => (
                    <p key={`${item.line}-${item.text}`} className="mt-1">
                      Line {item.line}: {item.text}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {demoModeEnabled ? (
            <div className="mt-5 rounded-xl border border-amber-200/30 bg-amber-300/10 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">Demo Mode</p>
              <p className="mt-1 text-xs text-amber-100/90">
                AI insights are experimental. Avoid sensitive or personally identifying data.
              </p>
              <div className="mt-3 inline-flex rounded-full border border-white/20 bg-slate-950/55 p-1">
                <button
                  type="button"
                  onClick={() => setFullTextSessionEnabled(false)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    !fullTextSessionEnabled ? 'bg-white text-indigo-700' : 'text-slate-100/85'
                  }`}
                >
                  Privacy-first (recommended)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const confirmed = window.confirm(
                      'Highest quality mode may send full chat text for experimental analysis. Continue for this session?',
                    )
                    if (confirmed) setFullTextSessionEnabled(true)
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    fullTextSessionEnabled ? 'bg-white text-indigo-700' : 'text-slate-100/85'
                  }`}
                >
                  Highest quality (sends full text)
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDemoConsentRequired(false)
                    setIsDemoInfoOpen(true)
                  }}
                  className="rounded-full border border-white/20 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-100 transition hover:bg-white/15"
                >
                  Demo Mode info
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleRunAnalysis}
              disabled={!canRunAnalysis}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <MessageSquareText className="h-4 w-4" />
              {isRunning ? 'Running Analysis' : 'Run Analysis'}
            </button>
            {demoModeEnabled ? (
              <span className="rounded-full border border-amber-200/30 bg-amber-300/10 px-3 py-1 text-xs font-medium text-amber-100">
                Demo Mode active
              </span>
            ) : null}

            {latestAnalysisId && !isRunning ? (
              <button
                type="button"
                onClick={() => navigate(`/dashboard?analysisId=${latestAnalysisId}`)}
                className="inline-flex items-center gap-2 rounded-xl border border-cyan-200/40 bg-cyan-300/10 px-5 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
              >
                View Results
              </button>
            ) : null}
            {(hasManualParticipants || hasManualTimeline) && activeTab === 'paste' ? (
              <span className="rounded-full border border-violet-200/30 bg-violet-300/10 px-3 py-1 text-xs font-medium text-violet-100">
                Included: {hasManualParticipants ? 'names' : ''}{hasManualParticipants && hasManualTimeline ? ' + ' : ''}{hasManualTimeline ? 'timeline' : ''}
              </span>
            ) : null}
          </div>

          {errors.run ? <p className="mt-2 text-xs text-rose-200">{errors.run}</p> : null}

          {isRunning ? <AnalysisProgress currentStep={progressState} /> : null}

          <button
            type="button"
            onClick={() => setIsPrivacyOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-cyan-100/90 underline-offset-4 transition hover:text-cyan-100 hover:underline"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Privacy & Safety
          </button>

          <p className="mt-3 text-xs text-slate-100/65">
            {selectedAppData
              ? `Current app source: ${selectedAppData.label}`
              : activeTab === 'paste'
                ? 'Current mode: Universal paste.'
                : 'Select a messaging app to begin import.'}
          </p>
        </GlassCard>
      </section>

      {importResult ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-slate-950/90 p-3 backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-6xl items-center gap-2">
            <button
              type="button"
              onClick={handleRunAnalysis}
              disabled={!canRunAnalysis}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <MessageSquareText className="h-4 w-4" />
              {isRunning ? 'Running Analysis' : 'Run Analysis'}
            </button>
            {latestAnalysisId && !isRunning ? (
              <button
                type="button"
                onClick={() => navigate(`/dashboard?analysisId=${latestAnalysisId}`)}
                className="inline-flex items-center justify-center rounded-xl border border-cyan-200/35 bg-cyan-300/10 px-3 py-2.5 text-sm font-semibold text-cyan-100"
              >
                Results
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <ExportGuideModal app={openGuideApp} onClose={() => setOpenGuideApp(null)} />
      <PrivacySafetyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
      <DemoModeInfoModal
        isOpen={isDemoInfoOpen}
        onClose={() => {
          if (demoConsentRequired && !demoModeConsent) return
          setIsDemoInfoOpen(false)
          setDemoConsentRequired(false)
          setPendingRunAfterConsent(false)
        }}
        consentAlreadyGiven={demoModeConsent}
        requireConsent={demoConsentRequired}
        onAcceptConsent={() => {
          setDemoModeConsent(true)
        }}
      />
      <DemoAiUnavailableModal
        isOpen={demoFailureState.open}
        message={demoFailureState.message}
        onRetry={() => {
          setDemoFailureState({ open: false, message: '' })
          void handleRunAnalysis()
        }}
        onUseMockMode={() => {
          setDemoFailureState({ open: false, message: '' })
          setDemoModeEnabled(false)
          void handleRunAnalysis({ forceMock: true })
        }}
        onClose={() => setDemoFailureState({ open: false, message: '' })}
      />
    </main>
  )
}
