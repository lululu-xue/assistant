'use client'

import { useRouter, usePathname } from 'next/navigation'

export default function TagFilter({ tags, active }: { tags: string[]; active: string }) {
  const router = useRouter()
  const pathname = usePathname()

  function handleSelect(tag: string) {
    const params = new URLSearchParams()
    if (tag !== '全部') params.set('tag', tag)
    const qs = params.toString()
    router.push(pathname + (qs ? '?' + qs : ''))
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {tags.map((tag) => (
        <button
          key={tag}
          onClick={() => handleSelect(tag)}
          className={`px-3 py-1.5 rounded-xl text-sm transition-colors ${
            active === tag
              ? 'bg-[#3370FF] text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-[#3370FF]/40 hover:text-[#3370FF]'
          }`}
        >
          {tag}
        </button>
      ))}
    </div>
  )
}
