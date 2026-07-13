"use client";

import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SectionColumns } from "@/lib/resume/types";
import { useResumeStore } from "@/lib/store";

const COLUMN_OPTIONS: SectionColumns[] = [1, 2, 3, 4, 5, 6];

export function SkillsColumnsToggle() {
  const columns = useResumeStore(
    (state) =>
      state.open?.sections.find((s) => s.type === "skills")?.columns ?? 2,
  );
  const updateOpen = useResumeStore((state) => state.updateOpen);
  const t = useTranslations("editor.skills");

  function handleChange(value: string | null) {
    if (!value) return;
    const next = Number(value) as SectionColumns;
    updateOpen((draft) => {
      const section = draft.sections.find((s) => s.type === "skills");
      if (section) section.columns = next;
    });
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">{t("columnsLabel")}</span>
      <Select value={String(columns)} onValueChange={handleChange}>
        <SelectTrigger className="w-16" aria-label={t("columnsLabel")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {COLUMN_OPTIONS.map((n) => (
            <SelectItem
              key={n}
              value={String(n)}
              aria-label={t("columnsAria", { count: n })}
            >
              {n}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
