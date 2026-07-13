# Skills proficiency-level toggle

## Problem

The Skills section always shows a per-skill proficiency `Select` (Beginner /
Intermediate / Advanced / Expert). Some users don't want to rate themselves at
all and want the whole proficiency concept gone from that section — form,
preview, PDF, and docx — without losing any level values they may have
already entered (they might turn it back on later).

## Approach

Add a section-scoped boolean, `showLevel`, to the Skills `Section`, mirroring
the existing `columns` toggle (`SectionColumns`, `SkillsColumnsToggle`).
Default `true` so every existing and newly created Skills section keeps
showing levels unless a user explicitly turns it off. Turning it off only
hides the level UI and blanks the level in rendered output — it never
mutates or clears the stored `level` value on any skill entry.

Because every renderer (`ResumeSkillItem` for the HTML preview, `PdfGrid` for
PDF, and the docx skills renderer) already skips rendering proficiency when
it's an empty string, the output side of this feature is a single-line
change in `resume-to-preview.ts`: feed it `""` instead of the real level when
`showLevel` is `false`. No changes are needed in the three renderers
themselves.

## Data shape

`src/lib/resume/types.ts`

```ts
export interface Section {
  // ...existing fields
  /**
   * Presentation-only: whether the Skills section shows a proficiency level
   * per entry. Skills-only; absent on other Section types. Renderers and the
   * editor treat an unset value as `true`. Never affects the stored `level`
   * value on an entry — toggling this only changes whether it's shown.
   */
  showLevel?: boolean;
}
```

`CURRENT_SCHEMA_VERSION` bumps from 12 to 13.

## Migration

`src/lib/resume/migrations.ts` — add `migrateV12toV13`, registered at ladder
key `12`:

- Find the `skills` section (if any).
- If `showLevel` isn't already a boolean, set it to `true`.
- Bail-safe: no skills section, or a `sections` that isn't an array, is a
  no-op (same shape as `migrateV9toV10`, which did the equivalent for
  `columns`).

## Defaults for newly created sections

- `src/lib/resume/factory.ts`: `createEmptySection` sets `showLevel: true`
  alongside `columns: 2` when `type === "skills"`.
- `src/lib/resume/seed.ts`: the seed Skills section gets `showLevel: true`.

## Editor UI

New component `src/components/editor/editor-sections/ed-section-skills/skills-level-toggle.tsx`
(`SkillsLevelToggle`), structurally parallel to `SkillsColumnsToggle`:

- Reads `state.open?.sections.find(s => s.type === "skills")?.showLevel ?? true`
  from `useResumeStore`.
- Writes via `updateOpen`, flipping the boolean on the matched section.
- Renders a label (`t("showLevelLabel")`) plus a shadcn `Switch` (binary
  on/off — not a `SegmentedControl`, since there are only two states and no
  need for the visual weight of three tap targets).

`ed-section-skills-form.tsx` renders `SkillsLevelToggle` next to
`SkillsColumnsToggle`, inside the same `fields.length > 0` branch (no point
offering the toggle when the section is empty).

## Per-item form

`ed-section-skills-form-item.tsx`: the proficiency `Controller` + `Select`
block is only rendered when the section's `showLevel` is `true` (read via
`useResumeStore` the same way `SkillsColumnsToggle` does, keyed off the
`skills` section). When `false`, the row is just the name `Input` and the
remove `Button`. The underlying `level` field in the form/store is
untouched — hiding the control doesn't clear its bound value.

## Output wiring

`resume-to-preview.ts`, in the `skills` mapping:

```ts
const skillsSection = sectionOfType(resume, "skills");
const showLevel = skillsSection?.showLevel ?? true;

skills: (skillsSection?.entries ?? []).map((entry) => ({
  id: entry.id,
  name: plain(entry.fields.name),
  proficiency: showLevel ? plain(entry.fields.level) : "",
})),
```

## Translations

`messages/en.json` and `messages/id.json`, under `editor.skills`: add
`showLevelLabel` (e.g. "Show proficiency level" / "Tampilkan level
kemahiran").

## Out of scope

- The Languages section has an analogous `level`/proficiency field but is not
  part of this change — the user's request was Skills-only.
- No change to `PROFICIENCY_LEVELS` itself, or to how an individual skill's
  level is chosen.
