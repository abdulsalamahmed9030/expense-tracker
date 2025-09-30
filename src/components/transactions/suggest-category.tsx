"use client";

import * as React from "react";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { suggestCategoryAction } from "@/app/(app)/transactions/ai-actions";

type Category = { id: string; name: string };

type Props = {
  /** Pass your existing category list so we can map name -> id */
  categories?: Category[];
  /** Name of the note field in your form (defaults to "note") */
  noteFieldName?: string;
  /** Name of the category select field (defaults to "category_id") */
  categoryFieldName?: string;
  /** Called when AI suggests a name that is NOT in categories */
  onSuggestNew?: (name: string) => void;
  className?: string;
};

export default function SuggestCategoryButton({
  categories,
  noteFieldName = "note",
  categoryFieldName = "category_id",
  onSuggestNew,
  className,
}: Props) {
  const form = useFormContext(); // assumes FormProvider up the tree
  const [loading, setLoading] = React.useState(false);

  async function onSuggest() {
    const note: unknown = form.getValues(noteFieldName);
    const noteStr = typeof note === "string" ? note.trim() : "";

    if (!noteStr) {
      toast.message("Add a note first", {
        description: "Write a short description like ‘Swiggy dinner with friends’.",
      });
      return;
    }

    setLoading(true);
    try {
      const candidateNames = categories?.map((c) => c.name) ?? undefined;
      const res = await suggestCategoryAction({ note: noteStr, candidates: candidateNames });

      if (!res.ok) {
        toast.error(res.error || "Couldn’t suggest a category.");
        return;
      }

      const { categoryName, confidence } = res;
      const pct = Math.round(confidence * 100);

      // Try to map suggestion to an existing category id
      const match = categories?.find(
        (c) => c.name.toLowerCase() === categoryName.toLowerCase()
      );

      if (match) {
        form.setValue(categoryFieldName, match.id, { shouldValidate: true, shouldDirty: true });
        toast.success(`Suggested: ${match.name} (${pct}%)`);
      } else {
        // Notify parent so it can offer "Create & select"
        onSuggestNew?.(categoryName);
        toast.message(`Suggested new category: ${categoryName}`, {
          description: `Confidence ${pct}%.`,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn("[AI][tx.suggestCategory.ui] error:", message);
      toast.error("AI suggestion failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={className}
      onClick={onSuggest}
      disabled={loading}
      aria-label="Suggest category from note"
      title="Suggest category from note"
    >
      <Sparkles className="mr-1 h-4 w-4" />
      {loading ? "Suggesting…" : "Suggest"}
    </Button>
  );
}
