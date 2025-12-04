"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { auth } from "@/app/lib/firebase";
import { signOut } from "firebase/auth";
import { ShieldAlert, LogOut } from "lucide-react";

export default function PendingPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="max-w-md w-full bg-slate-900 border border-yellow-600/30 rounded-xl p-8 text-center shadow-2xl relative overflow-hidden">
        {/* Efeito de luz de fundo */}
        <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500" />
        
        <div className="flex justify-center mb-6">
          <div className="h-20 w-20 bg-yellow-500/10 rounded-full flex items-center justify-center">
            <ShieldAlert className="h-10 w-10 text-yellow-500" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Acesso Pendente</h1>
        <p className="text-slate-400 mb-8">
          Sua conta foi criada, mas precisa ser aprovada manualmente pelo administrador do setor antes de acessar o sistema.
        </p>

        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 mb-6 text-sm text-slate-500">
          <p>Status atual: <span className="text-yellow-500 font-bold uppercase">Em Análise</span></p>
        </div>

        <Button 
          onClick={handleLogout} 
          variant="outline" 
          className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <LogOut className="mr-2 h-4 w-4" /> Sair e tentar mais tarde
        </Button>
      </div>
    </div>
  );
}