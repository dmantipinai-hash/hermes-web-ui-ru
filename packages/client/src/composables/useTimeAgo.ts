import { useI18n } from 'vue-i18n'

export function useTimeAgo() {
  const { t } = useI18n()

  function timeAgo(ts: number): string {
    const diff = Date.now() - ts
    const seconds = Math.floor(diff / 1000)
    if (seconds < 60) return t('timeAgo.seconds', { n: seconds })
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return t('timeAgo.minutes', { n: minutes })
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return t('timeAgo.hours', { n: hours })
    const days = Math.floor(hours / 24)
    return t('timeAgo.days', { n: days })
  }

  function formatTime(seconds: number): string {
    if (seconds < 60) return `${seconds}s`
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    if (m < 60) return `${m}m ${s}s`
    const h = Math.floor(m / 60)
    return `${h}h ${m % 60}m`
  }

  return { timeAgo, formatTime }
}
