import React from 'react';
import { cn } from '../lib/utils';

interface SkeletonProps {
  className?: string;
  delay?: number;
}

export const Skeleton = ({ className, delay = 0 }: SkeletonProps) => (
  <div 
    className={cn('animate-pulse bg-white/5 rounded-2xl overflow-hidden relative', className)}
    style={{ '--delay': `${delay}ms` } as React.CSSProperties}
  >
    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
  </div>
);

export const TrackCardSkeleton = ({ index = 0 }) => (
  <div 
    className="flex flex-col gap-3 p-3 rounded-[24px] border border-white/5 bg-white/3 animate-fade-in"
    style={{ '--delay': `${index * 50}ms` } as React.CSSProperties}
  >
    <Skeleton className="aspect-square w-full rounded-[21px]" />
    <div className="space-y-2 px-1">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  </div>
);

export const TrackRowSkeleton = ({ index = 0 }) => (
  <div 
    className="grid grid-cols-[40px_1fr_80px_40px_40px] gap-4 px-4 py-3 items-center opacity-50 animate-fade-in"
    style={{ '--delay': `${index * 50}ms` } as React.CSSProperties}
  >
    <Skeleton className="h-4 w-4 mx-auto" />
    <div className="flex items-center gap-4">
      <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
    <Skeleton className="h-3 w-12 mx-auto" />
    <Skeleton className="h-4 w-4 ml-auto" />
    <Skeleton className="h-4 w-4 ml-auto" />
  </div>
);

export const HistorySkeleton = ({ index = 0 }) => (
  <div 
    className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/5 overflow-hidden pr-3 animate-fade-in"
    style={{ '--delay': `${index * 50}ms` } as React.CSSProperties}
  >
    <Skeleton className="w-16 h-16 shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-2 w-1/3" />
    </div>
  </div>
);

export const HeroSkeleton = () => (
  <div className="relative h-72 px-10 flex flex-col justify-end pb-6 gap-6 overflow-hidden animate-fade-in">
    <div className="flex items-end gap-6 relative z-20">
      <Skeleton className="w-28 h-28 rounded-full shrink-0" />
      <div className="space-y-3 mb-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  </div>
);
