import { Loader2 } from "lucide-react";

interface LoaderProps {
  text?: string;
  className?: string;
  fullScreen?: boolean;
}

export function Loader({ 
  text = "جاري التحميل...", 
  className = "", 
  fullScreen = false 
}: LoaderProps) {
  const content = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className="relative">
        <Loader2 className="size-10 animate-spin text-blue-600" />
        <div className="absolute inset-0 size-10 blur-xl bg-blue-600/20 animate-pulse rounded-full"></div>
      </div>
      {text && <p className="text-muted-foreground font-medium animate-pulse">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
}
