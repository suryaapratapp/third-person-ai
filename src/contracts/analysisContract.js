export const ANALYSIS_RESULT_VERSION = 1

export function isAnalysisResult(value) {
  if (!value || typeof value !== 'object') return false
  const requiredArrays = ['sentimentTimeline', 'responsePatterns', 'activityHeatmap', 'viralMoments']

  return (
    typeof value.id === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.sourceApp === 'string' &&
    typeof value.compatibilityScore === 'number' &&
    typeof value.mbti === 'object' &&
    requiredArrays.every((key) => Array.isArray(value[key]))
  )
}

export function normalizeAnalysisResult(raw) {
  if (isAnalysisResult(raw)) return raw
  return null
}
