"use client";

import { useTranslations } from "next-intl";
import { Switch } from "@/components/ui/switch";
import { useResumeStore } from "@/lib/store";

export function SkillsLevelToggle() {
  const showLevel = useResumeStore(
    (state) =>
      state.open?.sections.find((s) => s.type === "skills")?.showLevel ?? true,
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
