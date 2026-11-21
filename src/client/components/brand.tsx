import type { HeroBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import cityImage from '../assets/inkopolis-square.png'

interface SquidMarkProps {
  size: number
  className?: string
}

export function SquidMark({ size, className }: SquidMarkProps): React.JSX.Element {
  return <svg aria-hidden="true" className={`splat-ui-brand__mark ${className ?? ''}`.trim()} width={size} height={size} />
}

export function BrandName(): React.JSX.Element {
  return (
    <span className="splat-ui-brand__name">
      <strong>SPLAT-STREET</strong>
      <small>
        <span>DSH THEME</span>
        <i className="splat-ui-brand__stripes" aria-hidden="true" />
      </small>
    </span>
  )
}

/**
 * The reference-based square is embedded as a transparent raster. Signs,
 * lettering and ink accents stay separate in the SVG coordinate system.
 */
function HeroScene(): React.JSX.Element {
  return (
    <svg aria-hidden="true" className="splat-ui-hero__scene" viewBox="0 0 960 390" preserveAspectRatio="xMidYMin meet" fill="none">
      <defs>
        <pattern id="splat-scene-dots-pink" width="9" height="9" patternUnits="userSpaceOnUse">
          <circle cx="2.2" cy="2.2" r="1.5" fill="#ff2d8a" />
        </pattern>
        <pattern id="splat-scene-dots-purple" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)">
          <circle cx="8" cy="8" r="2.2" fill="#a24b97" />
        </pattern>
        <linearGradient id="splat-city-edge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".85" stopColor="#ffffff" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="splat-city-rail-edge" gradientUnits="userSpaceOnUse" x1="190" y1="110" x2="290" y2="30">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".3" stopColor="#ffffff" />
          <stop offset=".7" stopColor="#777777" />
          <stop offset="1" stopColor="#000000" />
        </linearGradient>
        <mask id="splat-city-mask">
          <rect x="30" width="900" height="300" fill="url(#splat-city-edge)" />
          {/* Fade along the rail, keeping the whale and skyline outside this patch. */}
          <path d="M30 0h440L338 82 236 166H30Z" fill="url(#splat-city-rail-edge)" />
        </mask>
      </defs>

      {/* A translucent printed scrap connects the lime swipe to the title paper. */}
      <g className="splat-ui-hero__left-patch">
        <path d="m108 260 140-23-36 113-154 20Z" fill="#be63b6" opacity={0.2} />
        <path d="m108 260 140-23-36 113-154 20Z" fill="url(#splat-scene-dots-purple)" opacity={0.48} />
        <g fill="#a24b97" opacity={0.55}>
          <path d="m102 324 5 10 11-1-8 8 3 11-10-5-9 6 1-11-9-6 11-2Z" />
          <path d="m145 280 4 8 9-1-6 7 2 8-8-3-7 5 1-9-7-5 8-2Z" />
        </g>
      </g>

      {/* A pooled impact opens into a thinner, curved lime trail. */}
      <g fill="var(--splat-lime-solid, #1edc00)">
        <path d="M64 238c-10-1-19-8-17-14 2-7 10-5 17 0 7 5 12 4 11-3-2-10-10-22-3-25 8-4 13 12 19 18 7 7 13 4 15-5 2-8 7-12 12-8 5 5-1 14 4 19 8 8 29 1 48-1 40-5 79-2 116 5-38 0-72 3-105 11 33-5 62-5 87-3-41 6-79 17-116 27-22 6-34 5-46 4-8 0-8 5-7 11 2 9-7 12-12 4-3-5-2-13-7-16-5-3-13 6-20 3-6-3-2-9 4-13 6-4 5-7 0-8-8-2-18 1-19-5-1-5 9-6 17-5 5 1 6-3 2-5Z" />
        <path d="M48 207c-7-1-15-7-13-12 3-7 13-1 17 5 3 4 1 8-4 7ZM34 244c-4 3-12 3-13-2-1-5 6-7 11-5 4 1 5 4 2 7Z" />
        <ellipse cx="56" cy="279" rx="4" ry="2.8" transform="rotate(-28 56 279)" />
      </g>

      <image className="splat-ui-hero__city" href={cityImage} x="30" y="0" width="900" height="300" mask="url(#splat-city-mask)" />

      {/* The magenta sweep ends in rounded splash fingers and satellite drops. */}
      <g fill="#ff2d8a">
        <path d="M520 286C580 270 641 258 700 254c34-3 57-13 82-14 15-1 24-5 20-14-4-8-14-14-9-19 6-6 17 7 23 12 8 7 17 6 29-3 20-15 50-34 58-26 9 10-22 29-36 43-9 9-5 14 7 11 14-3 31-14 38-8 10 10-12 19-29 22-12 2-17 7-8 13 9 7 25 8 23 16-3 11-24-3-35-3-12-1-14 7-11 16 3 9-5 11-10 2-6-10-10-16-23-16-19 1-35 7-53 4-19-3-29-7-52-2-52 11-108 15-163 15-20 0-40 1-55-2 14-5 30-8 47-10-11 1-21 1-33 1Z" />
        <path d="M920 177c2-8 11-17 16-13 6 5-4 15-10 17-5 1-7-1-6-4ZM926 230c6-4 16-5 17 1 1 6-10 9-15 7-5-1-6-5-2-8ZM909 282c7 1 17 8 13 13-4 6-13-2-16-7-2-4-1-6 3-6Z" />
        <ellipse cx="947" cy="154" rx="3.5" ry="2.3" transform="rotate(-42 947 154)" />
        <circle cx="939" cy="265" r="2.3" />
      </g>

      {/* A separate sign sits inside the square's central advertising screen. */}
      <g>
        <path d="m458 202 96-2 5 49-107 2Z" fill="#ff2d8a" />
        <text x="506" y="239" textAnchor="middle" className="splat-ui-hero__billboard-text">
          2
        </text>
      </g>

      {/* SPLAT-STREET tape. */}
      <g transform="translate(-16 46) rotate(-6 175 28)">
        <path d="m94 2 238 2-3 43-239 5Z" fill="var(--splat-lime-solid, #1edc00)" />
        <path d="M89 8h238l-3 15 3 5-3 6 1 20H89l2-18-3-6 3-6Z" className="splat-ui-hero__tape" />
        <path d="M89 8h14l1 46H89l2-18-3-6 3-6Z" fill="#ff2d8a" />
        <text x="216" y="39" textAnchor="middle" className="splat-ui-hero__tape-text">
          SPLAT-<tspan className="splat-ui-hero__tape-accent">STREET</tspan>
        </text>
      </g>

      {/* Both modes share the same halftone and star sticker. */}
      <g className="splat-ui-hero__stickers" transform="translate(0 145)">
        <rect x="768" y="98" width="86" height="86" fill="url(#splat-scene-dots-pink)" opacity={0.8} transform="rotate(-8 811 141)" />
        <path d="m814 96 8 24 25 2-19 17 6 25-22-13-23 13 7-25-20-17 25-2Z" fill="currentColor" />
      </g>

      {/* Detached drops stretch along the direction of their splash. */}
      <g fill="#ff2d8a">
        <path d="M137 120c-6-4-11-14-6-18 6-5 16 4 16 11 0 7-5 10-10 7ZM885 78c-8-3-11-10-7-17 5-10 24-17 28-11 4 7-5 23-12 27-3 2-6 2-9 1Z" />
        <ellipse cx="916" cy="44" rx="4.5" ry="2.8" transform="rotate(-40 916 44)" />
        <circle cx="873" cy="90" r="2.8" />
      </g>
      <g fill="var(--splat-lime-solid, #1edc00)">
        <path d="M897 303c-4-4-2-11 4-18 6-7 15-13 19-9 5 5-1 20-8 26-5 5-11 5-15 1Z" />
        <ellipse cx="924" cy="266" rx="4.5" ry="2.8" transform="rotate(-48 924 266)" />
      </g>
    </svg>
  )
}

export function HeroBrandMark(_props: HeroBrandMarkOwnerProps): React.JSX.Element {
  return (
    <span className="splat-ui-hero__brand">
      <HeroScene />
    </span>
  )
}
