import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageLoaderProps {
  className?: string;
  text?: string;
}

export function PageLoader({ className, text = "جاري تحميل البيانات..." }: PageLoaderProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center min-h-[400px] w-full space-y-4 animate-in fade-in duration-500",
      className
    )}>
      <div className="relative flex items-center justify-center">
        {/* Outer Glow Ring */}
        <div className="absolute size-16 rounded-full bg-blue-500/20 blur-xl animate-pulse"></div>
        
        {/* Spinning Rings */}
        <div className="size-12 rounded-full border-2 border-blue-500/10 border-t-blue-500 animate-spin"></div>
        <div className="absolute size-8 rounded-full border-2 border-purple-500/10 border-b-purple-500 animate-spin-slow"></div>
        
        {/* Center Icon */}
        <div className="absolute">
          <Loader2 className="size-5 text-blue-400 animate-spin duration-[2000ms]" />
        </div>
      </div>
      
      {/* Loading Text with Shimmer Effect */}
      <div className="flex flex-col items-center space-y-1">
        <p className="text-sm font-bold text-slate-300 tracking-wide animate-pulse">
          {text}
        </p>
        <div className="w-24 h-0.5 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-transparent via-blue-500 to-transparent w-full animate-shimmer-loading"></div>
        </div>
      </div>
    </div>
  );
}

// Add these to your tailwind config or global CSS if not present
// @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
// @keyframes shimmer-loading { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
