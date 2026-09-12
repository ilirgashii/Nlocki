import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Download, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// ── helpers ───────────────────────────────────────────────────────────────────
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

// ── ExportDialog ──────────────────────────────────────────────────────────────
interface ExportDialogProps {
  /** Called with (startDate, endDate) → returns the CSV string */
  onExport: (start: string, end: string) => Promise<string>;
  /** Filename prefix, e.g. "nlocki-nutrition" */
  filePrefix: string;
  onClose: () => void;
}

export function ExportDialog({
  onExport,
  filePrefix,
  onClose,
}: ExportDialogProps) {
  const today = todayISO();
  const [start, setStart] = useState(mondayOfWeek());
  const [end, setEnd] = useState(today);
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    if (start > end) {
      toast.error("Start date must be before end date.");
      return;
    }
    setLoading(true);
    try {
      const csv = await onExport(start, end);
      downloadCsv(csv, filenameFrom(filePrefix, start, end));
      toast.success("CSV downloaded!");
      onClose();
    } catch {
      toast.error("Export failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      data-ocid="export.dialog"
    >
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-background/80 backdrop-blur-sm cursor-default"
        onClick={onClose}
        aria-label="Close export dialog"
        tabIndex={-1}
      />

      {/* Panel */}
      <div className="relative z-10 w-full sm:max-w-sm bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-elevated px-5 pt-5 pb-6 mx-0 sm:mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-primary" />
            <span className="font-display font-semibold text-sm text-foreground">
              Export CSV
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 text-muted-foreground hover:text-foreground transition-smooth rounded-lg hover:bg-muted"
            data-ocid="export.close_button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick presets */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => {
              setStart(mondayOfWeek());
              setEnd(today);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-smooth"
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
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-smooth"
            data-ocid="export.this_month_button"
          >
            <Calendar className="w-3.5 h-3.5" />
            This Month
          </button>
        </div>

        {/* Custom range */}
        <div className="grid grid-cols-2 gap-3 mb-5">
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

        <Button
          className="w-full font-semibold"
          onClick={handleExport}
          disabled={loading}
          data-ocid="export.confirm_button"
        >
          <Download className="w-4 h-4 mr-2" />
          {loading ? "Exporting…" : "Download CSV"}
        </Button>

        <p className="text-[10px] text-muted-foreground text-center mt-3">
          File:{" "}
          <span className="font-mono">
            {filenameFrom(filePrefix, start, end)}
          </span>
        </p>
      </div>
    </div>
  );
}
