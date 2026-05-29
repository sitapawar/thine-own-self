const QUESTIONS_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSFpKLTocID-6Gtd8z-gcumxdByudPbZ84k15AraXicEowbz1gsJ74tqma55kgGCiEatMnLhmXEtudx/pub?gid=956856878&single=true&output=csv'

export const TRAITS = [
  'Ambition', 'Forgiving', 'Repressed', 'Action Oriented', 'Morality',
  'Emotion', 'Idealism', 'Chaos', 'Humor', 'Romance', 'Pining',
  'Duty', 'Loyalty', 'Power Hunger', 'Gender (having it)',
  'Gender (binary but its a spectrum)', 'Self-Awareness', 'Charisma',
  'performance', 'Honor', 'Intention',
]

export interface Question {
  text: string
  weights: Record<string, number>
}

export interface QuestionData {
  questions: Question[]
  totals: Record<string, number>
}

function parseFloat2(val: string): number {
  const n = parseFloat(val)
  return isNaN(n) ? 0 : n
}

export async function loadQuestions(): Promise<QuestionData> {
  const res = await fetch(QUESTIONS_URL)
  const text = await res.text()

  const lines = text.trim().split('\n')
  const headers = parseCSVLine(lines[0]).map(h => h.trim())
  const traitHeaders = headers.slice(1) // skip "Questions" column

  // Row 1 is TOTALS
  const totalsRow = parseCSVLine(lines[1])
  const totals: Record<string, number> = {}
  traitHeaders.forEach((trait, i) => {
    totals[trait] = parseFloat2(totalsRow[i + 1] ?? '')
  })

  // Remaining rows are questions
  const questions: Question[] = []
  for (let i = 2; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    const text = cols[0]?.trim()
    if (!text) continue

    const weights: Record<string, number> = {}
    traitHeaders.forEach((trait, j) => {
      weights[trait] = parseFloat2(cols[j + 1] ?? '')
    })
    questions.push({ text, weights })
  }

  return { questions, totals }
}

// Handles quoted fields with commas inside
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}
