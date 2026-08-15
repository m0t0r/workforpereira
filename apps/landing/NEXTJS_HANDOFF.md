# Encuentra — Next.js and design-system handoff

## Product decision

Build **Encuentra** (the former Option 2) as the product direction. It is a job-search platform for people in Pereira and Risaralda who need a clear, low-friction route back to work after an earthquake.

The experience must feel practical and safe, not charitable or alarming. Its core promise is: **create one profile, find verified work, and always know what happens next.**

### Reference implementation

- Visual reference: `option-2.html`
- Prototype styles: `styles.css`
- Prototype interactions: `script.js`
- Local review address: `http://127.0.0.1:4174/option-2.html` while the preview server is running.

## User needs and product principles

1. **Reduce uncertainty.** Use visible, named selection stages: Postulación → Revisión → Entrevista → Resultado.
2. **Keep the first action light.** Search can happen before registration; applying and saving require a profile.
3. **Make safety unavoidable, but calm.** State that applying is free, employers are verified, and data use is limited. Never use disaster imagery or emotionally loaded language.
4. **Start local.** Default location is Pereira, Risaralda; nearby municipalities (especially Dosquebradas) must be first-class filters.
5. **Never leave a dead end.** Each state exposes a next action: complete profile, see job details, save a job, or inspect application status.

## MVP information architecture

| Route | Purpose | Primary components |
| --- | --- | --- |
| `/` | Landing page and discovery | `SiteHeader`, `JobSearch`, `TrustProof`, `JobResultsPreview`, `ApplicationTrackerPreview`, `SafetyNotice`, `ProfileCTA` |
| `/empleos` | Search and filter job listings | `SearchToolbar`, `FilterSidebar`/`FilterSheet`, `JobList`, `JobCard`, pagination/infinite load |
| `/empleos/[slug]` | Read a vacancy and start application | `JobDetail`, `CompanyBadge`, `Requirements`, `ApplyPanel`, `ReportListing` |
| `/registro` | Create an account and profile | `AuthLayout`, `ProfileWizard`, `ProfileCompletion` |
| `/mi-perfil` | Edit candidate information | `ProfileHeader`, `ProfileSections`, `CompletionMeter` |
| `/mis-postulaciones` | Track applications | `ApplicationList`, `ApplicationTimeline`, `NextStepCard` |
| `/ayuda/busqueda-segura` | Safety and reporting guidance | `SafetyNotice`, `ReportForm` |

## Component inventory

Create the primitives first, then assemble the landing page.

### Foundations

- `Button`: variants `primary`, `secondary`, `ghost`, `danger`; sizes `sm`, `md`, `lg`; all buttons have a minimum 40px height and `:active { transform: scale(.97) }`.
- `IconButton`: 40 × 40px interactive area, visible focus ring, label required for screen readers.
- `Badge`: `success`, `info`, `neutral`, `warning` and `job-tag` variants.
- `Card`: base, interactive and elevated variants; only interactive cards have hover motion.
- `Checkbox`, `Input`, `SearchInput`, `Select`, `Dialog`, `Toast`, `Accordion`.
- `Logo`: wordmark should remain text + simple mark until brand work supplies a final logo asset.

### Domain components

| Component | Props / states | Notes |
| --- | --- | --- |
| `JobSearch` | `query`, `location`, `onSubmit` | Persist recent query locally only after consent; default location is Pereira, not geolocation. |
| `TrustProof` | static 3 items | “Empresas verificadas”, “Postularte es gratis”, “Respuestas en un solo lugar”. |
| `JobCard` | `job`, `saved`, `onSave`, `onOpen` | Show company, age, location, modality, tags, salary and a visible details action. |
| `SaveJobButton` | `saved`, `jobTitle`, `onToggle` | Use `aria-pressed`; show a toast after a state change. |
| `FilterSidebar` | `filters`, `counts`, `onChange` | Desktop aside; mobile opens as a bottom sheet or dialog, never disappears. |
| `ApplicationTimeline` | `currentStage`, `stages` | Current stage must be labelled in text, not color alone. |
| `NextStepCard` | `title`, `description`, `action` | E.g. “Siguiente paso: espera la invitación”. |
| `SafetyNotice` | `compact` / `full` | Contains reporting link and no-fee policy. |

## Design tokens

Move these into CSS variables or your token pipeline. Name semantically in the product code; do not use raw hex values in components.

```css
:root {
  /* color */
  --color-brand-500: #2457e6;
  --color-brand-700: #172d70;
  --color-ink: #172747;
  --color-text-muted: #62708a;
  --color-surface: #ffffff;
  --color-page: #f7f9ff;
  --color-surface-brand: #e8efff;
  --color-border: #dce2ef;
  --color-success: #387e65;
  --color-success-surface: #e6f6ed;
  --color-warning: #946016;
  --color-warning-surface: #fff1c7;
  --color-danger: #c53b5d;
  --color-danger-surface: #fff5f7;

  /* typography */
  --font-sans: 'Manrope', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'DM Mono', ui-monospace, monospace;
  --text-2xs: 0.5rem;   /* labels only */
  --text-xs: 0.625rem;
  --text-sm: 0.75rem;
  --text-md: 0.875rem;
  --text-lg: 1.125rem;
  --text-display: clamp(2.375rem, 5vw, 3.9375rem);

  /* spacing, radius and elevation */
  --space-1: 0.25rem; --space-2: 0.5rem; --space-3: 0.75rem;
  --space-4: 1rem; --space-5: 1.25rem; --space-6: 1.5rem;
  --space-8: 2rem; --space-10: 2.5rem; --space-12: 3rem;
  --radius-sm: 0.3125rem; --radius-md: 0.5rem; --radius-lg: 0.75rem;
  --shadow-card: 0 8px 19px rgb(38 74 150 / 8%);
  --shadow-search: 0 13px 30px rgb(42 65 127 / 15%);
  --ease-out: cubic-bezier(.23, 1, .32, 1);
}
```

### Typography rules

- Manrope is the product face. DM Mono is reserved for small metadata, status labels and compact tags.
- Headings use a tight `letter-spacing: -0.06em` to `-0.075em`; body copy is regular and never below 12px in the production app.
- Use tabular figures for salaries, counts and date-oriented data.
- Respect sentence case. Avoid all-caps except small eyebrow labels.

### Layout rules

- Content max width: `1180px`; desktop page gutters: 24px minimum.
- Desktop results use 225px filters + flexible job list with a 40px gap.
- Below 820px, filters migrate to a modal sheet; list cards stay single-column.
- Landing hero has centered copy; local imagery is a full-width band, not decorative background text.
- Preserve one visual focal point per section. Avoid adding a dashboard in the hero.

## Interaction and motion

- Button press: scale to `.97` in 120–160ms.
- Card hover: only on `@media (hover: hover) and (pointer: fine)`; transform and shadow only, max 180ms.
- Toasts: 180–220ms opacity/translate transition; never block user input; announce with `role="status"`.
- Search/filter controls should react instantly; do not animate keyboard-triggered state changes.
- Honor `prefers-reduced-motion` by removing transform-based motion.

## Data contracts (MVP)

```ts
type Job = {
  id: string;
  slug: string;
  title: string;
  company: { id: string; name: string; logoUrl?: string; verified: boolean };
  location: { city: 'Pereira' | 'Dosquebradas' | string; department: 'Risaralda'; remote: boolean };
  modality: 'Presencial' | 'Híbrido' | 'Remoto';
  employmentType: 'Tiempo completo' | 'Medio tiempo' | 'Turnos' | 'Temporal';
  salary?: { min?: number; max?: number; currency: 'COP'; period: 'monthly' };
  tags: string[];
  experience: 'Sin experiencia' | 'Con experiencia' | 'Indiferente';
  postedAt: string;
  closesAt?: string;
};

type ApplicationStage = 'submitted' | 'review' | 'interview' | 'decision';
type Application = {
  id: string;
  job: Pick<Job, 'id' | 'title' | 'company'>;
  stage: ApplicationStage;
  statusLabel: string;
  updatedAt: string;
  nextStep?: { title: string; description: string; actionHref?: string };
};
```

## Content rules

- The platform must never imply a guarantee of employment.
- State “verificada” only after a real company-verification process exists.
- State “Postularte es gratis” and repeat it near application and safety flows.
- Empty states should recommend a practical next step: broaden location, remove a filter, or complete the profile.
- Avoid fictional employer data in production; the prototype names and salaries are layout fixtures.

## Images and brand assets

- The prototype references `https://colombia.co/sites/default/files/2024-12/banner-pereira.jpg` for the city ribbon and Google Fonts for Manrope / DM Mono.
- Before production, establish image licensing, replace remote prototype URLs with optimized local/approved CDN assets, and configure `next/image` remote patterns only when needed.
- Do not use earthquake damage imagery in the candidate experience.

## Accessibility and quality bar

- WCAG 2.2 AA contrast minimum; do not make meaning depend only on green/blue/red.
- All controls reachable by keyboard with a 2px visible focus ring using `--color-brand-500`.
- Inputs need real labels (visually hidden labels are acceptable); icons are `aria-hidden` if decorative.
- Save actions use `aria-pressed`; selection stages include text labels.
- Announce dynamic saves, search updates and application changes through live regions.
- Test at 390px, 768px, 1024px and 1440px. At 390px, the header retains logo + primary CTA and moves navigation into a menu.

## Definition of done for the first build

1. `/` matches the chosen visual direction with responsive layout and the trust proof.
2. Search query and filters work against mock data; URL query parameters mirror active filters.
3. Candidates can save/unsave jobs, and status feedback is accessible.
4. Job detail, registration/profile, and application tracker routes exist with realistic empty/loading/error states.
5. The four-stage timeline is reusable and accepts real backend data later.
6. The safety page and report path are reachable from landing, job detail and application flows.
7. Tokens and UI primitives are documented in Storybook (or an equivalent component workspace) before page-specific variants proliferate.
