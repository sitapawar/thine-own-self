const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSFpKLTocID-6Gtd8z-gcumxdByudPbZ84k15AraXicEowbz1gsJ74tqma55kgGCiEatMnLhmXEtudx/pub?gid=1755500476&single=true&output=csv'

export const TRAITS = [
  "Ambition", "Forgiving", "Repressed", "Action Oriented", "Morality",
  "Emotion", "Idealism", "Chaos", "Humor", "Romance",
  "Duty", "Loyalty", "Power Hunger", "self-destruction",
  "Gender (binary but its a spectrum)",
  "Self-Awareness", "Charisma", "performance", "Honor", "Intention",
  "Affability"
]

export interface Character {
  name: string
  play: string
  scores: Record<string, number | null>
  primary: Record<string, boolean>
  quote: string | null 
}

export async function loadCharacters(): Promise<Character[]> {
  const response = await fetch(SHEET_URL)
  const text = await response.text()

  // Replace newlines inside quoted fields with a placeholder
  let inQuote = false
  let normalized = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      inQuote = !inQuote
      normalized += ch
    } else if ((ch === '\n' || ch === '\r') && inQuote) {
      normalized += '||BR||'
    } else {
      normalized += ch
    }
  }

  const lines = normalized.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim())

  return lines.slice(1).map(line => {
    const cols = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|^(?=,)|(?<=,)$)/g) || []
    const row: Record<string, string> = {}
    headers.forEach((h, i) => {
      row[h] = (cols[i] ?? '')
        .replace(/^"|"$/g, '')
        .replace(/\|\|BR\|\|/g, '\n')  // restore linebreaks
        .trim()
    })

    const scores: Record<string, number | null> = {}
    const primary: Record<string, boolean> = {}

    for (const trait of TRAITS) {
      const raw = row[trait] ?? ''
      const isPrimary = raw.includes('*')
      const cleaned = raw.replace(/[^0-9.]/g, '')
      scores[trait] = cleaned !== '' ? parseFloat(cleaned) : null
      primary[trait] = isPrimary
    }

    return {
      name: row['Character'] ?? '',
      play: row['Play'] ?? '',
      scores,
      primary,
      quote: row['Quote']?.trim() || null, 
    }
  }).filter(c => c.name !== '')
}