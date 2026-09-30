import React from 'react';
import { Activity, Clock, Database, Target, ArrowUpRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function ComplexityCard({ complexity }) {
  if (!complexity) return null;

  const isHighTime = complexity.time?.includes('n²') || complexity.time?.includes('2^') || complexity.time?.includes('n!');

  return (
    <Card className="bg-card/70 border-border/50 backdrop-blur-sm shadow-xs">
      <CardHeader className="py-3 px-4 pb-2 border-b border-border/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Big-O & Algorithmic Complexity
            </CardTitle>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono py-0 px-2 bg-primary/5 text-primary border-primary/20">
            DSA Profiler
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* Time Complexity */}
          <div className="rounded-lg border border-border/40 bg-background/50 p-2.5 space-y-1">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="size-3" />
              <span>Time</span>
            </div>
            <div className={`text-base font-bold font-mono ${isHighTime ? 'text-rose-400' : 'text-primary'}`}>
              {complexity.time || 'O(n)'}
            </div>
          </div>

          {/* Space Complexity */}
          <div className="rounded-lg border border-border/40 bg-background/50 p-2.5 space-y-1">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Database className="size-3" />
              <span>Space</span>
            </div>
            <div className="text-base font-bold font-mono text-foreground">
              {complexity.space || 'O(1)'}
            </div>
          </div>

          {/* Target Optimal Complexity */}
          <div className="rounded-lg border border-border/40 bg-background/50 p-2.5 space-y-1">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Target className="size-3" />
              <span>Target</span>
            </div>
            <div className="text-base font-bold font-mono text-emerald-400">
              {complexity.targetComplexity || 'O(n)'}
            </div>
          </div>
        </div>

        {/* Bottleneck & DSA Strategy */}
        {complexity.bottleneck && (
          <div className="text-xs text-foreground/90 bg-muted/20 border border-border/30 rounded-md p-2.5">
            <span className="font-semibold text-rose-400 mr-1.5">Bottleneck:</span>
            <span className="text-muted-foreground">{complexity.bottleneck}</span>
          </div>
        )}

        {complexity.explanation && (
          <div className="text-xs text-muted-foreground bg-primary/5 border border-primary/15 rounded-md p-2.5">
            <span className="font-semibold text-primary mr-1.5">Optimization:</span>
            <span>{complexity.explanation}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
