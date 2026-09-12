import { useEffect, useMemo, useState } from 'react'
import { LogIn, Search } from 'lucide-react'
import type { PublicNoteListItem } from '@shared/types'
import { api } from '../../lib/api'
import { cn } from '../../lib/cn'
import { shortTime } from '../../lib/time'
import { Avatar, Logo, Spinner } from '../../components/primitives'
import { Empty } from '../../components/feedback'
import { t } from '../../lib/i18n'

export function PublicGallery() {
  const [notes, setNotes] = useState<PublicNoteListItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeFolder, setActiveFolder] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    api.share
      .list(controller.signal)
      .then(setNotes)
      .catch((err) => {
        if ((err as Error)?.name !== 'AbortError') {
          setError(err instanceof Error ? err.message : String(err))
        }
      })
    return () => controller.abort()
  }, [])

  const folders = useMemo(() => {
    const set = new Set<string>()
    for (const note of notes ?? []) {
      if (note.folder) set.add(note.folder)
    }
    return [...set]
  }, [notes])

  const filtered = useMemo(() => {
    if (!notes) return null
    const q = query.trim().toLowerCase()
    return notes.filter((note) => {
      if (activeFolder && note.folder !== activeFolder) return false
      if (!q) return true
      return (
        note.title.toLowerCase().includes(q) ||
        note.excerpt.toLowerCase().includes(q) ||
        note.author.name.toLowerCase().includes(q) ||
        note.tags.some((tag) => tag.toLowerCase().includes(q))
      )
    })
  }, [notes, activeFolder, query])

  return (
    <div className="min-h-full overflow-y-auto bg-[var(--bg-base)]">
      <header className="sticky top-0 z-10 border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1120px] items-center gap-3 px-4 md:px-6">
          <a href="/" className="flex items-center gap-2.5">
            <Logo size={28} />
            <span className="text-[16px] font-bold tracking-[-0.01em] text-[var(--text-primary)]">
              {t('common.product_name')}
            </span>
          </a>
        </div>

        <div className="mx-auto flex max-w-[1120px] items-center gap-4 px-4 pb-3 md:px-6">
          <nav className="flex items-center gap-1 overflow-x-auto">
            <NavItem active={activeFolder === null} onClick={() => setActiveFolder(null)}>
              {t('public.home')}
            </NavItem>
            {folders.map((folder) => (
              <NavItem key={folder} active={activeFolder === folder} onClick={() => setActiveFolder(folder)}>
                {folder}
              </NavItem>
            ))}
          </nav>
          <span className="flex-1" />
          <SearchBox value={query} onChange={setQuery} className="hidden md:block" />
          <a
            href="/login"
            aria-label={t('public.sign_in')}
            title={t('public.sign_in')}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-tertiary)] transition-colors hover:border-[#3b82f6]/40 hover:text-[#3b82f6]"
          >
            <LogIn size={17} />
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-[1120px] px-4 py-8 md:px-6 md:py-10">
        <div className="mb-8 md:mb-10">
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-[var(--text-primary)] md:text-[34px]">
            {t('common.product_name')}
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-tertiary)] md:text-[15px]">
            {t('public.hero_subtitle')}
          </p>
        </div>

        <div className="mb-6 md:hidden">
          <SearchBox value={query} onChange={setQuery} className="w-full" />
        </div>

        {notes === null && !error ? (
          <div className="flex justify-center py-24">
            <Spinner size={20} />
          </div>
        ) : error ? (
          <Empty art="notes" compact title={t('public.empty_title')} description={error} />
        ) : !filtered || filtered.length === 0 ? (
          <Empty
            art="notes"
            compact
            title={t('public.empty_title')}
            description={activeFolder || query ? t('public.empty_filter') : t('public.empty_desc')}
          />
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {filtered.map((note) => (
              <NoteRow key={note.slug} note={note} />
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-[var(--border-subtle)] py-8 text-center text-[12px] text-[var(--text-quaternary)]">
        © {new Date().getFullYear()} {t('common.product_name')}
      </footer>
    </div>
  )
}

function SearchBox({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <label className={cn('relative block', className)}>
      <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-quaternary)]" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t('public.search_placeholder')}
        className="h-9 w-full rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] pl-9 pr-3 text-[12.5px] text-[var(--text-primary)] placeholder:text-[var(--text-quaternary)] transition-colors focus:border-[#3b82f6] focus:outline-none md:w-56"
      />
    </label>
  )
}

function NavItem({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative shrink-0 whitespace-nowrap px-3 py-1.5 text-[13px] font-medium transition-colors',
        active
          ? 'text-[var(--text-primary)]'
          : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]',
      )}
    >
      {children}
      {active && (
        <span className="pointer-events-none absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-gradient-to-r from-[#3b82f6] to-[#22d3ee]" />
      )}
    </button>
  )
}

function NoteRow({ note }: { note: PublicNoteListItem }) {
  return (
    <a href={`/s/${note.slug}`} className="group flex flex-col gap-1.5 py-5 transition-colors">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-[16px] font-semibold leading-snug tracking-[-0.01em] text-[var(--text-primary)] transition-colors group-hover:text-[#3b82f6]">
          {note.title || t('common.untitled_note')}
        </h2>
        <time className="shrink-0 text-[12px] tabular text-[var(--text-quaternary)]">
          {shortTime(note.updatedAt)}
        </time>
      </div>
      {note.excerpt && (
        <p className="line-clamp-2 text-[13px] leading-relaxed text-[var(--text-tertiary)]">
          {note.excerpt}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-[var(--text-quaternary)]">
        <span className="flex items-center gap-1.5">
          <Avatar src={note.author.avatarUrl} name={note.author.name} size={18} />
          {note.author.name}
        </span>
        {note.folder && <span className="text-[#3b82f6]">{note.folder}</span>}
        {note.tags.slice(0, 3).map((tag) => (
          <span key={tag}>#{tag}</span>
        ))}
      </div>
    </a>
  )
}
