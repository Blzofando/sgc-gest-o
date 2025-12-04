import { Button } from "@/components/ui/button";
import { FileDown, Plus } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description: string;
  onExport?: () => void;
  children?: React.ReactNode; // Aqui entra o botão "Novo" com o Modal
}

export function PageHeader({ title, description, onExport, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
      <div>
        <h1 className="text-3xl font-bold text-white">{title}</h1>
        <p className="text-slate-400">{description}</p>
      </div>
      
      <div className="flex gap-2 w-full md:w-auto">
        {onExport && (
          <Button variant="outline" onClick={onExport} className="border-slate-700 text-slate-300 hover:bg-emerald-900/20 hover:text-emerald-400 hover:border-emerald-800 w-full md:w-auto">
            <FileDown className="mr-2 h-4 w-4"/> Exportar Excel
          </Button>
        )}
        
        {children}
      </div>
    </div>
  );
}