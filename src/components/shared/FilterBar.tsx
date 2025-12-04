import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface FilterOption {
  label: string;
  value: string;
}

interface FilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  
  // Filtros de Botão
  filterValue: string;
  onFilterChange: (value: any) => void;
  options: FilterOption[];
}

export function FilterBar({ 
  searchValue, onSearchChange, searchPlaceholder = "Pesquisar...",
  filterValue, onFilterChange, options 
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800 mb-6">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-slate-500"/>
        <Input 
          placeholder={searchPlaceholder} 
          value={searchValue} 
          onChange={(e) => onSearchChange(e.target.value)} 
          className="bg-transparent border-none h-8 focus-visible:ring-0 text-white"
        />
      </div>

      <div className="flex gap-2 border-t border-slate-800 pt-3 overflow-x-auto pb-1">
        <span className="text-xs text-slate-500 uppercase font-bold self-center mr-2 whitespace-nowrap">Exibir:</span>
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onFilterChange(opt.value)}
            className={`px-4 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              filterValue === opt.value 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50" 
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}