import type { SectionColumns } from "@/lib/resume/types";
import { cn } from "@/lib/utils";
import type { SkillItemView } from "./resume-preview";
import { ResumeSkillItem } from "./resume-skill-item";

interface ResumeSkillsListProps {
  items: SkillItemView[];
  columns: SectionColumns;
}

/** Tailwind class names must appear as literal strings for the JIT scanner to find them. */
const GRID_COLS_CLASS: Record<SectionColumns, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
};

export function ResumeSkillsList(props: ResumeSkillsListProps) {
  return (
    <ul className={cn("grid gap-x-8 gap-y-1", GRID_COLS_CLASS[props.columns])}>
      {props.items.map((item) => (
        <ResumeSkillItem key={item.id} {...item} />
      ))}
    </ul>
  );
}
