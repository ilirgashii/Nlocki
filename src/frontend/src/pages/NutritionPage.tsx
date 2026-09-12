import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  Barcode,
  Brain,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Coffee,
  Download,
  Droplets,
  Loader2,
  Moon,
  Plus,
  Search,
  Sparkles,
  Sun,
  Utensils,
  X,
  Zap,
} from "lucide-react";
import { useRef, useState } from "react";
import { ExportDialog } from "../components/ExportDialog";
import {
  todayISO,
  useAddMeal,
  useDeleteMeal,
  useExportNutritionCSV,
  useLogWater,
  useMealsForDate,
  useSearchFoodPresets,
  useSuggestMeals,
  useWaterForDate,
} from "../hooks/use-backend";
import type { FoodPreset, Meal, MealSuggestion } from "../types";

// ── Constants ─────────────────────────────────────────────────────────────────
const GOALS = { calories: 2000, protein: 150, carbs: 200, fat: 65 };
const WATER_GOAL_ML = 8 * 240; // 8 cups × 240ml

const WATER_BUTTONS: { label: string; ml: number; icon: string }[] = [
  { label: "+½ cup", ml: 120, icon: "💧" },
  { label: "+1 cup", ml: 240, icon: "🥤" },
  { label: "+1½ cups", ml: 360, icon: "🫗" },
  { label: "+2 cups", ml: 480, icon: "💦" },
];

const PORTIONS: { label: string; value: number }[] = [
  { label: "½", value: 0.5 },
  { label: "1", value: 1 },
  { label: "1½", value: 1.5 },
  { label: "2", value: 2 },
];

// Popular quick-add foods shown as visual grid buttons
const QUICK_FOODS = [
  { id: 1, name: "Rice", emoji: "🍚", kcal: 130, per: "100g" },
  { id: 8, name: "Chicken", emoji: "🍗", kcal: 165, per: "100g" },
  { id: 10, name: "Salmon", emoji: "🐟", kcal: 208, per: "100g" },
  { id: 11, name: "Tuna", emoji: "🐠", kcal: 116, per: "100g" },
  { id: 13, name: "Eggs", emoji: "🥚", kcal: 155, per: "100g" },
  { id: 3, name: "Oats", emoji: "🥣", kcal: 71, per: "100g" },
  { id: 31, name: "Banana", emoji: "🍌", kcal: 89, per: "100g" },
  { id: 32, name: "Apple", emoji: "🍎", kcal: 52, per: "100g" },
  { id: 23, name: "Broccoli", emoji: "🥦", kcal: 35, per: "100g" },
  { id: 25, name: "Sweet Potato", emoji: "🍠", kcal: 90, per: "100g" },
  { id: 18, name: "Greek Yogurt", emoji: "🫙", kcal: 59, per: "100g" },
  { id: 19, name: "Cottage Cheese", emoji: "🧀", kcal: 72, per: "100g" },
  { id: 40, name: "Almonds", emoji: "🌰", kcal: 579, per: "100g" },
  { id: 41, name: "Peanut Butter", emoji: "🥜", kcal: 588, per: "100g" },
  { id: 4, name: "Pasta", emoji: "🍝", kcal: 158, per: "100g" },
  { id: 12, name: "Beef", emoji: "🥩", kcal: 215, per: "100g" },
];

// ── Open Food Facts types ──────────────────────────────────────────────────────
interface OFFProduct {
  product_name?: string;
  nutriments?: {
    "energy-kcal_100g"?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
  };
  brands?: string;
  image_url?: string;
}

interface ScannedFood {
  name: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  imageUrl?: string;
  brand?: string;
}

async function fetchByBarcode(barcode: string): Promise<ScannedFood | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { status: number; product?: OFFProduct };
    if (data.status !== 1 || !data.product) return null;
    const p = data.product;
    const n = p.nutriments ?? {};
    const name = [p.brands, p.product_name].filter(Boolean).join(" — ");
    return {
      name: name || "Unknown product",
      caloriesPer100g: Math.round(n["energy-kcal_100g"] ?? 0),
      proteinPer100g: Math.round((n.proteins_100g ?? 0) * 10) / 10,
      carbsPer100g: Math.round((n.carbohydrates_100g ?? 0) * 10) / 10,
      fatPer100g: Math.round((n.fat_100g ?? 0) * 10) / 10,
      imageUrl: p.image_url,
      brand: p.brands,
    };
  } catch {
    return null;
  }
}

async function fetchByPhoto(file: File): Promise<ScannedFood | null> {
  try {
    if ("BarcodeDetector" in window) {
      const img = await createImageBitmap(file);
      // @ts-expect-error BarcodeDetector is not yet in TypeScript lib
      const detector = new BarcodeDetector();
      const barcodes = (await detector.detect(img)) as { rawValue: string }[];
      if (barcodes.length > 0) return fetchByBarcode(barcodes[0].rawValue);
    }
    return null;
  } catch {
    return null;
  }
}

type ScanState =
  | { status: "idle" }
  | { status: "scanning" }
  | { status: "found"; food: ScannedFood; mealType: Meal["mealType"] }
  | { status: "error"; message: string }
  | { status: "barcode_input" };

// ── ScannedFoodCard ────────────────────────────────────────────────────────────
function ScannedFoodCard({
  food,
  mealType,
  date,
  onConfirm,
  onDismiss,
}: {
  food: ScannedFood;
  mealType: Meal["mealType"];
  date: string;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  const addMeal = useAddMeal();
  const [grams, setGrams] = useState("100");
  const [selectedType, setSelectedType] = useState<Meal["mealType"]>(mealType);

  const g = Math.max(1, Number(grams) || 100);
  const cal = Math.round((food.caloriesPer100g * g) / 100);
  const prot = Math.round(((food.proteinPer100g * g) / 100) * 10) / 10;
  const carb = Math.round(((food.carbsPer100g * g) / 100) * 10) / 10;
  const fat = Math.round(((food.fatPer100g * g) / 100) * 10) / 10;

  function handleAdd() {
    addMeal.mutate(
      {
        date,
        name: `${food.name} (${g}g)`,
        mealType: selectedType,
        calories: cal,
        proteinG: prot,
        carbsG: carb,
        fatG: fat,
        notes: "",
      },
      { onSuccess: onConfirm },
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/30 backdrop-blur-sm p-4"
      data-ocid="nutrition.scanned_food_dialog"
    >
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-elevated overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary/5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-display font-semibold text-foreground">
              Product Found
            </span>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Close"
            data-ocid="nutrition.scanned_food_close"
            className="p-1 text-muted-foreground hover:text-foreground transition-smooth"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-4 py-3 flex items-start gap-3">
          {food.imageUrl && (
            <img
              src={food.imageUrl}
              alt={food.name}
              className="w-14 h-14 rounded-xl object-cover shrink-0 border border-border"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
              {food.name}
            </p>
            {food.brand && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {food.brand}
              </p>
            )}
            <div className="flex flex-wrap gap-1 mt-1.5">
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                {food.caloriesPer100g} kcal
              </span>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[oklch(var(--chart-3)/0.12)] text-[oklch(var(--chart-3))]">
                P {food.proteinPer100g}g
              </span>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[oklch(var(--chart-4)/0.12)] text-[oklch(var(--chart-4))]">
                C {food.carbsPer100g}g
              </span>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[oklch(var(--chart-1)/0.12)] text-[oklch(var(--chart-1))]">
                F {food.fatPer100g}g
              </span>
              <span className="text-[10px] text-muted-foreground self-center">
                per 100g
              </span>
            </div>
          </div>
        </div>
        <div className="px-4 pb-3 space-y-3">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {(["breakfast", "lunch", "dinner", "snack"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSelectedType(t)}
                data-ocid={`nutrition.scanned_meal_type.${t}`}
                className={`shrink-0 px-3 py-1 text-xs rounded-full font-medium transition-smooth capitalize ${
                  selectedType === t
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label
              htmlFor="scanned-grams"
              className="text-xs text-muted-foreground shrink-0"
            >
              Grams:
            </label>
            <Input
              id="scanned-grams"
              type="number"
              min="1"
              max="2000"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
              data-ocid="nutrition.scanned_grams_input"
              className="h-8 text-sm w-20 text-center"
            />
            <div className="flex-1 text-xs font-semibold text-primary whitespace-nowrap">
              = {cal} kcal · P{prot}·C{carb}·F{fat}g
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onDismiss}
              data-ocid="nutrition.scanned_food_cancel"
              className="flex-1 h-9"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={addMeal.isPending}
              data-ocid="nutrition.scanned_food_confirm"
              className="flex-1 h-9"
            >
              {addMeal.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
              ) : (
                <Plus className="w-3.5 h-3.5 mr-1" />
              )}
              Add to Log
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ScanErrorCard ─────────────────────────────────────────────────────────────
function ScanErrorCard({
  message,
  onDismiss,
  onManual,
}: {
  message: string;
  onDismiss: () => void;
  onManual: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/30 backdrop-blur-sm p-4"
      data-ocid="nutrition.scan_error_dialog"
    >
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-elevated overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-destructive/5">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <span className="text-sm font-display font-semibold text-foreground">
              Not Recognized
            </span>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Close"
            data-ocid="nutrition.scan_error_close"
            className="p-1 text-muted-foreground hover:text-foreground transition-smooth"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-4 py-4 space-y-3">
          <p className="text-sm text-muted-foreground">{message}</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onDismiss}
              data-ocid="nutrition.scan_error_dismiss"
              className="flex-1 h-9"
            >
              Dismiss
            </Button>
            <Button
              size="sm"
              onClick={onManual}
              data-ocid="nutrition.scan_error_manual"
              className="flex-1 h-9"
            >
              Search Manually
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── BarcodeInputModal ─────────────────────────────────────────────────────────
function BarcodeInputModal({
  onScan,
  onDismiss,
}: {
  onScan: (barcode: string) => void;
  onDismiss: () => void;
}) {
  const [value, setValue] = useState("");
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/30 backdrop-blur-sm p-4"
      data-ocid="nutrition.barcode_input_dialog"
    >
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-elevated overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Barcode className="w-4 h-4 text-primary" />
            <span className="text-sm font-display font-semibold text-foreground">
              Enter Barcode
            </span>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Close"
            data-ocid="nutrition.barcode_input_close"
            className="p-1 text-muted-foreground hover:text-foreground transition-smooth"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-4 py-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Type the barcode number from the product package.
          </p>
          <Input
            type="text"
            placeholder="e.g. 5901234123457"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            data-ocid="nutrition.barcode_manual_input"
            onKeyDown={(e) => {
              if (e.key === "Enter" && value.trim()) onScan(value.trim());
            }}
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onDismiss}
              data-ocid="nutrition.barcode_cancel"
              className="flex-1 h-9"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!value.trim()}
              onClick={() => onScan(value.trim())}
              data-ocid="nutrition.barcode_lookup_button"
              className="flex-1 h-9"
            >
              <Search className="w-3.5 h-3.5 mr-1" />
              Look Up
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Week helpers ──────────────────────────────────────────────────────────────
function getWeekDays(anchorDate: string): string[] {
  const anchor = new Date(`${anchorDate}T00:00:00`);
  const dow = anchor.getDay();
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() - ((dow + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

const DAY_ABBR = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function getDayAbbr(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return DAY_ABBR[(d.getDay() + 6) % 7];
}

function getDayNum(iso: string): number {
  return new Date(`${iso}T00:00:00`).getDate();
}

function mlToCups(ml: number): string {
  const cups = ml / 240;
  if (cups === 0) return "0 cups";
  if (cups % 1 === 0) return `${cups} cup${cups !== 1 ? "s" : ""}`;
  return `${cups.toFixed(1)} cups`;
}

// ── Weekly calendar strip ─────────────────────────────────────────────────────
function WeekStrip({
  selected,
  today,
  onSelect,
}: {
  selected: string;
  today: string;
  onSelect: (d: string) => void;
}) {
  const [anchor, setAnchor] = useState(today);
  const days = getWeekDays(anchor);

  function prevWeek() {
    const d = new Date(`${anchor}T00:00:00`);
    d.setDate(d.getDate() - 7);
    setAnchor(d.toISOString().split("T")[0]);
  }
  function nextWeek() {
    const d = new Date(`${anchor}T00:00:00`);
    d.setDate(d.getDate() + 7);
    setAnchor(d.toISOString().split("T")[0]);
  }

  return (
    <div
      className="flex items-center gap-1 bg-card rounded-2xl px-2 py-2 border border-border shadow-subtle"
      data-ocid="nutrition.week_strip"
    >
      <button
        type="button"
        onClick={prevWeek}
        aria-label="Previous week"
        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-smooth"
        data-ocid="nutrition.week_prev"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <div className="flex flex-1 gap-1 overflow-x-auto scrollbar-hide">
        {days.map((day) => {
          const isToday = day === today;
          const isSelected = day === selected;
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelect(day)}
              aria-label={day}
              data-ocid={`nutrition.week_day.${getDayAbbr(day).toLowerCase()}`}
              className={`flex flex-col items-center gap-0.5 min-w-[2.75rem] px-2 py-1.5 rounded-xl text-xs font-medium transition-smooth ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-subtle"
                  : isToday
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span className="text-[10px] uppercase tracking-wide font-semibold">
                {getDayAbbr(day)}
              </span>
              <span
                className={`text-sm font-bold ${isSelected ? "text-primary-foreground" : isToday ? "text-primary" : "text-foreground"}`}
              >
                {getDayNum(day)}
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={nextWeek}
        aria-label="Next week"
        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-smooth"
        data-ocid="nutrition.week_next"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Macro Progress Bars ───────────────────────────────────────────────────────
interface MacroItem {
  label: string;
  current: number;
  target: number;
  unit: string;
  color: string;
  bgColor: string;
}

function MacroBars({ items }: { items: MacroItem[] }) {
  return (
    <div
      className="bg-card rounded-2xl border border-border p-4"
      data-ocid="nutrition.macro_bars"
    >
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-display font-semibold text-foreground">
          Today's Macros
        </h2>
      </div>
      <div className="space-y-3">
        {items.map((item, i) => {
          const pct = Math.min(
            100,
            Math.round((item.current / item.target) * 100),
          );
          return (
            <div key={item.label} data-ocid={`nutrition.macro_bar.${i + 1}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-foreground">
                  {item.label}
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-xs font-bold tabular-nums"
                    style={{ color: item.color }}
                  >
                    {item.current}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    / {item.target} {item.unit}
                  </span>
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: item.bgColor, color: item.color }}
                  >
                    {pct}%
                  </span>
                </div>
              </div>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${pct}%`, background: item.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Water Intake Today ────────────────────────────────────────────────────────
function WaterIntakeSection({
  date,
  waterMl,
}: {
  date: string;
  waterMl: number;
}) {
  const logWater = useLogWater();
  const pct = Math.min(100, Math.round((waterMl / WATER_GOAL_ML) * 100));
  const cups = waterMl / 240;

  return (
    <div
      className="bg-card rounded-2xl border border-border overflow-hidden"
      data-ocid="nutrition.water_section"
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-[oklch(var(--chart-2))]" />
            <h2 className="text-sm font-display font-semibold text-foreground">
              Water Intake Today
            </h2>
          </div>
          <span
            className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded-full ${
              waterMl >= WATER_GOAL_ML
                ? "bg-[oklch(var(--chart-2)/0.15)] text-[oklch(var(--chart-2))]"
                : "bg-muted text-muted-foreground"
            }`}
            data-ocid="nutrition.water_total"
          >
            {pct}%
          </span>
        </div>

        {/* Current total display */}
        <div className="flex items-end gap-2 mb-3">
          <span className="text-3xl font-display font-bold text-[oklch(var(--chart-2))] leading-none tabular-nums">
            {waterMl}
          </span>
          <div className="flex flex-col leading-none pb-0.5">
            <span className="text-xs font-semibold text-foreground">ml</span>
            <span className="text-xs text-muted-foreground">
              ≈ {mlToCups(waterMl)}
            </span>
          </div>
          <span className="ml-auto text-xs text-muted-foreground pb-0.5">
            Goal: {WATER_GOAL_ML}ml ({WATER_GOAL_ML / 240} cups)
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-3 rounded-full bg-muted overflow-hidden mb-1">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${pct}%`,
              background:
                waterMl >= WATER_GOAL_ML
                  ? "oklch(var(--chart-2))"
                  : "oklch(var(--chart-2) / 0.8)",
            }}
          />
        </div>
        {waterMl >= WATER_GOAL_ML ? (
          <p className="text-[10px] text-[oklch(var(--chart-2))] font-semibold text-center">
            🎉 Daily water goal reached! Great job!
          </p>
        ) : (
          <p className="text-[10px] text-muted-foreground">
            {Math.max(0, WATER_GOAL_ML - waterMl)}ml more to reach your goal
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-border mx-4" />

      {/* Quick-add buttons */}
      <div className="px-4 py-3">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Quick Add
        </p>
        <div className="grid grid-cols-4 gap-2">
          {WATER_BUTTONS.map(({ label, ml, icon }) => (
            <button
              key={ml}
              type="button"
              onClick={() => logWater.mutate({ date, addMl: ml })}
              disabled={logWater.isPending}
              data-ocid={`nutrition.water_button.${ml}`}
              className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl border border-[oklch(var(--chart-2)/0.3)] bg-[oklch(var(--chart-2)/0.07)] hover:bg-[oklch(var(--chart-2)/0.15)] hover:border-[oklch(var(--chart-2)/0.5)] text-[oklch(var(--chart-2))] transition-smooth disabled:opacity-50 active:scale-95"
            >
              <span className="text-lg leading-none">{icon}</span>
              <span className="text-[10px] font-bold leading-none">
                {label}
              </span>
              <span className="text-[9px] text-muted-foreground leading-none">
                {ml}ml
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Cup visual tracker */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(Array.from({ length: WATER_GOAL_ML / 240 }) as undefined[]).map(
            (_v, i) => {
              const filled = i < cups;
              const partial = !filled && i < cups && cups % 1 > 0;
              return (
                <div
                  key={`cup-slot-${i + 1}`}
                  title={`Cup ${i + 1}`}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-smooth ${
                    filled
                      ? "bg-[oklch(var(--chart-2)/0.2)] text-[oklch(var(--chart-2))]"
                      : partial
                        ? "bg-[oklch(var(--chart-2)/0.1)] text-[oklch(var(--chart-2)/0.5)]"
                        : "bg-muted text-muted-foreground/30"
                  }`}
                >
                  💧
                </div>
              );
            },
          )}
        </div>
      </div>
    </div>
  );
}

// ── Quick Food Grid ───────────────────────────────────────────────────────────
function QuickFoodGrid({
  date,
  defaultMealType,
}: {
  date: string;
  defaultMealType: Meal["mealType"];
}) {
  const addMeal = useAddMeal();
  const { data: allPresets = [] } = useSearchFoodPresets("");
  const [portionModal, setPortionModal] = useState<{
    id: number;
    name: string;
    emoji: string;
  } | null>(null);
  const [portion, setPortion] = useState(1);
  const [mealType, setMealType] = useState<Meal["mealType"]>(defaultMealType);

  function handleQuickFoodClick(food: (typeof QUICK_FOODS)[0]) {
    setPortionModal({ id: food.id, name: food.name, emoji: food.emoji });
    setPortion(1);
  }

  function handlePortionAdd() {
    if (!portionModal) return;
    const preset = allPresets.find((p) => p.id === portionModal.id);
    if (!preset) return;
    const grams = portion * 100;
    addMeal.mutate({
      date,
      name: `${preset.name} (${grams}g)`,
      mealType,
      calories: Math.round((preset.caloriesPer100g * grams) / 100),
      proteinG: Math.round((preset.proteinPer100g * grams) / 100),
      carbsG: Math.round((preset.carbsPer100g * grams) / 100),
      fatG: Math.round((preset.fatPer100g * grams) / 100),
      notes: "",
    });
    setPortionModal(null);
  }

  return (
    <>
      <div
        className="bg-card rounded-2xl border border-border overflow-hidden"
        data-ocid="nutrition.quick_food_grid"
      >
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-display font-semibold text-foreground">
              Ready-Made Foods
            </h2>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Tap a food to add it — choose your portion size
          </p>
        </div>
        <div className="px-4 pb-4 grid grid-cols-4 gap-2">
          {QUICK_FOODS.map((food, i) => (
            <button
              key={food.id}
              type="button"
              onClick={() => handleQuickFoodClick(food)}
              data-ocid={`nutrition.quick_food.${i + 1}`}
              className="flex flex-col items-center gap-1 py-3 px-1 rounded-xl border border-border bg-background hover:bg-primary/5 hover:border-primary/30 transition-smooth active:scale-95 group"
            >
              <span className="text-2xl leading-none">{food.emoji}</span>
              <span className="text-[10px] font-semibold text-foreground text-center leading-tight line-clamp-2 group-hover:text-primary transition-smooth">
                {food.name}
              </span>
              <span className="text-[9px] text-muted-foreground font-medium">
                {food.kcal} kcal
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Portion picker modal */}
      {portionModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/30 backdrop-blur-sm p-4"
          data-ocid="nutrition.portion_dialog"
        >
          <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-elevated overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary/5">
              <div className="flex items-center gap-2">
                <span className="text-xl">{portionModal.emoji}</span>
                <span className="text-sm font-display font-semibold text-foreground">
                  {portionModal.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPortionModal(null)}
                aria-label="Close"
                data-ocid="nutrition.portion_close"
                className="p-1 text-muted-foreground hover:text-foreground transition-smooth"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-4 py-4 space-y-4">
              {/* Meal type */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Add to
                </p>
                <div className="flex gap-1 flex-wrap">
                  {(["breakfast", "lunch", "dinner", "snack"] as const).map(
                    (t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setMealType(t)}
                        data-ocid={`nutrition.portion_meal_type.${t}`}
                        className={`px-3 py-1 text-xs rounded-full font-medium transition-smooth capitalize ${
                          mealType === t
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {t}
                      </button>
                    ),
                  )}
                </div>
              </div>
              {/* Portion selector */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Portion size
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {PORTIONS.map((p) => {
                    const preset = allPresets.find(
                      (pr) => pr.id === portionModal.id,
                    );
                    const cal = preset
                      ? Math.round(
                          (preset.caloriesPer100g * p.value * 100) / 100,
                        )
                      : 0;
                    return (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setPortion(p.value)}
                        data-ocid={`nutrition.portion_size.${p.label}`}
                        className={`flex flex-col items-center py-3 rounded-xl border font-semibold transition-smooth ${
                          portion === p.value
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground bg-background"
                        }`}
                      >
                        <span className="text-sm leading-none">{p.label}×</span>
                        <span
                          className={`text-[10px] mt-1 leading-none ${portion === p.value ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                        >
                          {cal} kcal
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPortionModal(null)}
                  data-ocid="nutrition.portion_cancel"
                  className="flex-1 h-10"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handlePortionAdd}
                  disabled={addMeal.isPending}
                  data-ocid="nutrition.portion_confirm"
                  className="flex-1 h-10"
                >
                  {addMeal.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  ) : (
                    <Plus className="w-4 h-4 mr-1.5" />
                  )}
                  Add to {mealType}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Meal Suggestions Panel ────────────────────────────────────────────────────
function MealSuggestionsPanel({
  date,
  remainingCalories,
  remainingProtein,
  remainingCarbs,
  remainingFat,
}: {
  date: string;
  remainingCalories: number;
  remainingProtein: number;
  remainingCarbs: number;
  remainingFat: number;
}) {
  const [open, setOpen] = useState(false);
  const addMeal = useAddMeal();
  const allGoalsMet =
    remainingCalories <= 0 &&
    remainingProtein <= 0 &&
    remainingCarbs <= 0 &&
    remainingFat <= 0;

  const {
    data: suggestions = [],
    isFetching,
    refetch,
  } = useSuggestMeals(
    Math.max(0, remainingCalories),
    Math.max(0, remainingProtein),
    Math.max(0, remainingCarbs),
    Math.max(0, remainingFat),
  );

  async function handleOpen() {
    setOpen(true);
    if (!allGoalsMet) {
      await refetch();
    }
  }

  function handleClose() {
    setOpen(false);
  }

  function handleAddToLog(suggestion: MealSuggestion) {
    addMeal.mutate(
      {
        date,
        name: suggestion.name,
        mealType: "snack",
        calories: suggestion.calories,
        proteinG: suggestion.protein,
        carbsG: suggestion.carbs,
        fatG: suggestion.fat,
        notes: "AI suggestion",
      },
      { onSuccess: handleClose },
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        data-ocid="nutrition.suggest_meals_button"
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl border border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-semibold text-sm transition-smooth group"
      >
        <Brain className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
        Suggest Meals for Remaining Macros
        <Sparkles className="w-3.5 h-3.5 opacity-70" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/30 backdrop-blur-sm p-4"
          data-ocid="nutrition.suggestions_dialog"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") handleClose();
          }}
        >
          <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-elevated overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary/5">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                <span className="text-sm font-display font-semibold text-foreground">
                  Meal Suggestions
                </span>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close"
                data-ocid="nutrition.suggestions_close_button"
                className="p-1 text-muted-foreground hover:text-foreground transition-smooth"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-4 py-3 max-h-[70vh] overflow-y-auto">
              {allGoalsMet ? (
                <div
                  className="flex flex-col items-center py-6 gap-2 text-center"
                  data-ocid="nutrition.suggestions_goals_met"
                >
                  <span className="text-3xl">🎉</span>
                  <p className="text-sm font-semibold text-foreground">
                    All your macro goals are met for today!
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Amazing work — you've hit your calorie, protein, carbs, and
                    fat targets.
                  </p>
                </div>
              ) : isFetching ? (
                <div
                  className="flex flex-col items-center py-8 gap-3"
                  data-ocid="nutrition.suggestions_loading_state"
                >
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">
                    Finding the best meals for you…
                  </p>
                </div>
              ) : suggestions.length === 0 ? (
                <div
                  className="flex flex-col items-center py-6 gap-2 text-center"
                  data-ocid="nutrition.suggestions_empty_state"
                >
                  <span className="text-2xl">🤔</span>
                  <p className="text-sm text-muted-foreground">
                    No suggestions found. Try adjusting your macro goals.
                  </p>
                </div>
              ) : (
                <div
                  className="space-y-3"
                  data-ocid="nutrition.suggestions_list"
                >
                  <p className="text-[11px] text-muted-foreground pb-1">
                    Based on your remaining macros today —{" "}
                    <span className="text-primary font-semibold">
                      {Math.round(Math.max(0, remainingCalories))} kcal
                    </span>{" "}
                    left
                  </p>
                  {suggestions.map((s, i) => (
                    <div
                      key={`${s.name}-${i}`}
                      data-ocid={`nutrition.suggestion_item.${i + 1}`}
                      className="bg-background rounded-xl border border-border p-3 flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground leading-snug flex-1 min-w-0">
                          {s.name}
                        </p>
                        <span className="shrink-0 text-sm font-bold text-primary tabular-nums">
                          {s.calories} kcal
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[oklch(var(--chart-3)/0.12)] text-[oklch(var(--chart-3))]">
                          P {s.protein}g
                        </span>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[oklch(var(--chart-4)/0.12)] text-[oklch(var(--chart-4))]">
                          C {s.carbs}g
                        </span>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[oklch(var(--chart-1)/0.12)] text-[oklch(var(--chart-1))]">
                          F {s.fat}g
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddToLog(s)}
                        disabled={addMeal.isPending}
                        data-ocid={`nutrition.suggestion_add_button.${i + 1}`}
                        className="h-8 text-xs border-primary/30 text-primary hover:bg-primary/5"
                      >
                        {addMeal.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        ) : (
                          <Plus className="w-3 h-3 mr-1" />
                        )}
                        Add to Log
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Food item row ─────────────────────────────────────────────────────────────
function FoodRow({
  meal,
  index,
  onDelete,
}: {
  meal: Meal;
  index: number;
  onDelete: () => void;
}) {
  return (
    <div
      className="flex items-center gap-2 py-2.5 group"
      data-ocid={`nutrition.food_item.${index + 1}`}
    >
      <div className="flex-1 min-w-0">
        <span className="text-sm text-foreground truncate block">
          {meal.name}
        </span>
        <div className="flex flex-wrap items-center gap-1 mt-0.5">
          {meal.proteinG > 0 && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[oklch(var(--chart-3)/0.15)] text-[oklch(var(--chart-3))]">
              P {meal.proteinG}g
            </span>
          )}
          {meal.carbsG > 0 && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[oklch(var(--chart-4)/0.15)] text-[oklch(var(--chart-4))]">
              C {meal.carbsG}g
            </span>
          )}
          {meal.fatG > 0 && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[oklch(var(--chart-1)/0.15)] text-[oklch(var(--chart-1))]">
              F {meal.fatG}g
            </span>
          )}
          <span className="text-[10px] text-muted-foreground font-medium">
            {meal.calories} kcal
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Remove"
        data-ocid={`nutrition.delete_food_button.${index + 1}`}
        className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-smooth"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Meal section ──────────────────────────────────────────────────────────────
const MEAL_META: Record<
  Meal["mealType"],
  { label: string; icon: React.ReactNode; gradient: string }
> = {
  breakfast: {
    label: "Breakfast",
    icon: <Coffee className="w-4 h-4" />,
    gradient: "from-amber-500/10 to-transparent",
  },
  lunch: {
    label: "Lunch",
    icon: <Sun className="w-4 h-4" />,
    gradient: "from-orange-500/10 to-transparent",
  },
  dinner: {
    label: "Dinner",
    icon: <Moon className="w-4 h-4" />,
    gradient: "from-indigo-500/10 to-transparent",
  },
  snack: {
    label: "Snacks",
    icon: <Utensils className="w-4 h-4" />,
    gradient: "from-primary/10 to-transparent",
  },
};

function MealSection({
  type,
  meals,
  onAddClick,
  onDelete,
  baseIndex,
}: {
  type: Meal["mealType"];
  meals: Meal[];
  onAddClick: () => void;
  onDelete: (id: string) => void;
  baseIndex: number;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const meta = MEAL_META[type];
  const totalCal = meals.reduce((s, m) => s + m.calories, 0);

  return (
    <div
      className="bg-card rounded-2xl border border-border overflow-hidden"
      data-ocid={`nutrition.meal_section.${type}`}
    >
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-smooth"
        data-ocid={`nutrition.meal_header.${type}`}
      >
        <div className="flex items-center gap-2">
          <span className="text-primary">{meta.icon}</span>
          <span className="text-sm font-display font-semibold text-foreground">
            {meta.label}
          </span>
          {totalCal > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {totalCal} kcal
            </span>
          )}
          {meals.length > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {meals.length} item{meals.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddClick();
            }}
            data-ocid={`nutrition.add_food_button.${type}`}
            className="flex items-center gap-1 text-xs text-primary border border-primary/30 rounded-full px-2.5 py-1 hover:bg-primary/5 transition-smooth"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
          {collapsed ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>
      {!collapsed &&
        (meals.length === 0 ? (
          <div
            className="px-4 py-4 text-xs text-muted-foreground text-center"
            data-ocid={`nutrition.meal_empty.${type}`}
          >
            No items yet — tap Add to log your {meta.label.toLowerCase()}
          </div>
        ) : (
          <div className="px-4 divide-y divide-border/40">
            {meals.map((meal, i) => (
              <FoodRow
                key={meal.id}
                meal={meal}
                index={baseIndex + i}
                onDelete={() => onDelete(meal.id)}
              />
            ))}
          </div>
        ))}
    </div>
  );
}

// ── Food Preset Row (full list) ───────────────────────────────────────────────
function PresetRow({
  preset,
  index,
  selectedPortion,
  onPortionChange,
  onAdd,
  isPending,
}: {
  preset: FoodPreset;
  index: number;
  selectedPortion: number;
  onPortionChange: (v: number) => void;
  onAdd: () => void;
  isPending: boolean;
}) {
  const grams = selectedPortion * 100;
  const cal = Math.round((preset.caloriesPer100g * grams) / 100);
  const prot = Math.round((preset.proteinPer100g * grams) / 100);
  const carb = Math.round((preset.carbsPer100g * grams) / 100);
  const fat = Math.round((preset.fatPer100g * grams) / 100);

  return (
    <div
      className="py-3 border-b border-border/50 last:border-0"
      data-ocid={`nutrition.preset_item.${index + 1}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {preset.name}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {preset.caloriesPer100g} kcal · P{preset.proteinPer100g}g · C
            {preset.carbsPer100g}g · F{preset.fatPer100g}g per 100g
          </p>
        </div>
        <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
          {preset.category}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <fieldset
          className="flex gap-1 border-none p-0 m-0"
          data-ocid={`nutrition.preset_portion.${index + 1}`}
        >
          <legend className="sr-only">Portion size</legend>
          {PORTIONS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => onPortionChange(p.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-smooth ${
                selectedPortion === p.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground bg-background"
              }`}
            >
              {p.label}×
            </button>
          ))}
        </fieldset>
        <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto">
          <span className="text-xs font-bold text-primary whitespace-nowrap">
            {cal} kcal
          </span>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
            P{prot}·C{carb}·F{fat}
          </span>
        </div>
        <Button
          size="sm"
          onClick={onAdd}
          disabled={isPending}
          data-ocid={`nutrition.preset_add_button.${index + 1}`}
          className="shrink-0 h-7 px-3 text-xs"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add
        </Button>
      </div>
    </div>
  );
}

// ── Full Food Search Panel ────────────────────────────────────────────────────
function FoodSearchPanel({
  date,
  defaultMealType,
}: {
  date: string;
  defaultMealType: Meal["mealType"];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [portions, setPortions] = useState<Record<number, number>>({});
  const [mealType, setMealType] = useState<Meal["mealType"]>(defaultMealType);
  const addMeal = useAddMeal();
  const { data: presets = [] } = useSearchFoodPresets(search);
  const searchRef = useRef<HTMLInputElement>(null);

  function getPortionFor(id: number) {
    return portions[id] ?? 1;
  }

  function handleAdd(preset: FoodPreset) {
    const portion = getPortionFor(preset.id);
    const grams = portion * 100;
    addMeal.mutate({
      date,
      name: `${preset.name} (${grams}g)`,
      mealType,
      calories: Math.round((preset.caloriesPer100g * grams) / 100),
      proteinG: Math.round((preset.proteinPer100g * grams) / 100),
      carbsG: Math.round((preset.carbsPer100g * grams) / 100),
      fatG: Math.round((preset.fatPer100g * grams) / 100),
      notes: "",
    });
  }

  return (
    <div
      className="bg-card rounded-2xl border border-border overflow-hidden"
      data-ocid="nutrition.food_search_panel"
    >
      <button
        type="button"
        onClick={() => {
          setIsOpen((v) => !v);
          if (!isOpen) setTimeout(() => searchRef.current?.focus(), 150);
        }}
        data-ocid="nutrition.food_search_toggle"
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-smooth"
      >
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-primary" />
          <span className="text-sm font-display font-semibold text-foreground">
            Search All Foods
          </span>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            48 presets
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {isOpen && (
        <div className="border-t border-border">
          <div className="px-4 pt-3 pb-2">
            <div className="flex gap-1 overflow-x-auto">
              {(["breakfast", "lunch", "dinner", "snack"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setMealType(t)}
                  data-ocid={`nutrition.preset_meal_type.${t}`}
                  className={`shrink-0 px-3 py-1 text-xs rounded-full font-medium transition-smooth ${
                    mealType === t
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {MEAL_META[t].label}
                </button>
              ))}
            </div>
          </div>
          <div className="px-4 pb-2">
            <div className="flex items-center gap-2 bg-background border border-border rounded-xl px-3 py-2">
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search food or category…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-ocid="nutrition.preset_search_input"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="text-muted-foreground hover:text-foreground transition-smooth"
                  data-ocid="nutrition.preset_search_clear"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <div
            className="px-4 pb-3 max-h-80 overflow-y-auto scrollbar-hide"
            data-ocid="nutrition.preset_list"
          >
            {presets.length === 0 ? (
              <p
                className="text-sm text-muted-foreground text-center py-6"
                data-ocid="nutrition.preset_empty_state"
              >
                No food found for "{search}"
              </p>
            ) : (
              presets.map((preset, i) => (
                <PresetRow
                  key={preset.id}
                  preset={preset}
                  index={i}
                  selectedPortion={getPortionFor(preset.id)}
                  onPortionChange={(v) =>
                    setPortions((prev) => ({ ...prev, [preset.id]: v }))
                  }
                  onAdd={() => handleAdd(preset)}
                  isPending={addMeal.isPending}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Add Food Inline Form ──────────────────────────────────────────────────────
function AddFoodForm({
  date,
  defaultType,
  onClose,
}: {
  date: string;
  defaultType: Meal["mealType"];
  onClose: () => void;
}) {
  const addMeal = useAddMeal();
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [type, setType] = useState<Meal["mealType"]>(defaultType);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !calories) return;
    addMeal.mutate(
      {
        date,
        name: name.trim(),
        mealType: type,
        calories: Number(calories),
        proteinG: Number(protein) || 0,
        carbsG: Number(carbs) || 0,
        fatG: Number(fat) || 0,
        notes: "",
      },
      { onSuccess: onClose },
    );
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 bg-card border-t border-border shadow-elevated px-4 pt-4 pb-safe-bottom"
      data-ocid="nutrition.add_food_form"
    >
      <form onSubmit={handleSubmit}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-display font-semibold">
            Add Food Manually
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            data-ocid="nutrition.add_food_close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-1 mb-3 overflow-x-auto">
          {(["breakfast", "lunch", "dinner", "snack"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              data-ocid={`nutrition.form_type.${t}`}
              className={`shrink-0 px-3 py-1 text-xs rounded-full font-medium transition-smooth ${
                type === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {MEAL_META[t].label}
            </button>
          ))}
        </div>
        <div className="space-y-2 mb-3">
          <Input
            ref={inputRef}
            placeholder="Food name (e.g. Chicken & Rice)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            data-ocid="nutrition.add_food_name_input"
          />
          <div className="grid grid-cols-4 gap-2">
            {[
              {
                key: "calories",
                val: calories,
                set: setCalories,
                label: "kcal",
              },
              { key: "protein", val: protein, set: setProtein, label: "P (g)" },
              { key: "carbs", val: carbs, set: setCarbs, label: "C (g)" },
              { key: "fat", val: fat, set: setFat, label: "F (g)" },
            ].map(({ key, val, set, label }) => (
              <Input
                key={key}
                type="number"
                min="0"
                placeholder={label}
                value={val}
                onChange={(e) => set(e.target.value)}
                data-ocid={`nutrition.add_food_${key}_input`}
                className="text-center text-sm"
              />
            ))}
          </div>
        </div>
        <Button
          type="submit"
          className="w-full"
          disabled={addMeal.isPending || !name.trim() || !calories}
          data-ocid="nutrition.add_food_submit_button"
        >
          {addMeal.isPending ? "Adding…" : "Add Food"}
        </Button>
      </form>
      <div className="pb-4" />
    </div>
  );
}

// ── Bottom Search Bar with Camera + Barcode ───────────────────────────────────
function FoodSearchBar({
  onFocus,
  date,
  defaultMealType,
}: {
  onFocus: () => void;
  date: string;
  defaultMealType: Meal["mealType"];
}) {
  const [scanState, setScanState] = useState<ScanState>({ status: "idle" });
  const cameraInputRef = useRef<HTMLInputElement>(null);

  async function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setScanState({ status: "scanning" });
    const result = await fetchByPhoto(file);
    if (result) {
      setScanState({
        status: "found",
        food: result,
        mealType: defaultMealType,
      });
    } else {
      setScanState({
        status: "error",
        message:
          "No barcode detected in photo. Try using the barcode button to enter the number directly, or add the food manually.",
      });
    }
  }

  async function handleBarcodeScanned(barcode: string) {
    setScanState({ status: "scanning" });
    const result = await fetchByBarcode(barcode);
    if (result) {
      setScanState({
        status: "found",
        food: result,
        mealType: defaultMealType,
      });
    } else {
      setScanState({
        status: "error",
        message: `No product found for barcode "${barcode}". The product may not be in the Open Food Facts database yet.`,
      });
    }
  }

  function dismissScan() {
    setScanState({ status: "idle" });
  }

  return (
    <>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-label="Take a food photo"
        onChange={handlePhotoSelected}
      />
      <div
        className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border pt-3 pb-4 px-4"
        data-ocid="nutrition.search_bar"
      >
        <div className="flex items-center gap-2 bg-card border border-border rounded-full px-3 py-2 shadow-subtle">
          <input
            type="text"
            placeholder="Search food or add manually…"
            onFocus={onFocus}
            readOnly
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none cursor-pointer min-w-0"
            data-ocid="nutrition.search_input"
          />
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            aria-label="Scan food with camera"
            title="Take a photo to detect food barcode"
            data-ocid="nutrition.camera_button"
            className="p-1.5 rounded-full text-primary border border-primary/30 hover:bg-primary/10 transition-smooth shrink-0"
          >
            <Camera className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setScanState({ status: "barcode_input" })}
            aria-label="Enter barcode number"
            title="Look up product by barcode"
            data-ocid="nutrition.barcode_button"
            className="p-1.5 rounded-full text-primary border border-primary/30 hover:bg-primary/10 transition-smooth shrink-0"
          >
            <Barcode className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onFocus}
            aria-label="Add food manually"
            data-ocid="nutrition.search_add_button"
            className="p-1.5 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-smooth shrink-0"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {scanState.status === "scanning" && (
          <div
            className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground"
            data-ocid="nutrition.scan_loading_state"
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            Looking up product…
          </div>
        )}
      </div>

      {scanState.status === "barcode_input" && (
        <BarcodeInputModal
          onScan={handleBarcodeScanned}
          onDismiss={dismissScan}
        />
      )}
      {scanState.status === "found" && (
        <ScannedFoodCard
          food={scanState.food}
          mealType={scanState.mealType}
          date={date}
          onConfirm={dismissScan}
          onDismiss={dismissScan}
        />
      )}
      {scanState.status === "error" && (
        <ScanErrorCard
          message={scanState.message}
          onDismiss={dismissScan}
          onManual={() => {
            dismissScan();
            onFocus();
          }}
        />
      )}
    </>
  );
}

// ── NutritionPage ─────────────────────────────────────────────────────────────
export default function NutritionPage() {
  const today = todayISO();
  const [selectedDate, setSelectedDate] = useState(today);
  const [addingFor, setAddingFor] = useState<Meal["mealType"] | null>(null);
  const [showExport, setShowExport] = useState(false);
  const exportCsv = useExportNutritionCSV();

  const { data: meals = [], isLoading } = useMealsForDate(selectedDate);
  const { data: water } = useWaterForDate(selectedDate);
  const deleteMeal = useDeleteMeal();

  const byType = (["breakfast", "lunch", "dinner", "snack"] as const).reduce<
    Record<Meal["mealType"], Meal[]>
  >(
    (acc, t) => {
      acc[t] = meals.filter((m) => m.mealType === t);
      return acc;
    },
    { breakfast: [], lunch: [], dinner: [], snack: [] },
  );

  const totalCal = meals.reduce((s, m) => s + m.calories, 0);
  const totalProt = meals.reduce((s, m) => s + m.proteinG, 0);
  const totalCarb = meals.reduce((s, m) => s + m.carbsG, 0);
  const totalFat = meals.reduce((s, m) => s + m.fatG, 0);
  const waterMl = water?.totalMl ?? 0;

  const macroItems: MacroItem[] = [
    {
      label: "Calories",
      current: totalCal,
      target: GOALS.calories,
      unit: "kcal",
      color: "oklch(var(--primary))",
      bgColor: "oklch(var(--primary) / 0.12)",
    },
    {
      label: "Protein",
      current: totalProt,
      target: GOALS.protein,
      unit: "g",
      color: "oklch(var(--chart-3))",
      bgColor: "oklch(var(--chart-3) / 0.12)",
    },
    {
      label: "Carbs",
      current: totalCarb,
      target: GOALS.carbs,
      unit: "g",
      color: "oklch(var(--chart-4))",
      bgColor: "oklch(var(--chart-4) / 0.12)",
    },
    {
      label: "Fat",
      current: totalFat,
      target: GOALS.fat,
      unit: "g",
      color: "oklch(var(--chart-1))",
      bgColor: "oklch(var(--chart-1) / 0.12)",
    },
  ];

  let rowIndex = 0;

  return (
    <div className="flex flex-col min-h-screen" data-ocid="nutrition.page">
      <div className="max-w-2xl mx-auto w-full px-4 pt-5 pb-32 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-display font-bold text-foreground leading-tight">
              Nutrition
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date(`${selectedDate}T00:00:00`).toLocaleDateString([], {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowExport(true)}
              aria-label="Export CSV"
              className="flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 rounded-full px-3 py-1.5 hover:bg-primary/5 transition-smooth"
              data-ocid="nutrition.export_button"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
            <div className="text-right">
              <span
                className="text-2xl font-display font-bold text-primary"
                data-ocid="nutrition.total_calories"
              >
                {totalCal.toLocaleString()}
              </span>
              <p className="text-xs text-muted-foreground">
                / {GOALS.calories} kcal
              </p>
            </div>
          </div>
        </div>

        {/* Weekly strip */}
        <WeekStrip
          selected={selectedDate}
          today={today}
          onSelect={setSelectedDate}
        />

        {/* Macro progress bars */}
        <MacroBars items={macroItems} />

        {/* Meal Suggestions */}
        <MealSuggestionsPanel
          date={selectedDate}
          remainingCalories={GOALS.calories - totalCal}
          remainingProtein={GOALS.protein - totalProt}
          remainingCarbs={GOALS.carbs - totalCarb}
          remainingFat={GOALS.fat - totalFat}
        />

        {/* Water Intake Today */}
        <WaterIntakeSection date={selectedDate} waterMl={waterMl} />

        {/* Ready-made food grid */}
        <QuickFoodGrid
          date={selectedDate}
          defaultMealType={addingFor ?? "breakfast"}
        />

        {/* Search all foods (full list) */}
        <FoodSearchPanel
          date={selectedDate}
          defaultMealType={addingFor ?? "breakfast"}
        />

        {/* Meal sections */}
        {isLoading ? (
          <div className="space-y-3" data-ocid="nutrition.loading_state">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {(["breakfast", "lunch", "dinner", "snack"] as const).map(
              (type) => {
                const typeMeals = byType[type];
                const sectionBase = rowIndex;
                rowIndex += typeMeals.length;
                return (
                  <MealSection
                    key={type}
                    type={type}
                    meals={typeMeals}
                    baseIndex={sectionBase}
                    onAddClick={() => setAddingFor(type)}
                    onDelete={(id) =>
                      deleteMeal.mutate({ date: selectedDate, id })
                    }
                  />
                );
              },
            )}
          </div>
        )}
      </div>

      {/* Bottom search bar */}
      <FoodSearchBar
        onFocus={() => setAddingFor("breakfast")}
        date={selectedDate}
        defaultMealType={addingFor ?? "breakfast"}
      />

      {/* Add food overlay form */}
      {addingFor && (
        <AddFoodForm
          date={selectedDate}
          defaultType={addingFor}
          onClose={() => setAddingFor(null)}
        />
      )}

      {/* Export CSV panel */}
      {showExport && (
        <ExportDialog
          filePrefix="nlocki-nutrition"
          onExport={(start, end) =>
            exportCsv.mutateAsync({ startDate: start, endDate: end })
          }
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}
