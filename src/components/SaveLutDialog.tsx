"use client";

import { FilterParams } from "@/lib/lut-engine";
import { CATEGORIES, type Category } from "@/lib/gallery-helpers";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Save, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";

interface SaveLutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  params: FilterParams;
  onSaved?: () => void;
}

export default function SaveLutDialog({
  open,
  onOpenChange,
  params,
  onSaved,
}: SaveLutDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("custom");
  const [isPublished, setIsPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/luts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          category,
          params,
          isPublished,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to save (${res.status})`);
      }
      // Reset form
      setName("");
      setDescription("");
      setCategory("custom");
      setIsPublished(false);
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [name, description, category, params, isPublished, onOpenChange, onSaved]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Save LUT</SheetTitle>
          <SheetDescription>
            Save your current filter settings. Publish to share with the community.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 p-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="lut-name" className="text-xs font-medium text-muted-foreground">
              Name <span className="text-destructive">*</span>
            </label>
            <input
              id="lut-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My cool filter"
              className="h-8 rounded-none border border-border bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="lut-desc" className="text-xs font-medium text-muted-foreground">
              Description
            </label>
            <textarea
              id="lut-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the look and feel..."
              rows={3}
              className="rounded-none border border-border bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="lut-category" className="text-xs font-medium text-muted-foreground">
              Category
            </label>
            <select
              id="lut-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="h-8 rounded-none border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Publish toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="size-4 rounded-none border-border bg-background accent-primary"
            />
            <span className="text-xs text-foreground">Publish to Gallery</span>
          </label>

          {/* Error */}
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={() => void handleSave()}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
