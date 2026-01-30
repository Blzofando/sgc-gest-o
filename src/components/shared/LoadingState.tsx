"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/app/lib/utils";

interface LoadingStateProps {
    text?: string;
    className?: string;
}

export function LoadingState({ text = "Carregando...", className }: LoadingStateProps) {
    return (
        <div className={cn("p-12 flex flex-col items-center justify-center gap-3", className)}>
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            {text && <p className="text-sm text-slate-400">{text}</p>}
        </div>
    );
}
