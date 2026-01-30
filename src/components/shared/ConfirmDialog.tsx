"use client";

import * as React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, AlertCircle } from "lucide-react";
import { cn } from "@/app/lib/utils";

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "warning" | "default";
    loading?: boolean;
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    onConfirm,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    variant = "default",
    loading = false,
}: ConfirmDialogProps) {
    const handleConfirm = () => {
        onConfirm();
        onOpenChange(false);
    };

    const iconMap = {
        danger: <Trash2 className="h-6 w-6 text-red-500" />,
        warning: <AlertTriangle className="h-6 w-6 text-yellow-500" />,
        default: <AlertCircle className="h-6 w-6 text-blue-500" />,
    };

    const buttonVariantMap = {
        danger: "bg-red-600 hover:bg-red-500 text-white",
        warning: "bg-yellow-600 hover:bg-yellow-500 text-white",
        default: "bg-blue-600 hover:bg-blue-500 text-white",
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-slate-950 border-slate-800 text-slate-100">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "p-2 rounded-full",
                            variant === "danger" && "bg-red-900/30",
                            variant === "warning" && "bg-yellow-900/30",
                            variant === "default" && "bg-blue-900/30"
                        )}>
                            {iconMap[variant]}
                        </div>
                        <div>
                            <DialogTitle className="text-lg">{title}</DialogTitle>
                            <DialogDescription className="text-slate-400 mt-1">
                                {description}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>
                <DialogFooter className="mt-4 gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="border-slate-700 text-slate-300 hover:bg-slate-800"
                        disabled={loading}
                    >
                        {cancelText}
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        className={buttonVariantMap[variant]}
                        disabled={loading}
                    >
                        {loading ? "Aguarde..." : confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
