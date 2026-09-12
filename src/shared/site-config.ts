import type { MessageKey } from './locales/en-US'

export interface PublicNavLink {
  href: string
  labelKey: MessageKey
}

export const PUBLIC_NAV_LINKS: PublicNavLink[] = [
  { href: 'https://github.com/CyrilSuen/icsio', labelKey: 'common.github' },
]
