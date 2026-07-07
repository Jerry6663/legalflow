const API_BASE = import.meta.env.VITE_API_URL || '/api/v1'

export async function uploadContract(file: File) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API_BASE}/review/upload`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) throw new Error('Upload failed')
  return res.json()
}

export async function analyzeContract(text: string, contractType?: string) {
  const res = await fetch(`${API_BASE}/review/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contract_text: text, contract_type: contractType }),
  })
  if (!res.ok) throw new Error('Analysis failed')
  return res.json()
}
