import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame, useCategories } from '../../store/gameStore'
import type { Difficulty, Question, QuestionType } from '../../types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Chip } from '../ui/Chip'

const ALL = '__all__'
const PAGE_SIZE = 12

const DIFFICULTIES: { value: Difficulty; label: string; emoji: string }[] = [
  { value: 'easy', label: 'Easy', emoji: '🟢' },
  { value: 'medium', label: 'Medium', emoji: '🟡' },
  { value: 'hard', label: 'Hard', emoji: '🔴' },
]

const DIFFICULTY_BADGE: Record<Difficulty, string> = {
  easy: 'bg-mint/20 text-mint border-mint/40',
  medium: 'bg-sunny/20 text-sunny border-sunny/40',
  hard: 'bg-tangerine/20 text-tangerine border-tangerine/50',
}

// ── Toast feedback ──────────────────────────────────────────────────────────
type Toast = { kind: 'ok' | 'error'; text: string }

// ── Editor working draft ────────────────────────────────────────────────────
interface Draft {
  id: string | null // null = creating a new question
  prompt: string
  category: string
  difficulty: Difficulty
  type: QuestionType
  options: string[]
  correctIndex: number
}

function blankDraft(): Draft {
  return {
    id: null,
    prompt: '',
    category: '',
    difficulty: 'easy',
    type: 'mc',
    options: ['', ''],
    correctIndex: 0,
  }
}

function draftFromQuestion(q: Question): Draft {
  return {
    id: q.id,
    prompt: q.prompt,
    category: q.category,
    difficulty: q.difficulty,
    type: q.type,
    options: [...q.options],
    correctIndex: q.correctIndex,
  }
}

// ── Import validation ───────────────────────────────────────────────────────
const DIFFICULTY_SET: Difficulty[] = ['easy', 'medium', 'hard']
const TYPE_SET: QuestionType[] = ['mc', 'tf']

/** Coerce an unknown value into a valid Question, or return null to skip it. */
function coerceQuestion(raw: unknown): Question | null {
  if (typeof raw !== 'object' || raw === null) return null
  const o = raw as Record<string, unknown>

  const prompt = typeof o.prompt === 'string' ? o.prompt.trim() : ''
  if (!prompt) return null

  const category = typeof o.category === 'string' ? o.category.trim() : ''
  if (!category) return null

  if (!Array.isArray(o.options)) return null
  const options = o.options.filter((x): x is string => typeof x === 'string')
  if (options.length < 2) return null

  const difficulty = DIFFICULTY_SET.includes(o.difficulty as Difficulty)
    ? (o.difficulty as Difficulty)
    : null
  if (!difficulty) return null

  const type = TYPE_SET.includes(o.type as QuestionType)
    ? (o.type as QuestionType)
    : null
  if (!type) return null

  if (typeof o.correctIndex !== 'number' || !Number.isFinite(o.correctIndex)) {
    return null
  }
  const correctIndex = Math.trunc(o.correctIndex)
  if (correctIndex < 0 || correctIndex >= options.length) return null

  const id = typeof o.id === 'string' && o.id ? o.id : ''

  return { id, category, difficulty, type, prompt, options, correctIndex }
}

export function LibraryScreen() {
  const setScreen = useGame((s) => s.setScreen)
  const questions = useGame((s) => s.questions)
  const addQuestion = useGame((s) => s.addQuestion)
  const updateQuestion = useGame((s) => s.updateQuestion)
  const removeQuestion = useGame((s) => s.removeQuestion)
  const importQuestions = useGame((s) => s.importQuestions)
  const resetQuestionsToStarter = useGame((s) => s.resetQuestionsToStarter)
  const categories = useCategories()

  const [filterCategory, setFilterCategory] = useState<string>(ALL)
  const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | typeof ALL>(ALL)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)

  const showToast = (t: Toast) => {
    setToast(t)
    window.setTimeout(() => setToast((cur) => (cur === t ? null : cur)), 3200)
  }

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return questions.filter((q) => {
      if (filterCategory !== ALL && q.category !== filterCategory) return false
      if (filterDifficulty !== ALL && q.difficulty !== filterDifficulty) return false
      if (
        needle &&
        !q.prompt.toLowerCase().includes(needle) &&
        !q.options.some((o) => o.toLowerCase().includes(needle))
      ) {
        return false
      }
      return true
    })
  }, [questions, filterCategory, filterDifficulty, search])

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  // Reset to the first page whenever the filters/search change.
  useEffect(() => {
    setPage(1)
  }, [filterCategory, filterDifficulty, search])
  const safePage = Math.min(page, totalPages)
  const pageStart = (safePage - 1) * PAGE_SIZE
  const paged = visible.slice(pageStart, pageStart + PAGE_SIZE)

  // ── Editor open helpers ───────────────────────────────────────────────────
  const openNew = () => setDraft(blankDraft())
  const openEdit = (q: Question) => setDraft(draftFromQuestion(q))
  const closeEditor = () => setDraft(null)

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = () => {
    try {
      const blob = new Blob([JSON.stringify(questions, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'family-trivia-questions.json'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showToast({ kind: 'ok', text: `Exported ${questions.length} questions.` })
    } catch {
      showToast({ kind: 'error', text: 'Export failed.' })
    }
  }

  // ── Import ────────────────────────────────────────────────────────────────
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // Reset the input so picking the same file again still fires onChange.
    e.target.value = ''
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = String(reader.result ?? '')
        const parsed: unknown = JSON.parse(text)
        if (!Array.isArray(parsed)) {
          showToast({ kind: 'error', text: 'Import must be a JSON array.' })
          return
        }
        const valid: Question[] = []
        for (const item of parsed) {
          const q = coerceQuestion(item)
          if (q) valid.push(q)
        }
        if (valid.length === 0) {
          showToast({ kind: 'error', text: 'No valid questions found in file.' })
          return
        }
        const replace = window.confirm(
          `Found ${valid.length} valid question(s) of ${parsed.length}.\n\n` +
            'Press OK to REPLACE your whole library, or Cancel to MERGE (add to it).',
        )
        importQuestions(valid, replace)
        showToast({
          kind: 'ok',
          text: `${replace ? 'Replaced with' : 'Merged'} ${valid.length} question(s).`,
        })
      } catch {
        showToast({ kind: 'error', text: 'Could not parse JSON file.' })
      }
    }
    reader.onerror = () => showToast({ kind: 'error', text: 'Could not read file.' })
    reader.readAsText(file)
  }

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = () => {
    const ok = window.confirm(
      'Reset to the starter pack? This replaces ALL your custom questions.',
    )
    if (!ok) return
    resetQuestionsToStarter()
    showToast({ kind: 'ok', text: 'Reset to starter pack.' })
  }

  // ── Save from editor ──────────────────────────────────────────────────────
  const handleSave = (d: Draft) => {
    const prompt = d.prompt.trim()
    const category = d.category.trim()
    const options =
      d.type === 'tf' ? ['True', 'False'] : d.options.map((o) => o.trim())

    if (!prompt) {
      showToast({ kind: 'error', text: 'Prompt cannot be empty.' })
      return
    }
    if (!category) {
      showToast({ kind: 'error', text: 'Category cannot be empty.' })
      return
    }
    if (options.some((o) => !o)) {
      showToast({ kind: 'error', text: 'All options must be filled in.' })
      return
    }
    if (d.correctIndex < 0 || d.correctIndex >= options.length) {
      showToast({ kind: 'error', text: 'Pick a correct answer.' })
      return
    }

    const patch = {
      prompt,
      category,
      difficulty: d.difficulty,
      type: d.type,
      options,
      correctIndex: d.correctIndex,
    }

    if (d.id) {
      updateQuestion(d.id, patch)
      showToast({ kind: 'ok', text: 'Question updated.' })
    } else {
      addQuestion(patch)
      showToast({ kind: 'ok', text: 'Question added.' })
    }
    closeEditor()
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <motion.h1
            className="font-display text-4xl font-bold sm:text-5xl"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          >
            Question Library 📚
          </motion.h1>
          <p className="mt-1 font-body text-sm font-semibold text-white/70">
            {questions.length} question{questions.length === 1 ? '' : 's'}
          </p>
        </div>
        <Button variant="ghost" onClick={() => setScreen('home')}>
          ← Back
        </Button>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.text}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={[
              'rounded-2xl border px-4 py-3 font-body text-sm font-bold',
              toast.kind === 'ok'
                ? 'border-mint/40 bg-mint/15 text-mint'
                : 'border-red-400/40 bg-red-500/15 text-red-200',
            ].join(' ')}
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar */}
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={openNew}>+ New Question</Button>
          <input
            type="search"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearch(e.target.value)
            }
            placeholder="Search questions & answers…"
            className="min-w-[12rem] flex-1 rounded-2xl border-2 border-white/25 bg-white/10 px-4 py-2 font-body text-sm font-semibold text-white outline-none placeholder:text-white/40 focus-visible:ring-4 focus-visible:ring-white/40"
          />
        </div>

        {/* Category filter */}
        <div>
          <span className="mb-1.5 block font-body text-xs font-bold uppercase tracking-wide text-white/50">
            Category
          </span>
          <div className="flex flex-wrap gap-2">
            <Chip
              label="All"
              emoji="✨"
              selected={filterCategory === ALL}
              onClick={() => setFilterCategory(ALL)}
            />
            {categories.map((cat) => (
              <Chip
                key={cat}
                label={cat}
                selected={filterCategory === cat}
                onClick={() => setFilterCategory(cat)}
              />
            ))}
          </div>
        </div>

        {/* Difficulty filter */}
        <div>
          <span className="mb-1.5 block font-body text-xs font-bold uppercase tracking-wide text-white/50">
            Difficulty
          </span>
          <div className="flex flex-wrap gap-2">
            <Chip
              label="All"
              emoji="✨"
              selected={filterDifficulty === ALL}
              onClick={() => setFilterDifficulty(ALL)}
            />
            {DIFFICULTIES.map((d) => (
              <Chip
                key={d.value}
                label={d.label}
                emoji={d.emoji}
                selected={filterDifficulty === d.value}
                onClick={() => setFilterDifficulty(d.value)}
              />
            ))}
          </div>
        </div>
      </Card>

      {/* Import / Export row */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" size="sm" onClick={handleExport}>
          ⬇️ Export JSON
        </Button>
        <label className="cursor-pointer">
          <span className="inline-flex cursor-pointer select-none items-center justify-center gap-2 rounded-xl bg-white/90 px-4 py-2 font-display text-sm font-bold tracking-wide text-ink shadow-playful transition-colors hover:bg-white">
            ⬆️ Import JSON
          </span>
          <input
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            className="hidden"
          />
        </label>
        <Button variant="danger" size="sm" onClick={handleReset}>
          ♻️ Reset to starter pack
        </Button>
      </div>

      {/* Results count */}
      {visible.length > 0 && (
        <p className="font-body text-sm font-semibold text-white/60">
          Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, visible.length)} of{' '}
          {visible.length} question{visible.length === 1 ? '' : 's'}
        </p>
      )}

      {/* Question list */}
      <div className="flex flex-col gap-4">
        {visible.length === 0 ? (
          <Card className="text-center">
            <p className="font-display text-xl font-bold text-white/80">
              {questions.length === 0
                ? 'Your library is empty.'
                : 'No questions match your filters.'}
            </p>
            <p className="mt-1 font-body text-sm font-semibold text-white/60">
              {questions.length === 0
                ? 'Add your first question to get started!'
                : 'Try a different category or search.'}
            </p>
          </Card>
        ) : (
          <AnimatePresence mode="popLayout">
            {paged.map((q) => (
              <motion.div
                key={q.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              >
                <Card className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-grape/50 bg-grape/25 px-3 py-1 font-body text-xs font-bold text-white">
                      {q.category}
                    </span>
                    <span
                      className={[
                        'rounded-full border px-3 py-1 font-body text-xs font-bold capitalize',
                        DIFFICULTY_BADGE[q.difficulty],
                      ].join(' ')}
                    >
                      {q.difficulty}
                    </span>
                    <span className="rounded-full border border-sky/50 bg-sky/20 px-3 py-1 font-body text-xs font-bold text-sky">
                      {q.type === 'mc' ? 'MC' : 'TF'}
                    </span>
                  </div>

                  <p className="font-display text-lg font-bold text-white">
                    {q.prompt}
                  </p>

                  <ul className="flex flex-col gap-1.5">
                    {q.options.map((opt, i) => {
                      const correct = i === q.correctIndex
                      return (
                        <li
                          key={i}
                          className={[
                            'flex items-center gap-2 rounded-xl px-3 py-1.5 font-body text-sm font-semibold',
                            correct
                              ? 'bg-mint/15 text-mint'
                              : 'bg-white/5 text-white/80',
                          ].join(' ')}
                        >
                          <span className="w-4 shrink-0 text-center">
                            {correct ? '✓' : '•'}
                          </span>
                          <span>{opt}</span>
                        </li>
                      )
                    })}
                  </ul>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button variant="secondary" size="sm" onClick={() => openEdit(q)}>
                      ✏️ Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        removeQuestion(q.id)
                        showToast({ kind: 'ok', text: 'Question deleted.' })
                      }}
                    >
                      🗑️ Delete
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-1">
          <Button
            variant="secondary"
            size="sm"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Prev
          </Button>
          <span className="font-display text-sm font-bold text-white/80">
            Page {safePage} of {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next →
          </Button>
        </div>
      )}

      {/* Editor modal */}
      <AnimatePresence>
        {draft && (
          <Editor
            draft={draft}
            categories={categories}
            onChange={setDraft}
            onSave={handleSave}
            onCancel={closeEditor}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Editor modal ────────────────────────────────────────────────────────────
interface EditorProps {
  draft: Draft
  categories: string[]
  onChange: (d: Draft) => void
  onSave: (d: Draft) => void
  onCancel: () => void
}

function Editor({ draft, categories, onChange, onSave, onCancel }: EditorProps) {
  const setType = (type: QuestionType) => {
    if (type === 'tf') {
      onChange({
        ...draft,
        type,
        options: ['True', 'False'],
        correctIndex: draft.correctIndex > 1 ? 0 : draft.correctIndex,
      })
    } else {
      // Restore editable MC options; keep at least two.
      const opts =
        draft.type === 'tf' ? ['', ''] : draft.options.length >= 2 ? draft.options : ['', '']
      onChange({ ...draft, type, options: opts, correctIndex: 0 })
    }
  }

  const setOption = (i: number, value: string) => {
    const options = draft.options.map((o, idx) => (idx === i ? value : o))
    onChange({ ...draft, options })
  }

  const addOption = () => {
    if (draft.options.length >= 4) return
    onChange({ ...draft, options: [...draft.options, ''] })
  }

  const removeOption = (i: number) => {
    if (draft.options.length <= 2) return
    const options = draft.options.filter((_, idx) => idx !== i)
    // Keep correctIndex valid after removal.
    let correctIndex = draft.correctIndex
    if (i === correctIndex) correctIndex = 0
    else if (i < correctIndex) correctIndex -= 1
    onChange({ ...draft, options, correctIndex })
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/20 bg-ink/95 p-6 shadow-2xl backdrop-blur-md"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <h2 className="mb-4 font-display text-2xl font-bold text-white">
          {draft.id ? 'Edit Question' : 'New Question'}
        </h2>

        <div className="flex flex-col gap-4">
          {/* Prompt */}
          <label className="flex flex-col gap-1.5">
            <span className="font-body text-sm font-bold text-white/80">Prompt</span>
            <textarea
              value={draft.prompt}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                onChange({ ...draft, prompt: e.target.value })
              }
              rows={3}
              placeholder="What do you want to ask?"
              className="resize-y rounded-2xl border-2 border-white/25 bg-white/10 px-4 py-2 font-body text-sm font-semibold text-white outline-none placeholder:text-white/40 focus-visible:ring-4 focus-visible:ring-white/40"
            />
          </label>

          {/* Category */}
          <label className="flex flex-col gap-1.5">
            <span className="font-body text-sm font-bold text-white/80">Category</span>
            <input
              type="text"
              list="library-category-suggestions"
              value={draft.category}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onChange({ ...draft, category: e.target.value })
              }
              placeholder="e.g. Movies (type a new one to add)"
              className="rounded-2xl border-2 border-white/25 bg-white/10 px-4 py-2 font-body text-sm font-semibold text-white outline-none placeholder:text-white/40 focus-visible:ring-4 focus-visible:ring-white/40"
            />
            <datalist id="library-category-suggestions">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onChange({ ...draft, category: c })}
                    className="rounded-full border border-white/25 bg-white/10 px-3 py-1 font-body text-xs font-bold text-white/80 hover:bg-white/20"
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </label>

          {/* Difficulty */}
          <div className="flex flex-col gap-1.5">
            <span className="font-body text-sm font-bold text-white/80">Difficulty</span>
            <div className="flex flex-wrap gap-2">
              {DIFFICULTIES.map((d) => (
                <Chip
                  key={d.value}
                  label={d.label}
                  emoji={d.emoji}
                  selected={draft.difficulty === d.value}
                  onClick={() => onChange({ ...draft, difficulty: d.value })}
                />
              ))}
            </div>
          </div>

          {/* Type */}
          <div className="flex flex-col gap-1.5">
            <span className="font-body text-sm font-bold text-white/80">Type</span>
            <div className="inline-flex rounded-2xl border-2 border-white/25 bg-white/5 p-1">
              {(
                [
                  { value: 'mc' as const, label: 'Multiple Choice' },
                  { value: 'tf' as const, label: 'True / False' },
                ]
              ).map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={[
                    'rounded-xl px-4 py-2 font-body text-sm font-bold transition-colors',
                    draft.type === t.value
                      ? 'bg-grape text-white shadow-glow'
                      : 'text-white/70 hover:text-white',
                  ].join(' ')}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="flex flex-col gap-2">
            <span className="font-body text-sm font-bold text-white/80">
              {draft.type === 'tf' ? 'Correct answer' : 'Options'}
            </span>

            {draft.type === 'tf'
              ? ['True', 'False'].map((label, i) => (
                  <label
                    key={label}
                    className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-white/20 bg-white/5 px-4 py-2"
                  >
                    <input
                      type="radio"
                      name="tf-correct"
                      checked={draft.correctIndex === i}
                      onChange={() => onChange({ ...draft, correctIndex: i })}
                      className="h-4 w-4 accent-mint"
                    />
                    <span className="font-body text-sm font-bold text-white">
                      {label}
                    </span>
                  </label>
                ))
              : draft.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="mc-correct"
                      checked={draft.correctIndex === i}
                      onChange={() => onChange({ ...draft, correctIndex: i })}
                      title="Mark as correct answer"
                      className="h-4 w-4 shrink-0 accent-mint"
                    />
                    <input
                      type="text"
                      value={opt}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setOption(i, e.target.value)
                      }
                      placeholder={`Option ${i + 1}`}
                      className="flex-1 rounded-2xl border-2 border-white/25 bg-white/10 px-4 py-2 font-body text-sm font-semibold text-white outline-none placeholder:text-white/40 focus-visible:ring-4 focus-visible:ring-white/40"
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      disabled={draft.options.length <= 2}
                      title="Remove option"
                      className="shrink-0 rounded-xl border border-white/25 px-3 py-2 font-body text-sm font-bold text-white/80 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ✕
                    </button>
                  </div>
                ))}

            {draft.type === 'mc' && draft.options.length < 4 && (
              <button
                type="button"
                onClick={addOption}
                className="self-start rounded-2xl border-2 border-dashed border-white/30 px-4 py-2 font-body text-sm font-bold text-white/80 hover:bg-white/10"
              >
                + Add option
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => onSave(draft)}>
              💾 Save
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
