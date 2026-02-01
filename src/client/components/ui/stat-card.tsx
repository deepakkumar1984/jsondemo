import * as React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export interface StatCardProps {
  label: string;
  value?: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: React.ReactNode;
  className?: string;
  loading?: boolean;
}

function StatCard({
  label,
  value,
  change,
  changeType = "neutral",
  icon,
  className,
  loading = false,
}: StatCardProps) {
  const changeColorClass = {
    positive: "text-emerald-600 dark:text-emerald-400",
    negative: "text-red-600 dark:text-red-400",
    neutral: "text-muted-foreground",
  }[changeType];

  const ChangeIcon = {
    positive: TrendingUp,
    negative: TrendingDown,
    neutral: Minus,
  }[changeType];

  return (
    <Card className={cn("", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {icon && (
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
              {icon}
            </span>
          )}
        </div>
        <div className="mt-2">
          {loading ? (
            <div className="h-8 w-20 animate-pulse rounded bg-muted" />
          ) : (
            <p className="text-2xl font-bold tracking-tight">{value ?? '—'}</p>
          )}
        </div>
        {change && !loading && (
          <div className={cn("mt-2 flex items-center gap-1 text-xs", changeColorClass)}>
            <ChangeIcon className="h-3 w-3" />
            <span>{change}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
StatCard.displayName = "StatCard";

export { StatCard };
