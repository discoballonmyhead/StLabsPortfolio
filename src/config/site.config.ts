/**
 * site.config.ts
 * Single source of truth. Every asset path, every word of copy, every project,
 * every tunable, all of it lives in this one file.
 *
 * ─── WHAT IS IN HERE, IN ORDER ───────────────────────────────────────────────
 *
 *   ASSETS            logos, icons, defaults
 *   BRAND             name, tagline, contact
 *   MUSIC PLAYER      track, metadata, drawer peek behaviour
 *   LEADERSHIP        team page people (drives whether the Team nav link shows)
 *   ACCOUNT DELETION  Apps Script endpoint
 *   NAVIGATION        top nav links
 *   HOME PAGE         hero copy
 *   HOME SECTIONS     the panels below the hero
 *   PROJECTS PAGE     headings and section labels
 *   BACKGROUND LOGO   decorative logo placement
 *   TECH BADGES       badge colours and logos
 *   PROJECT TYPES     status, visibility, platform
 *   PRIVACY TYPES     shape of a project's privacy block
 *   PROJECT SHAPE     the ProjectConfig interface
 *   PROJECTS          every project
 *   STATUS PAGES      auth and email confirmation screens
 *   SHAPE TIMELINE    hero particle morph schedule
 *   VISUALIZER        music player boom windows
 *   VOICE ORB         swatches, motion, keyboard bindings
 *   FEATURE FLAGS     on and off switches
 *
 * Everything is reachable through the barrel:
 *   import { homeSections, ORB_SWATCHES, shapeTimeline } from '@/config'
 *
 * The one import at the top is TYPE ONLY. It is erased at compile time, so
 * there is no runtime dependency on the particle system and no import cycle.
 */

import type { ShapeName } from '@/particles/shapes'

// ─────────────────────────────────────────────────────────────────────────────
// ASSETS   all paths relative to /public
// ─────────────────────────────────────────────────────────────────────────────

export const assets = {
  // Brand logos
  logoAnimated: '/logos/light.svg',        // animated brand logo (nav / about)
  logoStatic: '/logos/stlabslogo.svg',   // static fallback
  logoMark: '/logos/stlabs-mark.svg',  // icon only mark

  // Resolve / loading screen
  resolveGif: '/logos/light.svg',

  // Tech / partner logos (custom, not shields.io)
  phaserLogo: '/logos/phaser.png',
  csharpLogo: '/logos/csharp.png',

  // Fallbacks used whenever a project has no cover or icon of its own
  defaultCover: '/defaults/cover.png',     // 1280x720 recommended, 16:9
  defaultIcon: '/defaults/icon.png',      // 256x256 square

  // Per project app icons. Add a key here, then point a project's
  // appIconPath at it, for example: appIconPath: assets.icons.projectKin
  icons: {
    projectBlinkoAdmin: '/icons/blinko-admin.png',
    projectVault: '/icons/project-vault.png',
    projectKin: '/icons/project-kin.png',
    projectFunnyCalculator: '/icons/projectFunnyCalculator.png',
  },
} as const

// ─────────────────────────────────────────────────────────────────────────────
// BRAND
// ─────────────────────────────────────────────────────────────────────────────

export const brand = {
  name: 'Stateless Labs',
  shortName: 'STLABS',
  tagline: 'Execution on Creative Ideas',
  description: 'A studio for the ideas that refuse to leave you alone. Bring the rough version, leave with something real.',
  email: 'info@stateless-labs.com',
  privacyEmail: 'info@stateless-labs.com',
  url: 'https://stateless-labs.com',
} as const

// ─────────────────────────────────────────────────────────────────────────────
// MUSIC PLAYER
// ─────────────────────────────────────────────────────────────────────────────

export const musicConfig = {
  // Drop your audio file in /public/music/ and update src:
  src: '/music/Going Quantum x Psychic Type - Rare [Monstercat Release].mp3',

  // Metadata, update these to match your track:
  title: 'Rare',
  artist: 'Going Quantum x Psychic Type',
  album: 'Monstercat',

  // Album art, drop image in /public/music/ and update path.
  // Set to '' to use the animated vinyl SVG fallback.
  albumArt: '/music/albumart.jpg',

  // ── Drawer peek on load ────────────────────────────────────────────────────
  // The player slides open by itself shortly after the page settles so nobody
  // misses it, then slides away again. The first click, tap, or key press
  // cancels the retreat and hands control back to the visitor.
  autoPeek: true,
  autoPeekDelayMs: 900,    // wait this long after mount before opening
  autoPeekHoldMs: 3200,   // stay open this long before sliding away
} as const

// ─────────────────────────────────────────────────────────────────────────────
// LEADERSHIP / TEAM
// ─────────────────────────────────────────────────────────────────────────────
// Images go in /public/team/. The Team nav link only appears once this array
// has someone in it, so an empty roster never shows an empty page.
//
// Easter eggs: set alterEnabled true plus alterImage and alterGithub, then run
// showAlter('Name') in the browser console. The hidden chairperson is revealed
// with showRealHead().

export const leadership = Object.assign(
  [
    // {
    //   name:         'Your Name',
    //   role:         'Founder',
    //   title:        'Founder and Engineer',
    //   bio:          'Short bio here.',
    //   image:        '/team/you.jpg',
    //   linkedin:     'https://linkedin.com/in/yourhandle',
    //   accent:       '#00FFB2',
    //   region:       'London',
    //   alterEnabled: true,
    //   alterImage:   '/team/you-alt.jpg',
    //   alterName:    'Alt Name',
    //   alterTitle:   'Alt Title',
    //   alterBio:     'Alt bio.',
    //   alterGithub:  'https://github.com/yourhandle',
    // },
  ],
  {
    // trueChairPerson: {
    //   name:   'Hidden Name',
    //   role:   'True Chairperson',
    //   title:  'The one who knows',
    //   bio:    'Behind the curtain.',
    //   image:  '/team/chair.jpg',
    //   github: 'https://github.com/...',
    //   accent: '#FFB800',
    // },
  },
) as any

// ─────────────────────────────────────────────────────────────────────────────
// ACCOUNT DELETION
// ─────────────────────────────────────────────────────────────────────────────
// 1. Create a Google Apps Script web app using deletion-script.gs
// 2. Deploy it (Execute as: Me, Who has access: Anyone)
// 3. Paste the deployed URL below

export const deletionConfig = {
  scriptUrl: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
} as const

// ─────────────────────────────────────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────────────────────────────────────

export const nav = {
  links: [
    { label: 'Home', path: '/' },
    { label: 'Projects', path: '/projects' },
    ...(leadership.length > 0 ? [{ label: 'Team', path: '/team' }] : []),
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// HOME PAGE   hero copy
// ─────────────────────────────────────────────────────────────────────────────
// headline supports \n for a manual line break.

export const homePage = {
  eyebrow: 'Creative Coding · Games · Internal Tooling · Fun Stuff',
  headline: 'Execution on\nCreative Ideas',
  subtext: 'You already have the idea. This is where it stops living in a notes app and turns into something people can open, use, and come back to. Everything ever shipped here is on this site, the wins and the lessons both.',
  ctaLabel: 'See the work',
  ctaPath: '/projects',
  about: 'Stateless Labs is a creative coding studio. The work begins with the part most people skip, which is getting clear on what you are actually trying to make happen and who it is for. After that it gets built properly: prototyped early, refined until it feels obvious to use, and handed over without mystery. There is a quieter side of the shop too, doing cybersecurity tooling and consulting, because software people can trust matters every bit as much as software people enjoy.',
}

// ─────────────────────────────────────────────────────────────────────────────
// HOME SECTIONS   the panels below the hero
// ─────────────────────────────────────────────────────────────────────────────
// Hide any whole section with show: false.
// `visual` picks the abstract panel art: 'grid' | 'stack' | 'signal'

export interface CapabilityItem {
  id: string
  name: string    // small accent label above the title
  title: string    // the headline of the card
  description: string    // one paragraph
  points: string[]  // up to 3 shown as chips
  visual: 'grid' | 'stack' | 'signal' | 'data' | 'shield'
  /** Gives the panel accent borders, a warmer numeral, and a standout label. */
  featured?: boolean
  /** Optional ribbon text shown on a featured panel. */
  featureLabel?: string
}

export interface ApproachPrinciple {
  title: string
  body: string
}

/**
 * A single project highlight. `metric` is animated by the CountUp component,
 * which counts the numeric part and leaves everything else alone, so "6",
 * "100%", "3.4x" and "Zero" all behave sensibly. `slug` is optional and only
 * used to pull the project name and icon in automatically.
 */
export interface HighlightItem {
  slug?: string
  metric: string
  unit?: string
  label: string
  blurb: string
  accent?: string
}

export interface HomeSections {
  capabilities: {
    show: boolean
    heading: string
    intro: string
    items: CapabilityItem[]
  }
  approach: {
    show: boolean
    heading: string
    intro: string
    principles: ApproachPrinciple[]
  }
  highlights: {
    show: boolean
    heading: string
    intro: string
    items: HighlightItem[]
  }
  work: {
    show: boolean
    heading: string
    intro: string
    featuredSlugs: string[]   // must match slug values in projects below
    ctaLabel: string
    ctaPath: string
  }
  contact: {
    show: boolean
    heading: string
    subheadline: string
    ctaLabel: string
    reassurance: string
  }
}

export const homeSections: HomeSections = {

  capabilities: {
    show: true,
    heading: 'Where most projects begin',
    intro: 'Almost everything starts as a rough idea and a hunch that it could work. These are the shapes that idea usually takes once we have talked it through.',
    items: [
      {
        id: 'applications',
        name: 'Applications',
        title: 'Apps people actually keep installed',
        description: 'From a sketch on the back of something to a build sitting on a real device in your hand. Flutter carries most of it, native where the extra effort genuinely pays for itself.',
        points: ['iOS and Android', 'Offline first', 'Store ready'],
        visual: 'stack',
      },
      {
        id: 'cybersecurity',
        name: 'Cybersecurity',
        title: 'Security treated as part of the build, not a box at the end',
        description: 'Threat modelling before the first schema, hardening while the thing is still soft enough to change, and tooling that keeps watching after launch. Auth flows, access rules enforced at the database rather than the client, dependency and secret auditing, and the unglamorous checks that stop a small mistake becoming a public one.',
        points: ['Threat modelling', 'Auth and access control', 'Audits and tooling'],
        visual: 'shield',
        featured: true,
        featureLabel: 'Core practice',
      },
      {
        id: 'data',
        name: 'Data analysis',
        title: 'Numbers that answer the question you actually asked',
        description: 'Pipelines, dashboards, and analysis that turn a pile of rows into something you can make a decision from. Honest about confidence, clear about what the data cannot tell you, and built so the answer survives the next quarter.',
        points: ['Pipelines and ETL', 'Dashboards', 'Reporting you trust'],
        visual: 'data',
      },
      {
        id: 'web',
        name: 'Web',
        title: 'Sites and tools that pull their weight',
        description: 'Product sites, internal dashboards, and the small strange tools nobody sells but plenty of teams quietly need. Quick to load, clear about what they do, easy to hand over when the time comes.',
        points: ['React and TypeScript', 'Custom design', 'Static or dynamic'],
        visual: 'grid',
      },
      {
        id: 'consulting',
        name: 'Consulting',
        title: 'A second opinion from someone who has shipped',
        description: 'Architecture reviews, stack calls, security posture checks, and untangling a codebase that outgrew its plan. Sometimes the most valuable hour is the one that talks you out of building something.',
        points: ['Code review', 'Security review', 'Technical direction'],
        visual: 'signal',
      },
    ],
  },

  highlights: {
    show: true,
    heading: 'What that looks like in practice',
    intro: 'Three decisions from three different projects, and what each one bought.',
    items: [
      {
        slug: 'blinko-admin',
        metric: '6',
        unit: 'platforms',
        label: 'One codebase, six targets',
        blurb: 'Android, iOS, macOS, Windows, Linux, and web from a single Flutter project. Role permissions live in Postgres row level security, so no client side check can be talked around.',
        accent: '#FF6B2B',
      },
      {
        slug: 'project-vault',
        metric: '0',
        unit: 'servers',
        label: 'Nothing leaves the device',
        blurb: 'Credentials and vault contents never touch infrastructure this studio operates. The safest place to store a secret turned out to be the one place nobody else can reach.',
        accent: '#00FFB2',
      },
      {
        slug: 'project-kin',
        metric: '100%',
        unit: 'of the feed',
        label: 'Ordered by time, not by pull',
        blurb: 'No engagement ranking, no infinite scroll, no notification bait. The hard part was proving the product still holds up once you remove the parts designed to trap people.',
        accent: '#F2E9DC',
      },
    ],
  },

  approach: {
    show: true,
    heading: 'How your idea gets built',
    intro: 'No process theatre, and no discovery phase that bills for six weeks before anything exists. This is what actually happens between the first message and something you can open.',
    principles: [
      {
        title: 'Your problem comes before any stack',
        body: 'The interesting decisions are almost never about which framework. They are about what this needs to do, who it is for, and what it can safely refuse to do.',
      },
      {
        title: 'You get something clickable early',
        body: 'Opinions about a document go in circles. Opinions about a working screen get settled in an afternoon, so there is usually something real in your hands inside the first week.',
      },
      {
        title: 'Security is not a final step',
        body: 'Threat modelling happens while the design is still cheap to change, access rules get enforced at the database rather than the client, and the audit is not the first time anyone looks.',
      },
      {
        title: 'Considered beats generated',
        body: 'A lot of software now gets assembled from whatever the tooling suggested first. That is fine for a scaffold and thin as a product. Every decision here is one that can be explained out loud and defended.',
      },
      {
        title: 'One person, straight line to them',
        body: 'A solo studio means no account manager and no telephone game. It also means honest scoping. If your idea is bigger than one pair of hands, you hear that on day one rather than month three.',
      },
      {
        title: 'The keys are yours at the end',
        body: 'Repositories, accounts, credentials, and the notes explaining why things are the way they are. No hostage infrastructure, no bus factor of one. If you ever want to take it elsewhere, nothing here is designed to make that painful.',
      },
    ],
  },

  work: {
    show: true,
    heading: 'Some of what has come out of it',
    intro: 'The full record lives on the projects page, retired experiments included.',
    featuredSlugs: ['blinko-admin', 'project-vault', 'project-kin'],
    ctaLabel: 'See every project',
    ctaPath: '/projects',
  },

  contact: {
    show: true,
    heading: 'What are you trying to build?',
    subheadline: 'Send the rough version. Half formed is welcome, and so is the one that opens with "this is probably stupid, but". The good ones almost always do.',
    ctaLabel: 'Start the conversation',
    reassurance: 'No pitch deck needed. A paragraph and an honest deadline is plenty.',
  },

}

// ─────────────────────────────────────────────────────────────────────────────
// BUILD SEQUENCE   the scroll driven assembly animation
// ─────────────────────────────────────────────────────────────────────────────
// One artifact builds itself on screen as the visitor scrolls past. Each stage
// owns a slice of the scroll, expressed as `from` and `to` in progress units
// where 0 is the moment the section reaches the top of the screen and 1 is the
// moment it leaves. Stages must run in order and should cover 0 through 1
// without gaps, though overlaps are fine and usually look better.
//
// scrollLength is how tall the scroll track is, in vh. Bigger means the
// animation takes more scrolling to get through. Around 320 feels unhurried,
// 220 feels brisk.
//
// Retiming a stage here moves both the animation and the rail beside it. When
// you have a bespoke animation to drop in later, replace the Scene component
// inside BuildSequence.tsx and leave everything in this block alone.

export interface BuildStage {
  id: string
  label: string
  caption: string
  from: number   // 0 to 1
  to: number   // 0 to 1
  color: string
}

export const buildSequence = {
  show: true,
  heading: 'How something goes from idea to shipped',
  intro: 'Scroll through the whole arc. Nothing here is decoration, it is the order the work actually happens in, security included rather than bolted on at the end.',
  scrollLength: 320,   // vh on desktop
  scrollLengthMobile: 240,   // vh on small screens

  stages: [
    {
      id: 'scope',
      label: 'Scope',
      caption: 'Ideas, hard won experience, and expertise pour in. Work out what this needs to do, who it is for, and what it can safely refuse to do.',
      from: 0.00,
      to: 0.18,
      color: '#FF6B2B',
    },
    {
      id: 'build',
      label: 'Build',
      caption: 'Structure goes in early so there is something clickable to argue with inside the first week.',
      from: 0.18,
      to: 0.40,
      color: '#F2E9DC',
    },
    {
      id: 'data',
      label: 'Data',
      caption: 'Real numbers arrive. Pipelines, charts, and the analysis that tells you whether it is working.',
      from: 0.40,
      to: 0.58,
      color: '#00FFB2',
    },
    {
      id: 'secure',
      label: 'Harden',
      caption: 'The whole thing gets sealed from every side. Threat model, access rules at the database, dependency and secret audits, then locks that keep watching long after launch.',
      from: 0.58,
      to: 0.84,
      color: '#FF6B2B',
    },
    {
      id: 'ship',
      label: 'Ship',
      caption: 'Out the door and wired up to the people and businesses that use it. Monitored, and handed over without mystery.',
      from: 0.84,
      to: 1.00,
      color: '#00FFB2',
    },
  ] as BuildStage[],
}

// ─────────────────────────────────────────────────────────────────────────────
// PROJECTS PAGE
// ─────────────────────────────────────────────────────────────────────────────

export const projectsPage = {
  eyebrow: 'Stateless Labs',
  heading: 'Projects',
  subtext: 'Everything, in the open. Live products, quiet internal tools, and the experiments that got retired. No highlight reel, just the work.',
  activeSectionLabel: 'Active',
  inactiveSectionLabel: 'No longer active',
  inactiveNote: 'These had their run and earned their keep in lessons. Links and downloads are switched off, but they stay on the record.',
}

// ─────────────────────────────────────────────────────────────────────────────
// BACKGROUND LOGO
// ─────────────────────────────────────────────────────────────────────────────

export const bgLogoConfig = {
  size: 600,
  opacity: 0.40,
  rightOffset: '-80px',
  topOffset: '50%',
  translateY: '-50%',
  blur: '0px',
  zIndex: 0,
} as const

// ─────────────────────────────────────────────────────────────────────────────
// TECH BADGES
// ─────────────────────────────────────────────────────────────────────────────
// `logo` is a shields.io slug. `customLogo` overrides it with a local image,
// which is how Phaser and C# get their real marks.

export interface TechConfig {
  color: string
  logo?: string
  logoColor?: string
  customLogo?: string
}

export const techConfig: Record<string, TechConfig> = {
  Flutter: { color: '#02569B', logo: 'flutter' },
  Dart: { color: '#0175C2', logo: 'dart' },
  React: { color: '#20232a', logo: 'react', logoColor: '61DAFB' },
  Phaser: { color: 'rgb(54,16,98)', customLogo: assets.phaserLogo },
  JavaScript: { color: '#F7DF1E', logo: 'javascript', logoColor: '000000' },
  TypeScript: { color: '#3178C6', logo: 'typescript', logoColor: 'ffffff' },
  Android: { color: '#3DDC84', logo: 'android', logoColor: '000000' },
  Java: { color: '#ED8B00', logo: 'openjdk' },
  iOS: { color: '#000000', logo: 'apple' },
  Xcode: { color: '#1575F9', logo: 'xcode' },
  Unity: { color: '#100000', logo: 'unity' },
  'C#': { color: '#7B42BC', customLogo: assets.csharpLogo },
  'Unreal Engine': { color: '#313131', logo: 'unrealengine' },
  'C++': { color: '#00599C', logo: 'cplusplus' },
  Supabase: { color: '#3ECF8E', logo: 'supabase', logoColor: '000000' },
  'BLoC': { color: '#2a2a2a', logo: 'flutter' },
  'Clean Architecture': { color: '#1a1a1a' },
  IMAP: { color: '#1a1a1a' },
  Vite: { color: '#646CFF', logo: 'vite', logoColor: 'ffffff' },
  Figma: { color: '#1e1e1e', logo: 'figma', logoColor: 'ffffff' },
  'go_router': { color: '#02569B', logo: 'flutter' },
  'Node.js': { color: '#339933', logo: 'nodedotjs', logoColor: 'ffffff' },
  PostgreSQL: { color: '#336791', logo: 'postgresql', logoColor: 'ffffff' },
  Firebase: { color: '#FFCA28', logo: 'firebase', logoColor: '000000' },
  Python: { color: '#3776AB', logo: 'python', logoColor: 'ffffff' },
  Swift: { color: '#FA7343', logo: 'swift', logoColor: 'ffffff' },
  Kotlin: { color: '#7F52FF', logo: 'kotlin', logoColor: 'ffffff' },
  Go: { color: '#00ADD8', logo: 'go', logoColor: 'ffffff' },
  Rust: { color: '#000000', logo: 'rust', logoColor: 'ffffff' },
}

export const homeStackBadges: string[] = [
  'Flutter', 'Dart', 'React', 'TypeScript',
  'Android', 'iOS', 'Supabase', 'Unity', 'Unreal Engine',
]

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT TYPES
// ─────────────────────────────────────────────────────────────────────────────
// status drives lifecycle grouping on the projects page.
//   Active group:   Live, Beta, In Development
//   Inactive group: Paused, Dead, Archived, Defunct, Abandoned, Discontinued
// Adding a new status means adding a colour for it in src/lib/status.ts too,
// otherwise the build will tell you about it.

export type ProjectStatus =
  | 'Live'
  | 'Beta'
  | 'In Development'
  | 'Paused'
  | 'Dead'
  | 'Archived'
  | 'Defunct'
  | 'Abandoned'
  | 'Discontinued'

// visibility is separate from status. It answers "who is allowed near this",
// not "is it alive". Internal, Internal Testing, and Restricted also suppress
// public store and download links on the card.

export type ProjectVisibility =
  | 'Public'            // default, no badge shown
  | 'Internal'          // built for an internal org
  | 'Internal Testing'  // active internal QA, not released
  | 'Private Beta'      // invite only
  | 'Restricted'        // access requires approval
  | 'Unlisted'          // exists but not promoted

export type Platform = 'Mobile' | 'Web' | 'Desktop' | 'Cross-platform' | 'Internal'

// ─────────────────────────────────────────────────────────────────────────────
// PRIVACY TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface PermissionEntry {
  name: string
  purpose: string
}

export interface PrivacyConfig {
  updated: string
  contact: string
  collectsData: boolean
  summaryOverride?: string
  androidPermission?: boolean
  permissions?: PermissionEntry[]
  dataCollected?: string[]
  internetAccess?: string
  localStorageNote?: string
}

export interface StoreLinks {
  googlePlay?: string
  appStore?: string
  web?: string
  github?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT SHAPE
// ─────────────────────────────────────────────────────────────────────────────

export interface ProjectConfig {
  slug: string
  name: string
  tagline: string
  year: string
  platform: Platform
  status: ProjectStatus
  visibility?: ProjectVisibility   // omit for public projects
  tech: string[]
  label: string
  about: string[]
  features?: string[]
  stackNotes?: string[]
  stores?: StoreLinks
  storeNote?: string
  legalNote?: string
  privacy: PrivacyConfig

  appIconPath?: string    // point at assets.icons.<key>
  hasAuthPages?: boolean
  hasEmailConfirmation?: boolean

  // Media, paths under /public/screenshots/<slug>/
  coverImage?: string             // 16:9 hero thumbnail on the card
  screenshots?: string[]           // omit or leave empty for no carousel

  // Redacted card that opens a meme instead of a detail page
  classified?: boolean
  memeGif?: string

  // Enables /projects/<slug>/delete-account
  deletion?: {
    identifierLabel?: string       // default: 'Email address or username'
    extraNote?: string       // shown below the identifier field
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PROJECTS
// ─────────────────────────────────────────────────────────────────────────────

export const projects: ProjectConfig[] = [
  {
    slug: 'blinko-admin',
    name: 'Blinko Analytics',
    tagline: 'Admin platform for digital business cards, company posts, and team access.',
    year: '2025',
    platform: 'Cross-platform',
    status: 'In Development',
    visibility: 'Internal',
    tech: ['Flutter', 'Dart', 'Supabase'],
    label: 'Mobile App · 2025',
    appIconPath: assets.icons.projectBlinkoAdmin,

    about: [
      'Blinko Analytics is an internal admin application built for the Blinko Analytics company. It gives every team member a digital business card they can present at events, and gives content roles the ability to publish company posts, all from a single Flutter codebase targeting Android, iOS, macOS, Windows, Linux, and web.',
      'The backend is Supabase: Postgres with row level security, file storage for images and QR codes, and Auth for email based sign in with confirmation flows. Role permissions are enforced at the database layer so no client side check can be bypassed.',
    ],

    features: [
      'Digital business cards with QR code, company logo, and selectable gradient background',
      'Landscape presentation mode for business events',
      'Circle avatar overlapping the card corner in presentation view',
      'Role based access: Owner, Admin, Chief, SM, Marketing Head, Editor',
      'Posts editor with Markdown, cover image upload, and draft or live toggle',
      'Multi platform file picker across Android, iOS, macOS, Windows, and web',
      'Email confirmation flow with hosted success, failed, and confirmation pages',
      'Localised in English and Vietnamese',
      'Responsive shell: bottom nav on mobile, rail on tablet, side drawer on desktop',
    ],

    stackNotes: [
      'Flutter 3, single codebase across six platforms',
      'Dart with flutter_bloc and Cubit for state management',
      'Supabase for Auth, Postgres, Storage, and RLS policies',
      'go_router for declarative routing with role based redirects',
      'flutter_localization for EN and VI',
      'file_picker and image_picker for cross platform uploads',
      'share_plus and screenshot for business card sharing',
    ],

    stores: { googlePlay: '#', appStore: '#' },
    storeNote: 'Internal distribution. Available on both major app stores.',
    legalNote: 'Personal data is stored securely via Supabase. No advertising SDKs or third party trackers are used. Users may request deletion of their account and all associated data at any time.',

    privacy: {
      updated: 'June 10, 2026',
      contact: 'privacy@blinko-analytics.com',
      collectsData: true,
      summaryOverride: 'This app collects only what you explicitly provide to build your digital business card and company posts. No tracking, no ads.',
      permissions: [
        { name: 'INTERNET (Android / iOS)', purpose: 'Required to connect to Supabase. The app cannot function without it.' },
        { name: 'READ_MEDIA_IMAGES (Android 13+)', purpose: 'Required to pick a profile photo, company logo, or QR image from your gallery. Only accessed when you tap the upload button.' },
        { name: 'READ_EXTERNAL_STORAGE (Android 12 and below)', purpose: 'Same purpose as above on older Android versions.' },
        { name: 'NSPhotoLibraryUsageDescription (iOS)', purpose: 'Required to pick images from your photo library.' },
        { name: 'NSPhotoLibraryAddUsageDescription (iOS)', purpose: 'Required to save a shared business card image to your camera roll.' },
      ],
      dataCollected: [
        'Email address and hashed password, for account creation and sign in',
        'Full name, job title, phone number, business email, displayed on your digital business card',
        'Company name, website, address, logo, and QR code image, shown on your card',
        'Profile photo, shown in the card presentation view',
        'Posts content and cover images, published to the company blog',
      ],
    },

    hasEmailConfirmation: true,
  },

  {
    slug: 'project-vault',
    name: 'Project Vault',
    tagline: 'Fast, distraction free email on mobile.',
    year: '2025',
    platform: 'Mobile',
    status: 'Live',
    tech: ['Flutter', 'Dart', 'IMAP', 'Android', 'iOS'],
    label: 'Mobile App · 2025',
    appIconPath: assets.icons.projectVault,

    about: [
      'A focused email client that strips away everything unnecessary. Fast inbox loading, clean reading view, and a send flow that stays out of the way. Built for people who want email to feel like a tool, not a product.',
    ],

    features: [
      'IMAP support for any email provider',
      'Clean, distraction free reading view',
      'Fast inbox sync',
      'Send, reply, and forward',
      'Offline reading of cached messages',
    ],

    stores: { googlePlay: '#', appStore: '#' },
    storeNote: 'Available on both major app stores.',
    legalNote: 'Email credentials are stored securely on device only and never transmitted to any external server operated by this studio.',

    privacy: {
      updated: 'February 19, 2026',
      contact: 'info@stateless-labs.com',
      collectsData: false,
      localStorageNote: 'Project Vault does not require any login. All sensitive data you store in the vault is saved locally on your device. No data is backed up to any server or cloud service. If you uninstall the app, all stored data will be permanently lost.',
    },
  },

  {
    slug: 'project-kin',
    name: 'Project Kin',
    tagline: 'Social media built to restore your attention span.',
    year: '2025',
    platform: 'Mobile',
    status: 'In Development',
    tech: ['Flutter', 'Dart', 'Supabase'],
    label: 'Mobile App · 2025',
    appIconPath: assets.icons.projectKin,

    about: [
      'A social media app that aims to remove the manipulation tactics established platforms use to monetise your attention. Kin wants to help you rebuild creativity and find daily inspiration, until you can do it on your own.',
    ],

    privacy: {
      updated: 'February 19, 2026',
      contact: 'info@stateless-labs.com',
      collectsData: false,
    },

    hasAuthPages: true,
  },

  {
    slug: 'calculator',
    name: 'Calculator',
    tagline: 'A clean, minimal calculator for Android and iOS.',
    year: '2024',
    platform: 'Mobile',
    status: 'Live',
    tech: ['Flutter', 'Dart', 'Android', 'iOS'],
    label: 'Mobile App · 2024',
    appIconPath: assets.icons.projectFunnyCalculator,

    about: [
      'A fast, minimal calculator built with Flutter using BLoC state management and Clean Architecture. Supports standard arithmetic, percentages, decimal numbers, and real time expression preview. No ads, no tracking.',
    ],

    features: [
      'Addition, subtraction, multiplication, division',
      'Percentage and decimal support',
      'Expression preview while typing',
      'Works fully offline',
      'No data collection',
      'No permissions required',
    ],

    stores: { googlePlay: '#', appStore: '#' },
    storeNote: 'Available on both major app stores.',
    legalNote: 'No personal data is collected. No permissions beyond optional haptic feedback on Android. No network access.',

    privacy: {
      updated: 'February 19, 2026',
      contact: 'info@stateless-labs.com',
      collectsData: false,
      androidPermission: true,
    },
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// STATUS PAGES   auth and email confirmation
// ─────────────────────────────────────────────────────────────────────────────

export type StatusPageType =
  | 'auth-success' | 'auth-failed'
  | 'email-sent' | 'email-confirmed' | 'email-failed'

export interface StatusPageConfig {
  type: StatusPageType
  headline: string
  accent: string
  bg: string
  statusCode?: string
  statusLabel: string
  body: string
  logLines: string[]
  primaryCta: { label: string; href: string }
  secondaryCta: { label: string; path: string }
  footer: string
}

export const statusPages: Record<StatusPageType, StatusPageConfig> = {
  'auth-success': {
    type: 'auth-success',
    headline: 'Access\nGranted.',
    accent: '#4ade80',
    bg: '#050a05',
    statusCode: '200',
    statusLabel: 'Authentication Successful',
    body: 'Identity verified. You can return to the application, this window will close automatically.',
    logLines: ['oauth token validated', 'session created', 'permissions granted'],
    primaryCta: { label: 'Open App', href: '#' },
    secondaryCta: { label: 'Back', path: '/' },
    footer: 'SECURE SESSION',
  },
  'auth-failed': {
    type: 'auth-failed',
    headline: 'Access\nDenied.',
    accent: '#f87171',
    bg: '#0a0505',
    statusCode: '401',
    statusLabel: 'Authentication Failed',
    body: 'The authentication attempt could not be completed. This may be due to an expired session, cancelled request, or invalid credentials.',
    logLines: ['token exchange failed', 'session not created', 'access revoked'],
    primaryCta: { label: 'Try Again', href: '#' },
    secondaryCta: { label: 'Back', path: '/' },
    footer: 'SESSION ENDED',
  },
  'email-sent': {
    type: 'email-sent',
    headline: 'Message\nDelivered.',
    accent: '#7c6fcd',
    bg: '#09080a',
    statusCode: undefined,
    statusLabel: 'Sent',
    body: 'The confirmation email is on its way. Check your inbox and follow the link to complete sign up.',
    logLines: ['message queued', 'smtp handshake complete', 'delivery confirmed'],
    primaryCta: { label: 'Open App', href: '#' },
    secondaryCta: { label: 'Back', path: '/' },
    footer: 'EMAIL CONFIRMATION',
  },
  'email-confirmed': {
    type: 'email-confirmed',
    headline: 'Email\nVerified.',
    accent: '#4ade80',
    bg: '#050a05',
    statusCode: '200',
    statusLabel: 'Confirmed',
    body: 'Your email address has been verified. Your account is now active.',
    logLines: ['token validated', 'email marked verified', 'account activated'],
    primaryCta: { label: 'Open App', href: '#' },
    secondaryCta: { label: 'Back', path: '/' },
    footer: 'ACCOUNT ACTIVE',
  },
  'email-failed': {
    type: 'email-failed',
    headline: 'Verification\nFailed.',
    accent: '#f87171',
    bg: '#0a0505',
    statusCode: '400',
    statusLabel: 'Confirmation Failed',
    body: 'The verification link has expired or is invalid. Please request a new confirmation email.',
    logLines: ['token invalid or expired', 'email not verified', 'action required'],
    primaryCta: { label: 'Resend Email', href: '#' },
    secondaryCta: { label: 'Back', path: '/' },
    footer: 'ACTION REQUIRED',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// SHAPE TIMELINE   hero particle morph schedule
// ─────────────────────────────────────────────────────────────────────────────
// Every song time interval for the hero lives here.
//
//   timelineConfig  the rhythm knobs
//   SEQUENCE        the order shapes cycle in, repeats for the whole track
//   shapeTimeline   generated from those two, one entry per arrival
//
// Semantics: each shape is FULLY FORMED at its `at` second, and the morph into
// it fills `morphDuration` seconds immediately before that moment.
//
// Want manual control? Delete the buildTimeline() call and export a hand
// written array instead. Nothing downstream cares where the entries came from.

export const timelineConfig = {
  firstHold: 4.5,   // seconds the logo stays fully intact at the start
  interval: 2.8,   // seconds between each later shape's arrival
  morphDuration: 0.8,   // seconds each transition takes
  trackLength: 240,   // generate entries up to here, extras are harmless
} as const

export const SEQUENCE: ShapeName[] = [
  'statelessLogo',
  'icosphere',
  'tesseract',
  'dodecahedron',
  'galaxy',
  'blackHole',
  'androGalaxy',
  'dnaHelix',
  'torusKnot',
  'stellated',
  'hyperboloid',
  'superEllipsoid',
  'trefoil',
  'lissajous',
  'mobiusTube',
  'shell',
  'roseCurve',
]

export interface ShapeTimelineEntry {
  at: number      // seconds into the track, shape fully formed here
  shape: ShapeName
  color?: string      // optional per shape colour override
}

function buildTimeline(): ShapeTimelineEntry[] {
  const { firstHold, interval, morphDuration, trackLength } = timelineConfig
  const out: ShapeTimelineEntry[] = [{ at: 0, shape: SEQUENCE[0] }]
  let t = firstHold + morphDuration
  let i = 1
  while (t < trackLength) {
    out.push({ at: Math.round(t * 100) / 100, shape: SEQUENCE[i % SEQUENCE.length] })
    t += interval
    i++
  }
  return out
}

export const shapeTimeline: ShapeTimelineEntry[] = buildTimeline()

// ─────────────────────────────────────────────────────────────────────────────
// VISUALIZER WINDOWS   music player boom phases
// ─────────────────────────────────────────────────────────────────────────────
//   'retro'  calm phase, bars and peak ticks only
//   'glitch' boom phase, embers, lingering motes, waves, RGB shift
// start and end are seconds into the track. Add, move, or resize freely.

export interface VisualizerWindow {
  start: number
  end: number
  type: 'retro' | 'glitch'
}

export const visualizerWindows: VisualizerWindow[] = [
  { start: 52, end: 99, type: 'retro' },   // 0:52 to 1:39
  { start: 172, end: 222, type: 'glitch' },   // 2:52 to 3:42
]

// ─────────────────────────────────────────────────────────────────────────────
// VOICE ORB
// ─────────────────────────────────────────────────────────────────────────────
// Colour comes from a swatch, movement comes from ORB_MOTION, and every
// control is a key listed in ORB_KEYS. The orb reads all of this at runtime,
// so adding a swatch here immediately adds a chip to its info panel.

export interface OrbSwatch {
  id: string
  label: string
  colors: string[]   // cycles across shapes as the orb morphs, five reads well
  far: string     // deep tone particles fade toward at depth
  glow: string     // bloom colour as a bare "r,g,b" string, no rgb() wrapper
  accent: string     // header dot, chip highlight, active states
}

export const ORB_SWATCHES: OrbSwatch[] = [
  {
    id: 'cosmic-orange',
    label: 'Cosmic',
    colors: ['#FF6B2B', '#FFA35C', '#FFB347', '#FF8C55', '#F2E9DC'],
    far: '#1A0A04',
    glow: '255,107,43',
    accent: '#FF8C55',
  },
  {
    id: 'ice-blue',
    label: 'Ice',
    colors: ['#4DA6FF', '#61DAFF', '#1BCAFF', '#C8E8FF', '#7C9FFF'],
    far: '#04101F',
    glow: '77,166,255',
    accent: '#61DAFF',
  },
  {
    id: 'mint',
    label: 'Mint',
    colors: ['#00FFB2', '#4DFFCF', '#00E5A0', '#8CF5D2', '#E8FFF6'],
    far: '#031A12',
    glow: '0,255,178',
    accent: '#00FFB2',
  },
  {
    id: 'ember',
    label: 'Ember',
    colors: ['#FF4500', '#FF6B2B', '#FF9A5C', '#FFD9A0', '#FFF3E4'],
    far: '#1C0600',
    glow: '255,69,0',
    accent: '#FF7A3C',
  },
  {
    id: 'lime',
    label: 'Lime',
    colors: ['#B2FF4D', '#39FF14', '#8CF54D', '#D6FFA8', '#F4FFE8'],
    far: '#0C1A02',
    glow: '178,255,77',
    accent: '#B2FF4D',
  },
  {
    id: 'bone',
    label: 'Bone',
    colors: ['#F2E9DC', '#FFFFFF', '#D8CFC2', '#E8E8E8', '#C8C8C8'],
    far: '#111111',
    glow: '242,233,220',
    accent: '#E8E0D4',
  },
  {
    id: 'violet',
    label: 'Violet',
    colors: ['#A07AFF', '#C8A8FF', '#7C5CFF', '#E0D0FF', '#F2ECFF'],
    far: '#0D0620',
    glow: '160,122,255',
    accent: '#A07AFF',
  },
]

/** Which swatch each orb opens with. Must match an id above. */
export const ORB_DEFAULT_SWATCH: Record<'blue' | 'orange', string> = {
  blue: 'ice-blue',
  orange: 'cosmic-orange',
}

/** How each orb moves. Blue is the restless one, orange is calm. */
export const ORB_MOTION: Record<'blue' | 'orange', {
  noiseAmp: number
  noiseSpeed: number
  jitter: number
  breathe: number
}> = {
  orange: { noiseAmp: 1.00, noiseSpeed: 1.0, jitter: 0.020, breathe: 0.030 },
  blue: { noiseAmp: 1.75, noiseSpeed: 1.9, jitter: 0.055, breathe: 0.048 },
}

// One source of truth for controls: the key handler matches on `key`, the info
// panel prints `display` and `label`. Change a key here and both follow.
// Keys reach whichever orb the pointer is over, and are ignored entirely while
// the title field has focus.

export interface OrbBinding {
  key: string   // matched against event.key, lower cased
  display: string   // what the info panel shows
  label: string   // what it does
}

export const ORB_KEYS: Record<string, OrbBinding> = {
  nextShape: { key: 'e', display: 'E', label: 'Next shape' },
  prevShape: { key: 'q', display: 'Q', label: 'Previous shape' },
  toggleAuto: { key: 'c', display: 'C', label: 'Auto cycle on or off' },
  toggleSpin: { key: 'z', display: 'Z', label: 'Spin on or off' },
  nextColor: { key: 'x', display: 'X', label: 'Next colour' },
  prevColor: { key: 'w', display: 'W', label: 'Previous colour' },
  toggleMic: { key: 'm', display: 'M', label: 'Mic reactivity on or off' },
  toggleRec: { key: 'r', display: 'R', label: 'Start or stop recording' },
  reset: { key: 'g', display: 'G', label: 'Reset to defaults' },
  toggleInfo: { key: 'i', display: 'I', label: 'Show or hide this panel' },
  close: { key: 'escape', display: 'Esc', label: 'Close the orb' },
}

/** Ordered list used to render the help panel. */
export const ORB_KEY_LIST: OrbBinding[] = Object.values(ORB_KEYS)

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE FLAGS
// ─────────────────────────────────────────────────────────────────────────────

export const flags = {
  showParticleBackground: true,
  showBgLogoOnHome: true,
} as const