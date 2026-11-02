// ─────────────────────────────────────────────────────────────────────────────
// SEO AND GEO
//
// ADD this block to site.config.ts. It replaces nothing. Paste it near the
// bottom, after `projects` and `leadership` are declared, because it reads
// both.
//
// SEO is search engines. GEO is generative engines: the crawlers behind
// ChatGPT, Claude, Perplexity and Google's AI answers. They want different
// things and both are handled here.
//
//   Search engines want one canonical URL per page, a title and description
//   that match the content, structured data they can parse without guessing,
//   and a sitemap.
//
//   Generative engines want something more specific: text they can read
//   WITHOUT running JavaScript. Google renders JS before indexing. GPTBot,
//   ClaudeBot, PerplexityBot and CCBot largely do not. A single page app
//   serves them `<div id="root"></div>` and nothing else, so as far as those
//   crawlers are concerned this site is blank. That is what scripts/prerender.mjs
//   fixes, and it is the single most important item in this whole batch.
//
//   They also reward plain declarative statements of fact over marketing
//   copy, because a sentence like "Stateless Labs is a software studio based
//   in X that builds Y" is quotable and "we turn ideas into reality" is not.
//   That is what `entity` below is for.
// ─────────────────────────────────────────────────────────────────────────────

import { brand } from "./site.config"

export interface SeoRouteOverride {
    title?: string
    description?: string
    /** Keep this page out of search results and out of the sitemap. */
    noindex?: boolean
    /** Relative priority in the sitemap, 0 to 1. */
    priority?: number
    changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
}

export const seo = {
    // ── The basics ─────────────────────────────────────────────────────────────

    /**
     * The canonical origin, no trailing slash. Every canonical URL, Open Graph
     * URL and sitemap entry is built from this.
     *
     * This has to be right, and it has to be the one address the site answers
     * on. If the site is reachable at both stateless-labs.com and
     * www.stateless-labs.com, pick one here and make the other redirect, or
     * search engines will split the page's standing across two URLs.
     */
    origin: brand.url,

    /**
     * On GitHub Pages under a repository path, set this to '/repo-name'. Leave
     * '' for a custom domain or a user site. It prefixes every generated path.
     */
    base: '',

    /**
     * Title template. `%s` is the page's own title. Keep the whole thing under
     * about 60 characters once filled in, because that is where search results
     * truncate.
     */
    titleTemplate: '%s | Stateless Labs',
    /** Used verbatim on the home page, without the template. */
    defaultTitle: 'Stateless Labs, a studio for execution on creative ideas',

    defaultDescription: brand.description,

    /**
     * The social preview image. 1200x630 is the size both Open Graph and
     * Twitter cards want. An absolute URL is built from `origin`.
     *
     * Worth making a real one. A link with no image gets a grey box, and a grey
     * box is what a dead link looks like.
     */
    ogImage: '/social/og-default.png',
    ogImageAlt: 'Stateless Labs',
    twitterCard: 'summary_large_image' as 'summary' | 'summary_large_image',
    /** With the @. Leave '' if there is no account. */
    twitterSite: '',

    locale: 'en_US',
    /** BCP 47, for the html lang attribute. */
    lang: 'en',
    themeColor: '#0a0a0a',

    // ── The entity ─────────────────────────────────────────────────────────────
    /**
     * Plain statements of fact about the organisation, in descending order of
     * importance.
     *
     * These go into the structured data, into the prerendered HTML, and into
     * llms.txt. This is the single highest leverage block in this file for GEO:
     * when a model is asked "what is Stateless Labs", these are the sentences it
     * has to work with.
     *
     * Write them as complete sentences that make sense in isolation, starting
     * with the subject. "Stateless Labs is a software studio." not "We are a
     * software studio." A fragment lifted out of context has to still say who it
     * is about.
     */
    entity: {
        /** One sentence. The most important sentence on the whole site. */
        summary:
            'Stateless Labs is an independent software studio that designs and builds ' +
            'web and mobile applications, and provides technical consulting.',

        /** Three to six supporting facts. */
        facts: [
            'Stateless Labs works on applications, websites, data analysis and security engineering.',
            'Stateless Labs is currently a solo practice, which means one engineer is accountable for the work end to end.',
            'Stateless Labs treats security as part of the build rather than a review at the end.',
            'Stateless Labs writes its own code rather than assembling generated output it has not read.',
        ],

        /** What the studio does, as short noun phrases. Used in structured data. */
        services: [
            'Web application development',
            'Mobile application development',
            'Technical consulting',
            'Data analysis',
            'Security engineering',
        ],

        /**
         * Where the studio operates. Leave as-is for remote and worldwide. A real
         * city here makes local search work, and makes "software studio in X"
         * answerable.
         */
        areaServed: 'Worldwide',
        /** Set to a city and country to publish a location. Both empty publishes none. */
        locality: '',
        country: '',

        /** Year founded, as a four digit string. '' omits it. */
        founded: '',

        /**
         * Other profiles for the same organisation: GitHub, LinkedIn, anywhere
         * else it is listed. Structured data calls this sameAs, and it is how a
         * search engine works out that those accounts and this site are one thing
         * rather than several.
         */
        sameAs: [
            // 'https://github.com/your-org',
            // 'https://www.linkedin.com/company/your-company',
        ] as string[],
    },

    /**
     * Questions and answers, which become FAQPage structured data and a section
     * in the prerendered HTML and llms.txt.
     *
     * This is the format generative engines quote most readily, because a
     * question and its answer need no surrounding context to make sense. Write
     * the questions as somebody would actually type or say them.
     *
     * Leave the array empty to omit all of it. Do not invent questions nobody
     * asks to pad it out: an FAQ full of filler reads as filler to a person and
     * gets ignored by a model.
     */
    faq: [
        {
            q: 'What does Stateless Labs do?',
            a: 'Stateless Labs designs and builds web and mobile applications, and ' +
                'provides technical consulting. Work ranges from a single feature through ' +
                'to a complete product, and includes data analysis and security engineering.',
        },
        {
            q: 'How big is Stateless Labs?',
            a: 'Stateless Labs is a solo practice. One engineer scopes, builds and ' +
                'ships the work, so there is no handover between a salesperson and a ' +
                'delivery team and nobody to lose context in the middle.',
        },
        {
            q: 'Does Stateless Labs use AI to write its code?',
            a: 'No. Code that ships is written and understood by a person. Generated ' +
                'output that nobody has read is a liability rather than a shortcut, ' +
                'particularly anywhere security matters.',
        },
        {
            q: 'How do I ask Stateless Labs about a project?',
            a: `Email ${brand.email} with a description of the problem. A rough idea is ` +
                'enough to start from; it does not need a specification.',
        },
    ] as { q: string; a: string }[],

    // ── Per route ──────────────────────────────────────────────────────────────
    /**
     * Overrides keyed by path, without the origin and without a trailing slash.
     *
     * Anything not listed gets a title and description derived from the page's
     * own content, which for a project page means its name and tagline. Only
     * override where the derived version is not good enough.
     */
    routes: {
        // No title here on purpose. The home page uses `defaultTitle` verbatim,
        // without the template, because "Stateless Labs | Stateless Labs" is not
        // a title.
        '/': {
            priority: 1.0,
            changefreq: 'weekly',
        },
        '/projects': {
            title: 'Projects',
            description:
                'Applications and tools built by Stateless Labs, with what each one is, ' +
                'what it is built with, and where it can be opened.',
            priority: 0.9,
            changefreq: 'weekly',
        },
        '/team': {
            title: 'Who we are',
            description: 'The people behind Stateless Labs.',
            priority: 0.6,
            changefreq: 'monthly',
        },
        '/delete-account': {
            title: 'Delete your account',
            description:
                'Request deletion of your account and associated data for any Stateless ' +
                'Labs application.',
            // Deliberately indexable. App stores require a publicly reachable
            // deletion URL, and a page search engines refuse to list is harder to
            // find for someone who needs it. It stays out of the site navigation,
            // which is a different thing from being hidden from search.
            priority: 0.4,
            changefreq: 'yearly',
        },
    } as Record<string, SeoRouteOverride>,

    /**
     * Path patterns kept out of search results and out of the sitemap, matched
     * as substrings against the path.
     *
     * The status pages are the important ones. They are transactional screens
     * that a visitor reaches once, from an email link, and having "Access
     * Granted" or "Your link expired" turn up in search results for the brand
     * name is confusing at best. They also carry no content worth indexing.
     */
    noindexPatterns: [
        '/auth/',
        '/confirm/',
        '/reset/',
    ] as string[],

    // ── Crawlers ───────────────────────────────────────────────────────────────
    /**
     * Whether the AI crawlers are allowed in.
     *
     * This is a real decision, not a formality. Allowing them is what makes the
     * site eligible to be cited in an AI answer, which is the entire point of
     * GEO. Blocking them keeps the content out of training sets and out of those
     * answers both.
     *
     * Set to false and robots.txt will disallow them instead. There is no
     * halfway: Google-Extended, for instance, is all or nothing.
     */
    allowAiCrawlers: true,

    /**
     * Agents listed in robots.txt when allowAiCrawlers is true. GPTBot is
     * OpenAI's, ClaudeBot is Anthropic's, PerplexityBot is Perplexity's,
     * Google-Extended governs Google's AI products separately from search, and
     * CCBot is Common Crawl, which many smaller models are trained from.
     */
    aiCrawlers: [
        'GPTBot',
        'OAI-SearchBot',
        'ChatGPT-User',
        'ClaudeBot',
        'Claude-Web',
        'anthropic-ai',
        'PerplexityBot',
        'Google-Extended',
        'CCBot',
        'Applebot-Extended',
        'Bytespider',
        'cohere-ai',
    ] as string[],

    /**
     * Extra lines appended to the generated llms.txt. Use it for anything a
     * model should know that is not in `entity` or `faq`, such as how to cite
     * the site or which claims are current.
     */
    llmsNote:
        'This file is maintained by hand and regenerated at build time. ' +
        `For anything not covered here, email ${brand.email}.`,
}