import { maskSensitiveContent } from './privacyUtils'

const insightDrafts = {
  compatibilityScore: 'Explain my compatibility score and what I should do next.',
  mbti: 'Based on my MBTI result, what are our friction points and strengths?',
  sentimentTimeline: 'What caused the biggest sentiment shifts and how can we stabilize them?',
  responsePatterns: 'What do my response patterns suggest about interest and effort?',
  activityHeatmap: 'How should we use our most active times to improve connection?',
  viralMoments: 'What do our best moments reveal about what works between us?',
  keyMoment: 'Help me understand this key moment and what I should do about it.',
}

const moduleDescriptions = {
  compatibilityScore: 'A signal-based estimate of communication alignment and repair patterns.',
  mbti: 'A conversational style inference based on language patterns over time.',
  sentimentTimeline: 'An estimate of emotional shifts across your conversation timeline.',
  responsePatterns: 'A summary of reciprocity, response speed, and engagement signals.',
  activityHeatmap: 'A map of when interaction peaks appear most often.',
  viralMoments: 'High-intensity moments where engagement and emotional signal strength rise.',
}

function seedFrom(value = '') {
  return String(value)
    .split('')
    .reduce((acc, char, index) => acc + char.charCodeAt(0) * (index + 1), 0)
}

function pickBySeed(options, seed, count) {
  if (!Array.isArray(options) || !options.length) return []
  const items = []
  for (let index = 0; index < count; index += 1) {
    items.push(options[(seed + index) % options.length])
  }
  return items
}

function toParticipantNames(analysis, hideNames) {
  const importParticipants = analysis?.importSummary?.participants
  if (Array.isArray(importParticipants) && importParticipants.length) {
    if (hideNames) {
      return importParticipants.map((_, index) => `Person ${String.fromCharCode(65 + index)}`)
    }
    return importParticipants
  }

  const base = [analysis?.participants?.personA || 'Person A', analysis?.participants?.personB || 'Person B']
  if (hideNames) return ['Person A', 'Person B']
  return base
}

function sanitizeLine(value, { hideNames, maskSensitiveInfo, names }) {
  let next = value || ''

  if (hideNames && names?.length) {
    names.forEach((name, index) => {
      if (!name) return
      const alias = `Person ${String.fromCharCode(65 + index)}`
      next = next.replace(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), alias)
    })
  }

  if (maskSensitiveInfo) {
    next = maskSensitiveContent(next)
  }

  return next
}

function buildInsightEvidence(analysis, insightKey, options) {
  const names = toParticipantNames(analysis, false)
  const score = analysis?.compatibilityScore ?? 72
  const topMoment = analysis?.viralMoments?.[0]?.title || 'Engagement spike'
  const timelinePeak = analysis?.sentimentTimeline?.reduce((acc, point) => (point.value > acc.value ? point : acc), { value: 0, label: 'Current' })
  const responseOne = analysis?.responsePatterns?.[0]?.value || 'n/a'

  const evidencePools = {
    compatibilityScore: [
      { label: 'Repair pattern', snippet: `${names[0]} and ${names[1]} recover tone after tense exchanges in multiple stretches.` },
      { label: 'Reciprocity', snippet: 'Message contribution appears reasonably balanced across the observed window.' },
      { label: 'Consistency', snippet: `Compatibility remained around ${score}% in the selected time window.` },
      { label: 'Support signals', snippet: 'Acknowledgment language appears during conflict and follow-up messages.' },
      { label: 'Risk signal', snippet: 'Some periods show abrupt response gaps that may affect stability.' },
    ],
    mbti: [
      { label: 'Style contrast', snippet: 'One side appears direct and task-focused while the other uses emotional framing.' },
      { label: 'Decision pace', snippet: 'The chat shows alternating fast decisions and reflective pauses before replies.' },
      { label: 'Conflict framing', snippet: 'Disagreements are often reframed with values-based language instead of hard exits.' },
      { label: 'Strength signal', snippet: 'Both participants continue re-engaging after friction, suggesting shared investment.' },
    ],
    sentimentTimeline: [
      { label: 'Peak tone', snippet: `The strongest positive shift appears near ${timelinePeak?.label || 'Current'} on the timeline.` },
      { label: 'Dip recovery', snippet: 'Negative swings are followed by stabilization rather than continued escalation.' },
      { label: 'Volatility', snippet: 'Tone fluctuates in short bursts around response delays and expectation mismatch.' },
      { label: 'Sustained phase', snippet: 'Recent segment shows steadier sentiment compared with early spikes.' },
    ],
    responsePatterns: [
      { label: 'Reply speed', snippet: `Average reply speed reads around ${responseOne} in this window.` },
      { label: 'Effort balance', snippet: 'One participant initiates repair messages more often during tense periods.' },
      { label: 'Drop-off signal', snippet: 'Message pacing dips after unresolved questions, then recovers later.' },
      { label: 'Engagement pattern', snippet: 'Longer replies cluster during evenings, suggesting higher emotional bandwidth then.' },
    ],
    activityHeatmap: [
      { label: 'High activity band', snippet: 'Most active windows cluster in evening and night periods across weekdays.' },
      { label: 'Connection habit', snippet: 'Weekend interactions show longer uninterrupted message bursts.' },
      { label: 'Low activity band', snippet: 'Midday windows have lower interaction consistency than late-day windows.' },
      { label: 'Opportunity', snippet: 'Shared high-availability windows can be used for better check-ins and clarity talks.' },
    ],
    viralMoments: [
      { label: 'Strong moment', snippet: `A standout moment appears in "${topMoment}" with unusually high engagement.` },
      { label: 'Humor signal', snippet: 'Playful banter clusters around periods with fastest reply loops.' },
      { label: 'Repair indicator', snippet: 'High-intensity exchanges often settle after one participant validates concerns.' },
      { label: 'Reinforcement', snippet: 'Positive moments align with explicit appreciation language and follow-through.' },
    ],
  }

  const pool = evidencePools[insightKey] || evidencePools.compatibilityScore
  const seed = seedFrom(`${analysis?.id || 'analysis'}:${insightKey}`)
  const picked = pickBySeed(pool, seed, 4)

  return picked.map((item) => ({
    label: item.label,
    snippet: sanitizeLine(item.snippet, { ...options, names }),
  }))
}

function buildMeaningPoints(insightKey) {
  const points = {
    compatibilityScore: [
      'The score reflects communication patterns, not destiny.',
      'Consistency and repair behavior matter more than one isolated argument.',
      'Use this as a starting point for a focused conversation, not a verdict.',
    ],
    mbti: [
      'This captures likely communication styles from text patterns.',
      'Style differences can be strengths when made explicit.',
      'Treat this as guidance for framing conversations, not a label lock-in.',
    ],
    sentimentTimeline: [
      'Emotional shifts usually reflect context plus communication habits.',
      'Short-term dips are common; sustained trends matter more.',
      'Stability improves when concerns are acknowledged quickly.',
    ],
    responsePatterns: [
      'Response timing can indicate bandwidth, not just interest.',
      'Patterns help you identify recurring friction points.',
      'Use this to set clearer expectations around communication.',
    ],
    activityHeatmap: [
      'High-activity windows can guide when to discuss important topics.',
      'Low-activity periods are not always negative signals.',
      'Timing strategy can improve clarity and emotional safety.',
    ],
    viralMoments: [
      'Best moments reveal what interaction style works for both sides.',
      'Repeated positive patterns are useful templates for reconnection.',
      'Highlights are signals and should be interpreted with context.',
    ],
  }

  return points[insightKey] || points.compatibilityScore
}

function buildNextSteps(insightKey) {
  const items = {
    compatibilityScore: ['Plan one clarity conversation this week.', 'Ask one question about unmet expectations.', 'Agree on a repair phrase for future conflict.'],
    mbti: ['Name one strength each person brings to conflict.', 'Align on decision pace for sensitive topics.', 'Use a shared format for difficult conversations.'],
    sentimentTimeline: ['Identify one trigger behind recent dips.', 'Set a short check-in cadence for this week.', 'Validate before problem-solving during tense moments.'],
    responsePatterns: ['Set expectations for reply timing.', 'Flag when you need space instead of going silent.', 'Use concise follow-ups instead of stacked messages.'],
    activityHeatmap: ['Schedule one meaningful conversation during high-overlap windows.', 'Avoid conflict-heavy topics in low-bandwidth periods.', 'Test one weekly ritual in your strongest time slot.'],
    viralMoments: ['Reuse the tone that worked in your best moments.', 'Explicitly acknowledge what felt good in those exchanges.', 'Create one shared activity that mirrors high-connection periods.'],
    keyMoment: ['Name what changed in that period.', 'Clarify one specific need for future conversations.', 'Decide one next step you can do within 24 hours.'],
  }

  return items[insightKey] || items.compatibilityScore
}

export function buildInsightDetail(analysis, insightKey, options = {}) {
  const titleMap = {
    compatibilityScore: 'Compatibility Score',
    mbti: 'MBTI Analysis',
    sentimentTimeline: 'Sentiment Timeline',
    responsePatterns: 'Response Patterns',
    activityHeatmap: 'Activity Heatmap',
    viralMoments: 'Viral Moments',
  }

  const keyPoints = buildMeaningPoints(insightKey).slice(0, 3)

  return {
    kind: 'insight',
    insightKey,
    title: titleMap[insightKey] || 'Insight Detail',
    description: moduleDescriptions[insightKey] || moduleDescriptions.compatibilityScore,
    whatThisMeans: buildMeaningPoints(insightKey),
    evidence: buildInsightEvidence(analysis, insightKey, options),
    nextSteps: buildNextSteps(insightKey),
    draftMessage: insightDrafts[insightKey] || insightDrafts.compatibilityScore,
    keyPoints,
    sourceLabel: 'Dashboard',
  }
}

export function buildKeyMoments(analysis, options = {}) {
  if (!analysis) return []
  if (Array.isArray(analysis.moments) && analysis.moments.length) {
    return analysis.moments.map((moment, index) => ({
      id: moment.id || `moment-${index}`,
      when: moment.when || `Window ${index + 1}`,
      title: moment.title || 'Key Moment',
      description: moment.description || 'Pattern shift observed in this period.',
      severity: moment.severity || 'Medium',
      whatHappened: moment.whatHappened || 'A notable communication shift appeared in this timeline segment.',
      evidence: (moment.evidence || []).slice(0, 5),
      nextSteps: (moment.nextSteps || []).slice(0, 3),
    }))
  }

  const seed = seedFrom(analysis.id || 'analysis')
  const importStats = analysis?.importSummary?.stats || {}
  const estimatedDays = importStats.estimatedDays || 21
  const phaseNames = ['Early phase', 'Mid phase', 'Recent phase', 'Peak period', 'Current']
  const titles = ['Tone shifted', 'Response delay increased', 'More playful banter', 'Conflict cluster', 'Distance phase']
  const descriptions = [
    'Tone moved from neutral to more emotionally loaded responses.',
    'Reply gaps widened compared with prior windows.',
    'Conversation included more playful and connective language.',
    'Multiple tense exchanges happened in a short period.',
    'Interaction volume dropped and check-ins became less frequent.',
  ]
  const severityLevels = ['Low', 'Medium', 'High']

  return Array.from({ length: 5 }).map((_, index) => {
    const offset = (seed + index * 7) % 5
    const evidenceBase = [
      { label: 'Tone signal', snippet: `${phaseNames[offset]} shows a notable shift in phrasing and emotional intensity.` },
      { label: 'Pacing signal', snippet: 'Message cadence changed compared with adjacent periods.' },
      { label: 'Engagement signal', snippet: 'Reciprocity and follow-through varied during this window.' },
      { label: 'Repair signal', snippet: 'Conflict handling style changed after delayed responses.' },
    ]

    const key = `${analysis.id}:${index}:moment`
    const safeEvidence = pickBySeed(evidenceBase, seedFrom(key), 4).map((item) => ({
      label: item.label,
      snippet: sanitizeLine(item.snippet, {
        hideNames: options.hideNames,
        maskSensitiveInfo: options.maskSensitiveInfo,
        names: toParticipantNames(analysis, false),
      }),
    }))

    const durationUnit = estimatedDays > 35 ? 'weeks' : 'days'
    const when =
      durationUnit === 'weeks'
        ? `Week ${Math.max(1, Math.round(((index + 1) * estimatedDays) / 5 / 7))}`
        : `Day ${Math.max(1, Math.round(((index + 1) * estimatedDays) / 5))}`

    return {
      id: `moment-${index}`,
      when,
      title: titles[(seed + index) % titles.length],
      description: descriptions[(seed + offset) % descriptions.length],
      severity: severityLevels[(seed + index) % severityLevels.length],
      whatHappened: `${phaseNames[offset]} shows a measurable shift in communication dynamics relative to adjacent periods.`,
      evidence: safeEvidence,
      nextSteps: buildNextSteps('keyMoment'),
      draftMessage: insightDrafts.keyMoment,
      keyPoints: [
        'Signals changed in this period compared with nearby windows.',
        'Context and timing likely contributed to the shift.',
        'A specific next-step conversation can reduce ambiguity.',
      ],
    }
  })
}

export function buildMomentDetail(moment) {
  if (!moment) return null

  return {
    kind: 'moment',
    momentId: moment.id,
    insightKey: 'key-moment',
    title: moment.title,
    description: moment.description,
    whatThisMeans: [moment.whatHappened],
    evidence: moment.evidence || [],
    nextSteps: moment.nextSteps || buildNextSteps('keyMoment'),
    draftMessage: moment.draftMessage || insightDrafts.keyMoment,
    keyPoints: moment.keyPoints || [moment.description],
    sourceLabel: 'Key Moment',
  }
}

export function createLoveGuruContextPayload({ analysisId, detail }) {
  if (!detail) return null

  return {
    analysisId,
    source: detail.kind === 'moment' ? 'key-moment' : 'dashboard',
    insight: detail.insightKey,
    title: detail.title,
    keyPoints: (detail.keyPoints || detail.whatThisMeans || []).slice(0, 3),
  }
}
