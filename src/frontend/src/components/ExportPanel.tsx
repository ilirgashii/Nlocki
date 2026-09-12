import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Download, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  useExportFitnessCSV,
  useExportNutritionCSV,
} from "../hooks/use-backend";

// ── helpers ────────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().split("T")[0];
}
function mondayOfWeek(): string {
  const d = new Date();
  const dow = d.getDay();
  d.setDate(d.getDate() - ((dow + 6) % 7));
  return d.toISOString().split("T")[0];
}
function firstOfMonth(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split("T")[0];
}
function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
function filenameFrom(prefix: string, start: string, end: string) {
  return `${prefix}-${start}--${end}.csv`;
}

// ── ExportPanel ────────────────────────────────────────────────────────────────

/**
 * Inline export section embedded at the bottom of ChartsPage.
 * Date range pickers (start/end) with quick preset buttons,
 * and two export buttons: Nutrition CSV + Fitness CSV.
 */
export function ExportPanel() {
  const today = todayISO();
  const [start, setStart] = useState(mondayOfWeek());
  const [end, setEnd] = useState(today);

  const exportNutrition = useExportNutritionCSV();
  const exportFitness = useExportFitnessCSV();

  function validateRange(): boolean {
    if (start > end) {
      toast.error("Start date must be before end date.");
      return false;
    }
    return true;
  }

  async function handleNutritionExport() {
    if (!validateRange()) return;
    try {
      const csv = await exportNutrition.mutateAsync({
        startDate: start,
        endDate: end,
      });
      downloadCsv(csv, filenameFrom("nlocki-nutrition", start, end));
      toast.success("Nutrition CSV downloaded!");
    } catch {
      toast.error("Nutrition export failed. Please try again.");
    }
  }

  async function handleFitnessExport() {
    if (!validateRange()) return;
    try {
      const csv = await exportFitness.mutateAsync({
        startDate: start,
        endDate: end,
      });
      downloadCsv(csv, filenameFrom("nlocki-fitness", start, end));
      toast.success("Fitness CSV downloaded!");
    } catch {
      toast.error("Fitness export failed. Please try again.");
    }
  }

  return (
    <section
      className="rounded-2xl border border-border bg-card overflow-hidden shadow-subtle"
      data-ocid="export.section"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
        <FileText className="w-5 h-5 text-primary" />
        <div>
          <h2 className="font-display font-bold text-base text-foreground">
            Export Data
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Download your nutrition or fitness logs as CSV
          </p>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Quick preset buttons */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
            Quick range
          </p>
          <div className="flex flex-wrap gap-2" data-ocid="export.presets">
            <button
              type="button"
              onClick={() => {
                setStart(mondayOfWeek());
                setEnd(today);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-smooth"
              data-ocid="export.this_week_button"
            >
              <Calendar className="w-3.5 h-3.5" />
              This Week
            </button>
            <button
              type="button"
              onClick={() => {
                setStart(firstOfMonth());
                setEnd(today);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-smooth"
              data-ocid="export.this_month_button"
            >
              <Calendar className="w-3.5 h-3.5" />
              This Month
            </button>
            <button
              type="button"
              onClick={() => {
                const d = new Date();
                d.setMonth(d.getMonth() - 3);
                setStart(d.toISOString().split("T")[0]);
                setEnd(today);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-smooth"
              data-ocid="export.last_3_months_button"
            >
              <Calendar className="w-3.5 h-3.5" />
              Last 3 Months
            </button>
          </div>
        </div>

        {/* Custom date range */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
            Custom range
          </p>
          <div className="grid grid-cols-2 gap-3 max-w-xs">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                From
              </Label>
              <Input
                type="date"
                value={start}
                max={end}
                onChange={(e) => setStart(e.target.value)}
                className="text-sm bg-background border-input"
                data-ocid="export.start_input"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                To
              </Label>
              <Input
                type="date"
                value={end}
                min={start}
                max={today}
                onChange={(e) => setEnd(e.target.value)}
                className="text-sm bg-background border-input"
                data-ocid="export.end_input"
              />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 font-mono">
            Range: {start} → {end}
          </p>
        </div>

        {/* Export buttons */}
        <div className="flex flex-wrap gap-3 pt-1">
          <Button
            onClick={handleNutritionExport}
            disabled={exportNutrition.isPending}
            className="flex items-center gap-2 font-semibold"
            data-ocid="export.nutrition_button"
          >
            <Download className="w-4 h-4" />
            {exportNutrition.isPending ? "Exporting…" : "Export Nutrition CSV"}
          </Button>
          <Button
            variant="secondary"
            onClick={handleFitnessExport}
            disabled={exportFitness.isPending}
            className="flex items-center gap-2 font-semibold"
            data-ocid="export.fitness_button"
          >
            <Download className="w-4 h-4" />
            {exportFitness.isPending ? "Exporting…" : "Export Fitness CSV"}
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Files are generated client-side from your saved data and downloaded
          directly to your device. No data is sent to any server.
        </p>
      </div>
    </section>
  );
}
