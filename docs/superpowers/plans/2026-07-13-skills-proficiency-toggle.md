# Skills Proficiency-Level Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user turn the per-skill proficiency level (Beginner/Intermediate/Advanced/Expert) on or off for the whole Skills section, without ever losing an already-entered level.

**Architecture:** A new `showLevel?: boolean` flag on the Skills `Section` (default `true`), migrated forward like the existing `columns` flag. The editor form reads it to decide whether to render the per-skill proficiency `Select`; `resumeToPreview` reads it to decide whether to feed a real level or an empty string into the shared view-model that the HTML preview, PDF, and docx renderers already consume — all three already skip rendering an empty proficiency, so no renderer changes are needed.

**Tech Stack:** Next.js App Router, TypeScript strict, zustand (`useResumeStore`), react-hook-form, next-intl, shadcn (base-ui) `Switch`.

## Global Constraints

- Full spec: `docs/superpowers/specs/2026-07-13-skills-proficiency-toggle-design.md`.
- `showLevel` is presentation-only and Skills-only; it never mutates or clears a skill entry's stored `level` value — toggling only changes whether it's shown/rendered.
- Unset/missing `showLevel` must behave as `true` everywhere it's read (existing and mid-migration documents must render exactly as they do today).
- This document shape change requires: the field on `Section`, `CURRENT_SCHEMA_VERSION` bumped 12 → 13, and a new forward-only migration ladder rung (`docs/schema-migrations.md` process) — all three in the same task.
- No `any` without an inline justification comment (project TypeScript-strict rule). None of the tasks below need one.
- No default exports for functions/components; named exports only.
- This repo has no unit test runner configured (no vitest/jest, no `test` script). Verification below uses `npx tsc --noEmit`, `npx biome check`, throwaway `tsx` verification scripts (written under `scripts/`, run, then deleted — never committed), and manual dev-server checks in a browser for UI, per this project's actual tooling and `AGENTS.md`'s instruction to browser-verify UI changes.

---

## Task 1: Schema shape, migration ladder, and section-creation defaults

**Files:**
- Modify: `src/lib/resume/types.ts`
- Modify: `src/lib/resume/migrations.ts`
- Modify: `src/lib/resume/factory.ts`
- Modify: `src/lib/resume/seed.ts`

**Interfaces:**
- Produces: `Section.showLevel?: boolean` (consumed by Task 2's `resumeToPreview` and Task 4's form/toggle).
- Produces: `CURRENT_SCHEMA_VERSION === 13`.

- [ ] **Step 1: Add `showLevel` to the `Section` type and bump the schema version**

In `src/lib/resume/types.ts`, change:

```ts
export const CURRENT_SCHEMA_VERSION = 12;
```

to:

```ts
export const CURRENT_SCHEMA_VERSION = 13;
```

And in the `Section` interface, add the new field right after `columns`:

```ts
export interface Section {
  id: string;
  type: SectionType;
  title: string;
  entries: Entry[];
  /**
   * Presentation-only column count for grid-rendered sections (skills). Absent on
   * non-grid sections; renderers default to a two-column grid when unset.
   */
  columns?: SectionColumns;
  /**
   * Presentation-only: whether the Skills section shows a proficiency level per
   * entry. Skills-only; absent on other Section types. Renderers and the editor
   * treat an unset value as `true`. Never affects a stored `level` value on an
   * entry — toggling this only changes whether it's shown.
   */
  showLevel?: boolean;
  /**
   * Presentation variant for `custom` Sections only: `rich` (a single rich-text
   * body) or `list` (repeatable entries). Absent on core Sections; the custom
   * factory always sets it, and renderers treat an unset value as `rich`.
   */
  variant?: CustomVariant;
}
```

- [ ] **Step 2: Add the v12→v13 migration rung**

In `src/lib/resume/migrations.ts`, add this new migration directly after `migrateV11toV12` (after its closing `};`, before the `LADDER` constant):

```ts
/**
 * v12→v13: adds the presentation-only `showLevel` flag to the Skills section so
 * proficiency levels can be hidden without losing any level a user already typed.
 * Existing documents default to `true`, preserving their current display.
 * Bail-safe: no Skills section means no-op; a Skills section that already carries
 * a boolean `showLevel` is left untouched.
 */
const migrateV12toV13: Migration = (doc) => {
  const next = structuredClone(doc);
  const sections = Array.isArray(next.sections)
    ? (next.sections as Array<Record<string, unknown>>)
    : [];

  const skills = sections.find((s) => s.type === "skills");
  if (skills && typeof skills.showLevel !== "boolean") {
    skills.showLevel = true;
  }

  return next;
};
```

Then register it in the `LADDER`:

```ts
const LADDER: Record<number, Migration> = {
  1: migrateV1toV2,
  2: migrateV2toV3,
  3: migrateV3toV4,
  4: migrateV4toV5,
  5: migrateV5toV6,
  6: migrateV6toV7,
  7: migrateV7toV8,
  8: migrateV8toV9,
  9: migrateV9toV10,
  10: migrateV10toV11,
  11: migrateV11toV12,
  12: migrateV12toV13,
};
```

- [ ] **Step 3: Default `showLevel` on newly created Skills sections**

In `src/lib/resume/factory.ts`, change:

```ts
export function createEmptySection(type: SectionType): Section {
  const schema = getSectionSchema(type);
  const section: Section = {
    id: nanoid(),
    type,
    title: schema.defaultTitle,
    entries: [],
  };
  // The Skills grid is column-toggleable; new sections start two-column.
  if (type === "skills") section.columns = 2;
  return section;
}
```

to:

```ts
export function createEmptySection(type: SectionType): Section {
  const schema = getSectionSchema(type);
  const section: Section = {
    id: nanoid(),
    type,
    title: schema.defaultTitle,
    entries: [],
  };
  // The Skills grid is column-toggleable, and levels show by default.
  if (type === "skills") {
    section.columns = 2;
    section.showLevel = true;
  }
  return section;
}
```

- [ ] **Step 4: Default `showLevel` on the seed résumé's Skills section**

In `src/lib/resume/seed.ts`, find the seed Skills section (`id: "seed-skills"`) and add `showLevel: true` next to its existing `columns: 2`:

```ts
    {
      id: "seed-skills",
      type: "skills",
      title: "Skills",
      columns: 2,
      showLevel: true,
      entries: [
```

- [ ] **Step 5: Write and run a throwaway verification script**

Create `scripts/tmp-verify-skills-toggle.ts`:

```ts
import { createEmptyResume } from "@/lib/resume/factory";
import { runMigrations } from "@/lib/resume/migrations";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`OK: ${message}`);
}

// New sections default to showLevel: true.
const fresh = createEmptyResume("test");
const freshSkills = fresh.sections.find((s) => s.type === "skills");
assert(freshSkills?.showLevel === true, "new Skills section defaults showLevel true");
assert(fresh.schemaVersion === 13, "createEmptyResume stamps schemaVersion 13");

// A v12 doc with no showLevel migrates to true.
const v12NoFlag = structuredClone(fresh) as unknown as Record<string, unknown>;
v12NoFlag.schemaVersion = 12;
const v12Skills = (v12NoFlag.sections as Array<Record<string, unknown>>).find(
  (s) => s.type === "skills",
);
if (v12Skills) delete v12Skills.showLevel;
const migratedNoFlag = runMigrations(v12NoFlag);
const migratedNoFlagSkills = migratedNoFlag.sections.find((s) => s.type === "skills");
assert(
  migratedNoFlagSkills?.showLevel === true,
  "v12 doc missing showLevel migrates to true",
);

// A v12 doc that already opted out stays opted out (bail-safe, not stomped).
const v12FlagFalse = structuredClone(fresh) as unknown as Record<string, unknown>;
v12FlagFalse.schemaVersion = 12;
const v12FalseSkills = (v12FlagFalse.sections as Array<Record<string, unknown>>).find(
  (s) => s.type === "skills",
);
if (v12FalseSkills) v12FalseSkills.showLevel = false;
const migratedFalse = runMigrations(v12FlagFalse);
const migratedFalseSkills = migratedFalse.sections.find((s) => s.type === "skills");
assert(
  migratedFalseSkills?.showLevel === false,
  "v12 doc with showLevel:false is left untouched by the migration",
);

// A v12 doc with no Skills section at all is a no-op, not a throw.
const v12NoSkillsSection = structuredClone(fresh) as unknown as Record<string, unknown>;
v12NoSkillsSection.schemaVersion = 12;
v12NoSkillsSection.sections = (
  v12NoSkillsSection.sections as Array<Record<string, unknown>>
).filter((s) => s.type !== "skills");
const migratedNoSection = runMigrations(v12NoSkillsSection);
assert(
  migratedNoSection.sections.find((s) => s.type === "skills") === undefined,
  "v12 doc without a Skills section migrates without throwing",
);

console.log("All skills-toggle migration checks passed.");
```

Run:

```bash
npx tsx scripts/tmp-verify-skills-toggle.ts
```

Expected output: five `OK:` lines followed by `All skills-toggle migration checks passed.` and exit code 0. If any `FAIL:` line prints, the script throws and exits non-zero — fix the corresponding step before continuing.

- [ ] **Step 6: Delete the throwaway script, typecheck, and lint**

```bash
rm scripts/tmp-verify-skills-toggle.ts
npx tsc --noEmit
npx biome check src/lib/resume/types.ts src/lib/resume/migrations.ts src/lib/resume/factory.ts src/lib/resume/seed.ts
```

Expected: both commands exit 0 with no errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/resume/types.ts src/lib/resume/migrations.ts src/lib/resume/factory.ts src/lib/resume/seed.ts
git commit -m "feat(resume): add showLevel flag to the Skills section schema"
```

---

## Task 2: Wire `showLevel` into the preview/PDF/docx view-model

**Files:**
- Modify: `src/components/editor/resume-to-preview.ts`

**Interfaces:**
- Consumes: `Section.showLevel?: boolean` (Task 1).
- Produces: no new exports — `resumeToPreview(resume: Resume): ResumePreview` keeps its existing signature; only the `proficiency` value inside each `ResumePreview["skills"]` item changes behavior.

- [ ] **Step 1: Make the skills mapping `showLevel`-aware**

In `src/components/editor/resume-to-preview.ts`, inside `resumeToPreview`, add a local `skillsSection`/`showLevel` lookup next to the existing `summaryBody` local (both computed before the `return`):

```ts
  const summaryBody = sectionOfType(resume, "summary")?.entries[0]?.fields.body;
  const skillsSection = sectionOfType(resume, "skills");
  const showSkillLevel = skillsSection?.showLevel ?? true;
```

Then change the `skills`/`skillsColumns` entries in the returned object from:

```ts
    skills: (sectionOfType(resume, "skills")?.entries ?? []).map((entry) => ({
      id: entry.id,
      name: plain(entry.fields.name),
      proficiency: plain(entry.fields.level),
    })),
    skillsColumns: sectionOfType(resume, "skills")?.columns ?? 2,
```

to:

```ts
    skills: (skillsSection?.entries ?? []).map((entry) => ({
      id: entry.id,
      name: plain(entry.fields.name),
      proficiency: showSkillLevel ? plain(entry.fields.level) : "",
    })),
    skillsColumns: skillsSection?.columns ?? 2,
```

- [ ] **Step 2: Write and run a throwaway verification script**

Create `scripts/tmp-verify-preview-skills.ts`:

```ts
import { resumeToPreview } from "@/components/editor/resume-to-preview";
import { createEmptyResume } from "@/lib/resume/factory";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`OK: ${message}`);
}

function withSkillEntry(showLevel: boolean | undefined) {
  const resume = createEmptyResume("test");
  const skills = resume.sections.find((s) => s.type === "skills");
  if (!skills) throw new Error("fixture is missing a Skills section");
  skills.showLevel = showLevel as boolean;
  if (showLevel === undefined) delete skills.showLevel;
  skills.entries = [
    {
      id: "skill-1",
      fields: {
        name: { kind: "plain", value: "TypeScript" },
        level: { kind: "plain", value: "Expert" },
      },
    },
  ];
  return resumeToPreview(resume);
}

assert(
  withSkillEntry(true).skills[0]?.proficiency === "Expert",
  "showLevel true keeps the entered level",
);
assert(
  withSkillEntry(false).skills[0]?.proficiency === "",
  "showLevel false blanks the level",
);
assert(
  withSkillEntry(undefined).skills[0]?.proficiency === "Expert",
  "unset showLevel defaults to showing the level",
);

console.log("All preview skills-toggle checks passed.");
```

Run:

```bash
npx tsx scripts/tmp-verify-preview-skills.ts
```

Expected output: three `OK:` lines then `All preview skills-toggle checks passed.`, exit code 0.

- [ ] **Step 3: Delete the throwaway script, typecheck, and lint**

```bash
rm scripts/tmp-verify-preview-skills.ts
npx tsc --noEmit
npx biome check src/components/editor/resume-to-preview.ts
```

Expected: both commands exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/editor/resume-to-preview.ts
git commit -m "feat(resume): hide skill proficiency in preview/PDF/docx when showLevel is off"
```

---

## Task 3: `SkillsLevelToggle` component and translations

**Files:**
- Create: `src/components/editor/editor-sections/ed-section-skills/skills-level-toggle.tsx`
- Modify: `messages/en.json`
- Modify: `messages/id.json`

**Interfaces:**
- Consumes: `Section.showLevel?: boolean` (Task 1), `useResumeStore` (`state.open`, `state.updateOpen` — see `src/lib/store/resume-store.ts:47,60`), `Switch` from `@/components/ui/switch`.
- Produces: `export function SkillsLevelToggle(): JSX.Element` — a self-contained row (label + switch), consumed by Task 4.

- [ ] **Step 1: Add the translation keys**

In `messages/en.json`, inside the `editor.skills` object, add `showLevelLabel` after `proficiency`:

```json
      "proficiency": "Proficiency",
      "showLevelLabel": "Show proficiency level",
```

In `messages/id.json`, inside the same `editor.skills` object, add the matching key after `proficiency`:

```json
      "proficiency": "Tingkat",
      "showLevelLabel": "Tampilkan tingkat kemahiran",
```

- [ ] **Step 2: Create the toggle component**

Create `src/components/editor/editor-sections/ed-section-skills/skills-level-toggle.tsx`, modeled directly on the existing `skills-columns-toggle.tsx` in the same directory:

```tsx
"use client";

import { useTranslations } from "next-intl";
import { Switch } from "@/components/ui/switch";
import { useResumeStore } from "@/lib/store";

export function SkillsLevelToggle() {
  const showLevel = useResumeStore(
    (state) =>
      state.open?.sections.find((s) => s.type === "skills")?.showLevel ??
      true,
  );
  const updateOpen = useResumeStore((state) => state.updateOpen);
  const t = useTranslations("editor.skills");

  function handleChange(checked: boolean) {
    updateOpen((draft) => {
      const section = draft.sections.find((s) => s.type === "skills");
      if (section) section.showLevel = checked;
    });
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">
        {t("showLevelLabel")}
      </span>
      <Switch
        checked={showLevel}
        onCheckedChange={handleChange}
        aria-label={t("showLevelLabel")}
      />
    </div>
  );
}
```

- [ ] **Step 3: Typecheck and lint**

```bash
npx tsc --noEmit
npx biome check src/components/editor/editor-sections/ed-section-skills/skills-level-toggle.tsx messages/en.json messages/id.json
```

Expected: both commands exit 0. (`checked`/`onCheckedChange` is confirmed against `@base-ui/react/switch`'s `SwitchRoot.Props` — `checked?: boolean`, `onCheckedChange?: (checked: boolean, eventDetails) => void`.)

- [ ] **Step 4: Manual verification**

```bash
npm run dev
```

Open a résumé in the editor, expand the Skills accordion with at least one skill row present, and confirm the new "Show proficiency level" row renders next to "Columns" with a working switch (no wiring into the form yet, so toggling it won't visibly change the per-skill row — that's Task 4). Stop the dev server after confirming.

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/editor-sections/ed-section-skills/skills-level-toggle.tsx messages/en.json messages/id.json
git commit -m "feat(editor): add SkillsLevelToggle component and its copy"
```

---

## Task 4: Wire the toggle into the Skills form

**Files:**
- Modify: `src/components/editor/editor-sections/ed-section-skills/ed-section-skills-form.tsx`
- Modify: `src/components/editor/editor-sections/ed-section-skills/ed-section-skills-form-item.tsx`

**Interfaces:**
- Consumes: `SkillsLevelToggle` (Task 3), `Section.showLevel?: boolean` (Task 1).

- [ ] **Step 1: Render `SkillsLevelToggle` in the Skills form**

In `src/components/editor/editor-sections/ed-section-skills/ed-section-skills-form.tsx`, add the import next to the existing `SkillsColumnsToggle` import:

```tsx
import { SkillsColumnsToggle } from "./skills-columns-toggle";
import { SkillsLevelToggle } from "./skills-level-toggle";
```

Then render it alongside `SkillsColumnsToggle` (same `fields.length > 0` branch, so an empty section doesn't show either toggle):

```tsx
          <>
            <SkillsColumnsToggle />
            <SkillsLevelToggle />
            <SortableList
```

- [ ] **Step 2: Hide the per-skill proficiency `Select` when the section's `showLevel` is off**

In `src/components/editor/editor-sections/ed-section-skills/ed-section-skills-form-item.tsx`, add the `useResumeStore` import and read the flag the same way `SkillsColumnsToggle` does:

```tsx
import { SortableItem } from "@/components/shared/sortable-list";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useResumeStore } from "@/lib/store";
import type { SkillsFormValues } from "../resume-form-adapter";
```

Inside `EditorSectionSkillsFormItem`, read the flag right after the existing `useTranslations` call:

```tsx
export function EditorSectionSkillsFormItem(
  props: EditorSectionSkillsFormItemProps,
) {
  const t = useTranslations("editor.skills");
  const showLevel = useResumeStore(
    (state) =>
      state.open?.sections.find((s) => s.type === "skills")?.showLevel ??
      true,
  );
```

Then wrap the existing proficiency `Controller` block in a `showLevel &&` guard:

```tsx
        {showLevel && (
          <Controller
            control={props.control}
            name={`skills.${props.index}.level`}
            render={({ field }) => (
              <Select
                value={field.value || null}
                onValueChange={(value) => field.onChange(value)}
              >
                <SelectTrigger className="w-[87.888%] md:w-36">
                  <SelectValue placeholder={t("proficiency")} />
                </SelectTrigger>
                <SelectContent>
                  {PROFICIENCY_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        )}
```

Leave the rest of the file (the `PROFICIENCY_LEVELS` constant, the name `Input`, both remove `Button`s) untouched — the `level` value stays bound in the form/store even while its control is unmounted, so no data is lost when the toggle flips back on.

- [ ] **Step 3: Typecheck and lint**

```bash
npx tsc --noEmit
npx biome check src/components/editor/editor-sections/ed-section-skills/ed-section-skills-form.tsx src/components/editor/editor-sections/ed-section-skills/ed-section-skills-form-item.tsx
```

Expected: both commands exit 0.

- [ ] **Step 4: Manual verification in the browser**

```bash
npm run dev
```

In the editor, open a résumé with a couple of skills that already have proficiency levels set:
1. Confirm both skills show their level dropdown and the previously chosen values.
2. Flip "Show proficiency level" off — confirm both dropdowns disappear from the form, and the live preview panel's Skills section stops showing any level.
3. Flip it back on — confirm both dropdowns reappear **with their original values still selected** (proving the data was never cleared), and the preview shows the levels again.
4. Add a brand-new skill while the toggle is off, then turn the toggle on — confirm the new skill's dropdown appears and is empty/unset (never auto-assigned a level).

Stop the dev server after confirming all four checks pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/editor-sections/ed-section-skills/ed-section-skills-form.tsx src/components/editor/editor-sections/ed-section-skills/ed-section-skills-form-item.tsx
git commit -m "feat(editor): hide per-skill proficiency input when the section's level toggle is off"
```
