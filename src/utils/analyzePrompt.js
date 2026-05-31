export async function analyzeReport(data) {
  const response = await fetch('/api/analyze-results', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: data.text }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error || 'Analysis failed')
  }

  return response.json()
}
