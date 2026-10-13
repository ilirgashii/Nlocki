import { useDailySummary } from "../hooks/use-backend";
export function EnergyBalance({ date }: { date: string }) {
  const { data, isPending, isError } = useDailySummary(date);
  const eaten = data?.totalCaloriesConsumed ?? 0;
  const burned = data?.totalCaloriesBurned ?? 0;
  return (
    <section
      className="rounded-2xl border bg-card p-5 space-y-3"
      aria-label="Daily calorie balance"
      data-ocid="calories.balance"
    >
      <h2 className="font-semibold">Daily calorie balance</h2>
      {isPending ? (
        <p className="text-sm text-muted-foreground">Loading calorie totals…</p>
      ) : isError ? (
        <p role="alert">Could not load calorie totals.</p>
      ) : (
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            {!!data?.unestimatedWorkouts && (
              <p className="text-xs text-muted-foreground">
                {data.unestimatedWorkouts} earlier workout(s) have no calorie
                estimate. Edit them to add duration, body weight and effort.
              </p>
            )}
            <p className="text-xs text-muted-foreground">Food eaten</p>
            <p className="text-lg font-bold" data-ocid="calories.eaten">
              {eaten} kcal
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Exercise estimate</p>
            <p className="text-lg font-bold" data-ocid="calories.burned">
              {burned} kcal
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Food − exercise</p>
            <p
              className="text-lg font-bold text-primary"
              data-ocid="calories.net"
            >
              {eaten - burned} kcal
            </p>
          </div>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Exercise calories are estimates. Food minus exercise is not your full
        daily energy balance: it does not account for the rest of your day or
        your daily energy needs.
      </p>
    </section>
  );
}
