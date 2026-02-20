function toSchemaText() {
  return `{
  "analysisId": "string",
  "participants": [{ "name": "string", "colorHint": "pink|blue|purple|teal", "messageCount": 0 }],
  "compatibility": {
    "score": 0,
    "label": "string",
    "summary": "string",
    "strengths": [{ "title": "string", "detail": "string" }],
    "challenges": [{ "title": "string", "detail": "string" }],
    "growth": [{ "title": "string", "detail": "string" }]
  },
  "sentiment": {
    "timelineMarkers": [{ "dateApprox": "string", "label": "string", "kind": "up|down|shift|event" }],
    "narrative": "string"
  },
  "majorEvents": [
    {
      "dateApprox": "string",
      "event": "string",
      "summary": "string",
      "impact": {
        "overview": "string",
        "keyInteractions": "string",
        "emotionalImpact": "string",
        "relationshipImpact": "string"
      },
      "relatedMessageSelectors": [{ "participant": "string", "contains": "string" }]
    }
  ],
  "personality": [
    {
      "participant": "string",
      "archetypeCode": "string",
      "dimensions": [{ "key": "string", "value": 0 }],
      "strengthTags": ["string"],
      "weaknessTags": ["string"],
      "narrative": "string"
    }
  ],
  "copy": {
    "welcome": "string",
    "coachHint": "string",
    "bestieHint": "string"
  }
}`
}

export function buildAnalysisPrompt({
  parsedSummary,
  metricsSummary,
  allowRawSend,
  rawTextMaybe,
  chunkSummaries = [],
}) {
  return [
    'You are generating a relationship analysis for a demo dashboard.',
    'Return ONLY valid JSON. No markdown, no extra prose.',
    'Use cautious language and avoid guarantees.',
    'Do not diagnose mental health or replace therapy/legal advice.',
    'Schema:',
    toSchemaText(),
    `Parsed summary: ${JSON.stringify(parsedSummary)}`,
    `Metrics summary: ${JSON.stringify(metricsSummary)}`,
    `Chunk summaries: ${JSON.stringify(chunkSummaries)}`,
    allowRawSend && rawTextMaybe
      ? `Raw conversation excerpt (use carefully): ${rawTextMaybe}`
      : 'Raw conversation text is NOT provided. Infer from summaries only.',
    'Use mixed-language signals if present in the input.',
    'Personality archetype codes should be MBTI-like and clearly marked as demo inference.',
    'relatedMessageSelectors should use short "contains" phrases only.',
  ].join('\n\n')
}

export function buildLoveGuruPrompt({
  persona,
  tone,
  languageHints,
  analysisSummary,
  threadMessages,
  userMessage,
}) {
  const personaRule =
    persona === 'bestie'
      ? [
        'Persona: Bestie.',
        'Style: GenZ best friend, direct and caring, short punchy paragraphs.',
        'Use structure:',
        '1) Here is the tea',
        '2) What it means',
        '3) What you do next (2-3 moves)',
        'Mirror user tone. If user is serious, stay softer.',
      ].join('\n')
      : [
        'Persona: Coach.',
        'Style: Professional mentor, calm and structured, no slang.',
        'Use structure:',
        '1) What I am noticing',
        '2) Why it may be happening',
        '3) What you can do next (3 actionable steps)',
        '4) One gentle clarifying question',
      ].join('\n')

  return [
    'You are Love Guru for a relationship insights app.',
    personaRule,
    `Tone slider: ${tone || 'balanced'}.`,
    'Match the user language preference; if they code-switch, you may code-switch too.',
    'Coach prioritizes clarity and minimal code-switching. Bestie can mirror code-switching naturally.',
    'Never quote raw chat messages directly. Summarize signals.',
    'Avoid hate, harassment, and harmful language.',
    `Language hints: ${JSON.stringify(languageHints || [])}`,
    `Analysis summary: ${JSON.stringify(analysisSummary)}`,
    `Recent thread messages: ${JSON.stringify((threadMessages || []).slice(-10))}`,
    `User message: ${userMessage}`,
  ].join('\n\n')
}
