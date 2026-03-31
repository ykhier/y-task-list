import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 7,
          background: '#3b82f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
          <line x1="16" x2="16" y1="2" y2="6" />
          <line x1="8" x2="8" y1="2" y2="6" />
          <line x1="3" x2="21" y1="10" y2="10" />
          <line x1="8" x2="8" y1="14" y2="14" />
          <line x1="12" x2="12" y1="14" y2="14" />
          <line x1="16" x2="16" y1="14" y2="14" />
          <line x1="8" x2="8" y1="18" y2="18" />
          <line x1="12" x2="12" y1="18" y2="18" />
          <line x1="16" x2="16" y1="18" y2="18" />
        </svg>
      </div>
    ),
    { ...size },
  )
}
