"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, Archive, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PatientListItem {
  id: string;
  name: string;
  phone: string;
  area: string;
  archived: boolean;
  days_system: string;
  default_time: string | null;
}

type SortBy = "name" | "area";
type SystemFilter = "all" | "sat-mon-wed" | "sun-tue-thu";

export function PatientsBrowser({ patients }: { patients: PatientListItem[] }) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [systemFilter, setSystemFilter] = useState<SystemFilter>("all");
  const [showArchive, setShowArchive] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (p: PatientListItem) =>
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      p.area.toLowerCase().includes(q);

    const matchSystem = (p: PatientListItem) => {
      if (systemFilter === "sat-mon-wed") {
        return p.days_system === "sat_mon_wed";
      }

      if (systemFilter === "sun-tue-thu") {
        return p.days_system === "sun_tue_thu";
      }

      return true;
    };
    const sorter = (a: PatientListItem, b: PatientListItem) =>
      sortBy === "name"
        ? a.name.localeCompare(b.name, "ar")
        : a.area.localeCompare(b.area, "ar") || 
          a.name.localeCompare(b.name, "ar");


    return patients
      .filter((p) => match(p) && matchSystem(p))
      .sort(sorter);
  }, [patients, query, sortBy, systemFilter]);

  const active = filtered.filter((p) => !p.archived);
  const archived = filtered.filter((p) => p.archived);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث بالاسم أو الهاتف أو المنطقة"
          className="pr-9"
          inputMode="search"
        />
      </div>

      <div className="flex gap-2">
        <Button
          variant={sortBy === "name" ? "default" : "outline"}
          size="sm"
          onClick={() => setSortBy("name")}
          className="flex-1"
        >
          حسب الاسم
        </Button>
        <Button
          variant={sortBy === "area" ? "default" : "outline"}
          size="sm"
          onClick={() => setSortBy("area")}
          className="flex-1"
        >
          حسب المنطقة
        </Button>
      </div>

<div className="flex gap-2">
  <Button
    variant={systemFilter === "sat-mon-wed" ? "default" : "outline"}
    size="sm"
    onClick={() =>
      setSystemFilter(
        systemFilter === "sat-mon-wed"
          ? "all"
          : "sat-mon-wed"
      )
    }
    className="flex-1"
  >
    سبت - اتنين - أربع
  </Button>

  <Button
    variant={systemFilter === "sun-tue-thu" ? "default" : "outline"}
    size="sm"
    onClick={() =>
      setSystemFilter(
        systemFilter === "sun-tue-thu"
          ? "all"
          : "sun-tue-thu"
      )
    }    
    className="flex-1"
  >
    حد - تلات - خميس
  </Button>
</div>

      {active.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">لا يوجد مرضى نشطون</p>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {active.map((p) => (
            <PatientRow key={p.id} p={p} />
          ))}
        </ul>
      )}

      {archived.length > 0 && (
        <div>
          <button
            onClick={() => setShowArchive((v) => !v)}
            className="flex w-full items-center gap-2 py-2 text-sm font-medium text-muted-foreground"
          >
            <Archive className="h-4 w-4" />
            الأرشيف ({archived.length})
            <ChevronLeft className={cn("h-4 w-4 transition-transform", showArchive && "-rotate-90")} />
          </button>
          {showArchive && (
            <ul className="divide-y rounded-xl border bg-card opacity-80">
              {archived.map((p) => (
                <PatientRow key={p.id} p={p} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function formatTime(time: string | null) {
  if (!time) return "";

  const [hours, minutes] = time.split(":");

  const h = Number(hours);
  const period = h >= 12 ? "م" : "ص";
  const displayHour = h % 12 || 12;

  return `${displayHour}:${minutes} ${period}`;
}

function PatientRow({ p }: { p: PatientListItem }) {
  return (
    <li>
      <Link
        href={`/patients/${p.id}`}
        className="flex items-center gap-3 p-3 transition-colors hover:bg-accent/40"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate font-medium">
              {p.name}
            </div>

            {formatTime(p.default_time) && (
              <div className="text-xs text-muted-foreground whitespace-nowrap">
               {formatTime(p.default_time)}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {p.area}
          </div>
        </div>
        <ChevronLeft className="h-4 w-4 text-muted-foreground" />
      </Link>
    </li>
  );
}
