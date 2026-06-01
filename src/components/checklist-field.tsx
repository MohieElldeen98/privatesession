"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, Plus } from "lucide-react";

export function ChecklistField({
  name,
  label,
  options,
  initial = [],
}: {
  name: string;
  label: string;
  options: string[];
  initial?: string[];
}) {
  // كل القيم المتاحة = الافتراضية + أي قيم محفوظة سابقًا + ما يضيفه المستخدم
  const [all, setAll] = useState<string[]>(() =>
    Array.from(new Set([...options, ...initial]))
  );
  const [selected, setSelected] = useState<string[]>(initial);
  const [custom, setCustom] = useState("");

  function toggle(v: string) {
    setSelected((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));
  }

  function addCustom() {
    const v = custom.trim();
    if (!v) return;
    if (!all.includes(v)) setAll((a) => [...a, v]);
    if (!selected.includes(v)) setSelected((s) => [...s, v]);
    setCustom("");
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {/* القيم المختارة تُرسل كحقول مخفية */}
      {selected.map((v) => (
        <input key={v} type="hidden" name={name} value={v} />
      ))}
      <div className="flex flex-wrap gap-2">
        {all.map((opt) => {
          const on = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition-colors",
                on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background text-foreground hover:bg-accent"
              )}
            >
              {on && <Check className="h-3.5 w-3.5" />}
              {opt}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2">
        <Input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="أضف غير الموجود..."
          className="h-10"
        />
        <Button type="button" variant="outline" size="icon" className="h-10 w-10" onClick={addCustom}>
          <Plus />
        </Button>
      </div>
    </div>
  );
}
