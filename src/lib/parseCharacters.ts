//import './globals.css'
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSFpKLTocID-6Gtd8z-gcumxdByudPbZ84k15AraXicEowbz1gsJ74tqma55kgGCiEatMnLhmXEtudx/pub?gid=1755500476&single=true&output=csv'

export const TRAITS = [
  "Ambition", "Forgiving", "Repressed", "Action Oriented", "Morality",
  "Emotion", "Idealism", "Chaos", "Humor", "Romance", "Pining",
  "Duty", "Loyalty", "Power Hunger",
  "Gender (having it)", "Gender (binary but its a spectrum)",
  "Self-Awareness", "Charisma", "performance", "Honor", "Intention"
]

export interface Character {
  name: string
  play: string
  scores: Record<string, number | null>
}

export async function loadCharacters(): Promise<Character[]> {
  const response = await fetch(SHEET_URL)
  const text = await response.text()

  const lines = text.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim())

  return lines.slice(1).map(line => {
    // Handle commas inside quoted fields
    const cols = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|^(?=,)|(?<=,)$)/g) || []
    const row: Record<string, string> = {}
    headers.forEach((h, i) => {
      row[h] = (cols[i] ?? '').replace(/^"|"$/g, '').trim()
    })

    const scores: Record<string, number | null> = {}
    for (const trait of TRAITS) {
      const val = row[trait] ?? ''
      const cleaned = val.replace(/[^0-9.]/g, '') // strips backticks, spaces, etc
      scores[trait] = cleaned !== '' ? parseFloat(cleaned) : null
    }

    return {
      name: row['Character'] ?? '',
      play: row['Play'] ?? '',
      scores,
    }
  }).filter(c => c.name !== '')
}