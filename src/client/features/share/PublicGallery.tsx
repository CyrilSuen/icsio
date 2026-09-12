import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import type { PublicNoteListItem } from '@shared/types'
import { api } from '../../lib/api'
import { cn } from '../../lib/cn'
import { shortTime } from '../../lib/time'
import { Avatar, Logo, Spinner } from '../../components/primitives'
import { Empty } from '../../components/feedback'
import { t } from '../../lib/i18n'
import { PUBLIC_NAV_LINKS } from '@shared/site-config'

export function PublicGallery() {
  const [notes, setNotes] = useState<PublicNoteListItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeFolder, setActiveFolder] = useState<string | null>(null)
  const [activeTag, setActiveTag] = useState<string | null>(null)
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
    return [...set].sort()
  }, [notes])

  const tagCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const note of notes ?? []) {
      for (const tag of note.tags) map.set(tag, (map.get(tag) ?? 0) + 1)
    }
    return map
  }, [notes])

  const sortedTags = useMemo(
    () =>
      [...tagCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 18)
        .map(([tag]) => tag),
    [tagCounts],
  )

  const filtered = useMemo(() => {
    if (!notes) return null
    const q = query.trim().toLowerCase()
    return notes.filter((note) => {
      if (activeFolder && note.folder !== activeFolder) return false
      if (activeTag && !note.tags.includes(activeTag)) return false
      if (!q) return true
      return (
        note.title.toLowerCase().includes(q) ||
        note.excerpt.toLowerCase().includes(q) ||
        note.author.name.toLowerCase().includes(q) ||
        note.tags.some((tag) => tag.toLowerCase().includes(q))
      )
    })
  }, [notes, activeFolder, activeTag, query])

  const hasFilter = Boolean(activeFolder || activeTag || query.trim())

  return (
    <div className="min-h-full overflow-y-auto bg-[var(--bg-base)]">
      <header className="sticky top-0 z-10 border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1120px] items-center gap-4 px-4 md:px-6">
          <a href="/" className="flex shrink-0 items-center gap-2.5">
            <Logo size={28} />
            <span className="hidden text-[16px] font-bold tracking-[-0.01em] text-[var(--text-primary)] sm:inline">
              {t('common.product_name')}
            </span>
          </a>
          <nav className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
            <NavItem active={activeFolder === null} onClick={() => setActiveFolder(null)}>
              {t('public.home')}
            </NavItem>
            {folders.map((folder) => (
              <NavItem key={folder} active={activeFolder === folder} onClick={() => setActiveFolder(folder)}>
                {folder}
              </NavItem>
            ))}
            {PUBLIC_NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 whitespace-nowrap px-3 py-1.5 text-[13px] font-medium text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
              >
                {t(link.labelKey)}
              </a>
            ))}
          </nav>
          <SearchBox value={query} onChange={setQuery} className="hidden shrink-0 md:block" />
          <a
            href="/login"
            className="shrink-0 bg-gradient-to-r from-[#3b82f6] to-[#22d3ee] bg-clip-text text-[13.5px] font-semibold tracking-[-0.01em] text-transparent transition-opacity hover:opacity-70"
          >
            {t('public.sign_in')}
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-[1120px] px-4 md:px-6">
        <section className="relative py-10 md:py-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 top-0 size-72 rounded-full bg-[radial-gradient(circle,rgba(79,141,247,0.10),transparent_70%)]"
          />
          <h1 className="text-[30px] font-bold tracking-[-0.02em] text-[var(--text-primary)] md:text-[40px]">
            {t('common.product_name')}
          </h1>
          <p className="mt-3 max-w-[620px] text-[15px] leading-relaxed text-[var(--text-tertiary)]">
            {t('public.hero_subtitle')}
          </p>
        </section>

        <div className="mb-6 md:hidden">
          <SearchBox value={query} onChange={setQuery} className="w-full" />
        </div>

        <div className="grid gap-10 pb-16 md:grid-cols-[minmax(0,1fr)_300px]">
          <main>
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
                description={hasFilter ? t('public.empty_filter') : t('public.empty_desc')}
              />
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {filtered.map((note) => (
                  <NoteRow key={note.slug} note={note} />
                ))}
              </div>
            )}
          </main>

          <aside className="space-y-6">
            {sortedTags.length > 0 && (
              <TagsWidget tags={sortedTags} counts={tagCounts} activeTag={activeTag} onSelect={setActiveTag} />
            )}
            <AboutWidget />
          </aside>
        </div>
      </div>

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
        className="h-9 w-full rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] pl-9 pr-3 text-[12.5px] text-[var(--text-primary)] placeholder:text-[var(--text-quaternary)] transition-colors focus:border-[#3b82f6] focus:outline-none md:w-52"
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

function Widget({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[16px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-quaternary)]">
        {title}
      </h3>
      {children}
    </section>
  )
}

function TagsWidget({
  tags,
  counts,
  activeTag,
  onSelect,
}: {
  tags: string[]
  counts: Map<string, number>
  activeTag: string | null
  onSelect: (tag: string | null) => void
}) {
  return (
    <Widget title={t('public.tags')}>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => {
          const active = activeTag === tag
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onSelect(active ? null : tag)}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] transition-colors',
                active
                  ? 'bg-[#2563eb] text-white'
                  : 'bg-[var(--bg-inset)] text-[var(--text-tertiary)] hover:bg-[#3b82f6]/12 hover:text-[#2563eb]',
              )}
            >
              #{tag}
              <span className={cn('tabular', active ? 'text-white/70' : 'text-[var(--text-quaternary)]')}>
                {counts.get(tag) ?? 0}
              </span>
            </button>
          )
        })}
      </div>
    </Widget>
  )
}

function AboutWidget() {
  return (
    <Widget title={t('public.about')}>
      <div className="flex items-start gap-2.5">
        <Logo size={32} />
        <div className="min-w-0">
          <div className="text-[13.5px] font-semibold text-[var(--text-primary)]">
            {t('common.product_name')}
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-tertiary)]">
            {t('public.hero_subtitle')}
          </p>
        </div>
      </div>
    </Widget>
  )
}

function NoteRow({ note }: { note: PublicNoteListItem }) {
  return (
    <a href={`/s/${note.slug}`} className="group flex flex-col gap-1.5 py-5 transition-colors">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-[17px] font-semibold leading-snug tracking-[-0.01em] text-[var(--text-primary)] transition-colors group-hover:text-[#3b82f6]">
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
