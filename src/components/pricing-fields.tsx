"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TOTAL_SESSIONS } from "@/lib/types";
import { formatMoney } from "@/lib/utils";

export function PricingFields({
  defaultPrice,
  defaultDiscount = 0,
}: {
  defaultPrice?: number;
  defaultDiscount?: number;
}) {
  const [price, setPrice] = useState(defaultPrice != null ? String(defaultPrice) : "");
  const [mode, setMode] = useState<"amount" | "percent">("amount");
  const [discValue, setDiscValue] = useState(defaultDiscount ? String(defaultDiscount) : "");

  const priceNum = Number(price || 0);
  const valNum = Number(discValue || 0);
  // قيمة الخصم بالجنيه لكل كورس (12 جلسة)
  const discountAmount =
    mode === "amount"
      ? valNum
      : Math.round(((valNum / 100) * (priceNum * TOTAL_SESSIONS)) * 100) / 100;

  return (
    <>
      <div>
        <Label htmlFor="session_price">سعر الجلسة</Label>
        <Input
          id="session_price"
          name="session_price"
          type="number"
          inputMode="numeric"
          min="0"
          required
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0"
        />
      </div>

      <div>
        <Label htmlFor="disc-value">الخصم (لكل كورس)</Label>
        <div className="flex gap-2">
          <Input
            id="disc-value"
            type="number"
            inputMode="numeric"
            min="0"
            value={discValue}
            onChange={(e) => setDiscValue(e.target.value)}
            placeholder="0"
            className="flex-1"
          />
          <div className="flex shrink-0 overflow-hidden rounded-md border">
            <button
              type="button"
              onClick={() => setMode("amount")}
              className={`px-3 text-sm font-medium ${mode === "amount" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}
            >
              مبلغ
            </button>
            <button
              type="button"
              onClick={() => setMode("percent")}
              className={`px-3 text-sm font-medium ${mode === "percent" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}
            >
              %
            </button>
          </div>
        </div>
        {mode === "percent" && (
          <p className="mt-1 text-xs text-muted-foreground">
            = {formatMoney(discountAmount)} ج خصم على كل كورس
          </p>
        )}
        {/* القيمة الفعلية بالجنيه التي تُحفظ */}
        <input type="hidden" name="discount" value={discountAmount} />
      </div>
    </>
  );
}
