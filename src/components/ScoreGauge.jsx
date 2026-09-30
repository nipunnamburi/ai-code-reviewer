import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Zap, Wrench, BookOpen } from 'lucide-react';

export function ScoreGauge({ score = 0, metrics = {}, summary = '' }) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getScoreColor = (val) => {
    if (val >= 80) return 'text-emerald-400 stroke-emerald-400';
    if (val >= 60) return 'text-amber-400 stroke-amber-400';
    return 'text-rose-400 stroke-rose-400';
  };

  const getScoreBadge = (val) => {
    if (val >= 85) return { label: 'Production Ready', variant: 'secondary', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' };
    if (val >= 70) return { label: 'Acceptable Quality', variant: 'secondary', className: 'bg-blue-500/10 text-blue-400 border-blue-500/25' };
    if (val >= 50) return { label: 'Needs Improvement', variant: 'secondary', className: 'bg-amber-500/10 text-amber-400 border-amber-500/25' };
    return { label: 'Critical Flaws', variant: 'destructive', className: 'bg-rose-500/10 text-rose-400 border-rose-500/25' };
  };

  const badgeInfo = getScoreBadge(score);
  const colorClass = getScoreColor(score);

  const metricList = [
    { label: 'Security', value: metrics.security ?? 80, icon: ShieldCheck, color: 'bg-emerald-400' },
    { label: 'Performance', value: metrics.performance ?? 75, icon: Zap, color: 'bg-blue-400' },
    { label: 'Maintainability', value: metrics.maintainability ?? 80, icon: Wrench, color: 'bg-purple-400' },
    { label: 'Readability', value: metrics.readability ?? 85, icon: BookOpen, color: 'bg-amber-400' },
  ];

  return (
    <Card className="bg-card/70 border-border/50 backdrop-blur-sm shadow-xs">
      <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Circular Health Score Gauge */}
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative size-18 shrink-0 flex items-center justify-center">
            <svg className="size-18 -rotate-90">
              <circle
                cx="36"
                cy="36"
                r={radius}
                className="stroke-muted/40"
                strokeWidth="5.5"
                fill="transparent"
              />
              <circle
                cx="36"
                cy="36"
                r={radius}
                className={`transition-all duration-700 ease-out ${colorClass.split(' ')[1]}`}
                strokeWidth="5.5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className={`absolute text-xl font-bold font-mono ${colorClass.split(' ')[0]}`}>
              {score}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-[10px] uppercase tracking-wider font-semibold py-0.5 px-2 ${badgeInfo.className}`}>
                {badgeInfo.label}
              </Badge>
            </div>
            <div className="text-sm font-semibold text-foreground tracking-tight">
              Code Health Score
            </div>
            <div className="text-xs text-muted-foreground max-w-xs leading-relaxed line-clamp-2">
              {summary || 'Static heuristics and AI architectural evaluation across quality dimensions.'}
            </div>
          </div>
        </div>

        {/* Right: Metrics bars */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 w-full md:w-64 pt-2 md:pt-0 border-t md:border-t-0 md:border-l border-border/30 md:pl-4">
          {metricList.map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Icon className="size-3 text-muted-foreground/70" />
                    {m.label}
                  </span>
                  <span className="font-mono font-medium text-foreground text-[11px]">{m.value}%</span>
                </div>
                <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${m.color}`}
                    style={{ width: `${m.value}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
