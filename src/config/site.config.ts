/**
 * site.config.ts
 * Single source of truth. Every asset path, copy, project, and flag lives here.
 */

// ─────────────────────────────────────────────────────────────────────────────
// ASSETS  — all paths relative to /public
// ─────────────────────────────────────────────────────────────────────────────

export const assets = {
  // Brand logos
  logoAnimated: '/logos/light.svg',   // animated brand logo (nav / about)
  logoStatic: '/logos/stlabslogo.svg',            // static fallback
  logoMark: '/logos/stlabs-mark.svg',            // icon-only mark

  // Resolve / loading screen
  resolveGif: '/logos/light.svg',   // animated SVG logo

  // Tech / partner logos (custom, not shields.io)
  phaserLogo: '/logos/phaser.png',
  csharpLogo: '/logos/csharp.png',

  // Project app icons  (shown on status/confirmation pages)
  // Add per-project icons here as you create them

  defaultCover: '/defaults/cover.png',   // recommended: 1280x720px, 16:9
  defaultIcon: '/defaults/icon.png',
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
  description: 'A small studio focused on clean, creative, innovative applications.',
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

  // Metadata — update these to match your track:
  title: 'Rare',
  artist: 'Going Quantum x Psychic Type',
  album: 'Monstercat',

  // Album art — drop image in /public/music/ and update path.
  // Set to '' to use the animated vinyl SVG fallback.
  albumArt: '/music/albumart.jpg',
} as const


// ─────────────────────────────────────────────────────────────────────────────
// LEADERSHIP / TEAM
// ─────────────────────────────────────────────────────────────────────────────
// Add your team members here. Images go in /public/team/.
// For easter eggs set alterEnabled: true + alterImage + alterGithub.
// For the hidden chairperson add trueChairPerson as a property on this array.

export const leadership = Object.assign(
  [
    // ── Add your team members here ──────────────────────────────────────────
    // Drop photos in /public/team/ and fill in the fields below.
    // For easter eggs: set alterEnabled: true + alterImage + alterGithub.
    //
    // {
    //   name:          'Your Name',
    //   role:          'Founder',
    //   title:         'Founder & CEO',
    //   bio:           'Short bio here.',
    //   image:         '/team/you.jpg',
    //   linkedin:      'https://linkedin.com/in/yourhandle',
    //   accent:        '#00FFB2',
    //   region:        'London',
    //   alterEnabled:  true,
    //   alterImage:    '/team/you-alt.jpg',
    //   alterName:     'Alt Name',
    //   alterTitle:    'Alt Title',
    //   alterBio:      'Alt bio.',
    //   alterGithub:   'https://github.com/yourhandle',
    // },
  ],
  {
    // Hidden chairperson — revealed via showRealHead() in console
    // trueChairPerson: {
    //   name:   'Hidden Name',
    //   role:   'True Chairperson',
    //   title:  'The one who knows',
    //   bio:    'Behind the curtain.',
    //   image:  '/team/chair.jpg',
    //   github: 'https://github.com/...',
    //   accent: '#FFB800',
    // },
  }
) as any


// ─────────────────────────────────────────────────────────────────────────────
// ACCOUNT DELETION CONFIG
// ─────────────────────────────────────────────────────────────────────────────
// 1. Create a Google Apps Script web app using deletion-script.gs
// 2. Deploy it (Execute as: Me, Who has access: Anyone)
// 3. Paste the deployed URL below

export const deletionConfig = {
  // Paste your Apps Script web app URL here after deploying:
  scriptUrl: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
} as const


// ─────────────────────────────────────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────────────────────────────────────

export const nav = {
  links: [
    { label: 'Home', path: '/' },
    { label: 'Projects', path: '/projects' },
    { label: 'Team', path: '/team' },
  ],
} as const

// ─────────────────────────────────────────────────────────────────────────────
// HOME PAGE
// ─────────────────────────────────────────────────────────────────────────────

export const homePage = {
  eyebrow: 'Creative Coding · Games · Internal Tooling · Fun Stuff',
  headline: 'Execution on\nCreative Ideas',
  subtext: 'A small studio focused on clean, creative, innovative applications. Every project tracked here.',
  ctaLabel: 'View projects',
  ctaPath: '/projects',
  about: 'Stateless Labs is primarily a Creative Coding studio. The focus is on innovative ideas that solve problems — we emphasize market viability and market strength after an idea has been properly realised. Stateless Labs also provides Cybersecurity Tooling, Management, and Maintenance Services.',
} as const

// ─────────────────────────────────────────────────────────────────────────────
// PROJECTS PAGE
// ─────────────────────────────────────────────────────────────────────────────

export const projectsPage = {
  eyebrow: 'Stateless Labs',
  heading: 'Projects',
  subtext: 'Every app we have built, from live products to archived experiments.',
  activeSectionLabel: 'Active',
  inactiveSectionLabel: 'No longer active',
  inactiveNote: 'These apps are no longer maintained. Links and downloads are disabled.',
} as const

// ─────────────────────────────────────────────────────────────────────────────
// BACKGROUND LOGO CONFIG
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
// PARTICLE VIEWER CONFIG  (home hero)
// ─────────────────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────────────────
// TECH BADGE CONFIG
// ─────────────────────────────────────────────────────────────────────────────

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
}

export const homeStackBadges: string[] = [
  'Flutter', 'Dart', 'React', 'TypeScript',
  'Android', 'iOS', 'Supabase', 'Unity', 'Unreal Engine',
]

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT STATUS
// ─────────────────────────────────────────────────────────────────────────────


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

// 2. ADD this new type after ProjectStatus:

export type ProjectVisibility =
  | 'Public'            // default - no badge, store links shown normally
  | 'Internal'          // built for internal org, hides public store links
  | 'Internal Testing'  // active internal QA, hides store links
  | 'Private Beta'      // invite-only, still shows the detail page
  | 'Restricted'        // access requires approval, hides store links
  | 'Unlisted'          // exists but not promoted


export type Platform = 'Mobile' | 'Web' | 'Desktop' | 'Cross-platform' | 'Internal'

// ─────────────────────────────────────────────────────────────────────────────
// PRIVACY POLICY
// ─────────────────────────────────────────────────────────────────────────────

export interface PermissionEntry {
  name: string
  purpose: string
}

export interface PrivacyConfig {
  updated: string
  contact: string
  visibility?: ProjectVisibility
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
// PROJECT DEFINITION
// ─────────────────────────────────────────────────────────────────────────────

export interface ProjectConfig {
  slug: string
  name: string
  tagline: string
  year: string
  platform: Platform
  status: ProjectStatus
  tech: string[]
  label: string
  about: string[]
  features?: string[]
  stackNotes?: string[]
  stores?: StoreLinks
  storeNote?: string
  legalNote?: string
  privacy: PrivacyConfig
  appIconPath?: string        // from assets.icons
  hasAuthPages?: boolean
  hasEmailConfirmation?: boolean
  // Media — add paths to /public/screenshots/<slug>/
  // coverImage shown as hero thumbnail, screenshots[] opened in carousel
  coverImage?: string
  screenshots?: string[]      // empty or omitted = no carousel shown

  classified?: boolean   // renders as a redacted card, opens a meme on click
  memeGif?: string
  // Account deletion — enables /projects/<slug>/delete-account route
  deletion?: {
    identifierLabel?: string   // default: 'Email address or username'
    extraNote?: string   // shown below the identifier field
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
    tech: ['Flutter', 'Dart', 'Supabase'],
    label: 'Mobile App · 2025',
    appIconPath: assets.icons.projectBlinkoAdmin,

    about: [
      'Blinko Analytics is an internal admin application built for the Blinko Analytics company. It gives every team member a digital business card they can present at events, and gives content roles the ability to publish company posts — all from a single Flutter codebase targeting Android, iOS, macOS, Windows, Linux, and web.',
      'The backend is Supabase: Postgres with row-level security, file storage for images and QR codes, and Auth for email-based sign-in with confirmation flows. Role permissions are enforced at the database layer so no client-side check can be bypassed.',
    ],

    features: [
      'Digital business cards with QR code, company logo, and selectable gradient background',
      'Landscape presentation mode for business events',
      'Circle avatar overlapping the card corner in presentation view',
      'Role-based access: Owner, Admin, Chief, SM, Marketing Head, Editor',
      'Posts editor with Markdown, cover image upload, and draft / live toggle',
      'Multi-platform file picker — Android, iOS, macOS, Windows, and web',
      'Email confirmation flow with hosted success, failed, and confirmation pages',
      'Localised in English and Vietnamese',
      'Responsive shell — bottom nav on mobile, rail on tablet, side drawer on desktop',
    ],

    stackNotes: [
      'Flutter 3 — single codebase, six platforms',
      'Dart — flutter_bloc / Cubit for state management',
      'Supabase — Auth, Postgres, Storage, RLS policies',
      'go_router — declarative routing with role-based redirects',
      'flutter_localization — EN / VI',
      'file_picker + image_picker — cross-platform uploads',
      'share_plus + screenshot — business card sharing',
    ],

    stores: { googlePlay: '#', appStore: '#' },
    storeNote: 'Internal distribution. Available on both major app stores.',
    legalNote: 'Personal data is stored securely via Supabase. No advertising SDKs or third-party trackers are used. Users may request deletion of their account and all associated data at any time.',

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
        'Email address and hashed password — for account creation and sign-in',
        'Full name, job title, phone number, business email — displayed on your digital business card',
        'Company name, website, address, logo, and QR code image — shown on your card',
        'Profile photo — shown in the card presentation view',
        'Posts content and cover images — published to the company blog',
      ],
    },

    hasEmailConfirmation: true,
  },

  {
    slug: 'project-vault',
    name: 'Project Vault',
    tagline: 'Fast, distraction-free email on mobile.',
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
      'Clean, distraction-free reading view',
      'Fast inbox sync',
      'Send, reply, and forward',
      'Offline reading of cached messages',
    ],

    stores: { googlePlay: '#', appStore: '#' },
    storeNote: 'Available on both major app stores.',
    legalNote: 'Email credentials are stored securely on-device only and never transmitted to any external server operated by this studio.',

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
      'A social media app that aims to remove the manipulation tactics established platforms use to monetise your attention. Kin wants to help you rebuild creativity and find daily inspiration — until you can do it on your own.',
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
      'A fast, minimal calculator built with Flutter using BLoC state management and Clean Architecture. Supports standard arithmetic, percentages, decimal numbers, and real-time expression preview. No ads, no tracking.',
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
// STATUS PAGES  (auth + email confirmation)
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
    body: 'Identity verified. You can return to the application — this window will close automatically.',
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
    body: 'The confirmation email is on its way. Check your inbox and follow the link to complete sign-up.',
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
// FEATURE FLAGS
// ─────────────────────────────────────────────────────────────────────────────

export const flags = {
  showParticleBackground: true,
  showBgLogoOnHome: true,
} as const
