"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "@/app/lib/firebase";
import { signOut } from "firebase/auth";
import {
  LayoutDashboard,
  FileText,
  Wallet,
  PackageCheck,
  Settings,
  LogOut,
  Search,
  Users,
  CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBellWrapper } from "@/features/notificacoes/components";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  // Função auxiliar para estilizar o link ativo
  const getLinkClass = (path: string) => {
    const isActive = pathname === path;
    return `w-full justify-start gap-3 transition-all ${isActive
      ? "bg-blue-600/10 text-blue-400 border-r-2 border-blue-500 rounded-r-none"
      : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
      }`;
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">

      {/* --- SIDEBAR --- */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 hidden md:flex flex-col">
        <div className="p-6 flex items-center gap-2">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-900/20">S</div>
          <span className="text-xl font-bold tracking-tight text-white">SGC Gestão</span>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <Link href="/">
            <Button variant="ghost" className={getLinkClass("/")}>
              <LayoutDashboard className="h-5 w-5" />
              Dashboard
            </Button>
          </Link>

          <Link href="/processos">
            <Button variant="ghost" className={getLinkClass("/processos")}>
              <FileText className="h-5 w-5" />
              Processos
            </Button>
          </Link>

          {/* REORGANIZADO: Fornecedores agora está aqui */}
          <Link href="/fornecedores">
            <Button variant="ghost" className={getLinkClass("/fornecedores")}>
              <Users className="h-5 w-5" />
              Fornecedores
            </Button>
          </Link>

          <Link href="/ncs">
            <Button variant="ghost" className={getLinkClass("/ncs")}>
              <CreditCard className="h-5 w-5" />
              Notas de Crédito
            </Button>
          </Link>

          <Link href="/empenhos">
            <Button variant="ghost" className={getLinkClass("/empenhos")}>
              <Wallet className="h-5 w-5" />
              Empenhos
            </Button>
          </Link>

          <Link href="/entregas">
            <Button variant="ghost" className={getLinkClass("/entregas")}>
              <PackageCheck className="h-5 w-5" />
              Entregas
            </Button>
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2">
          <Button variant="ghost" className="w-full justify-start gap-3 text-slate-400 hover:bg-slate-800">
            <Settings className="h-5 w-5" />
            Configurações
          </Button>
          <Button onClick={handleLogout} variant="ghost" className="w-full justify-start gap-3 text-red-400 hover:bg-red-950/30 hover:text-red-300">
            <LogOut className="h-5 w-5" />
            Sair
          </Button>
        </div>
      </aside>

      {/* --- CONTEÚDO PRINCIPAL --- */}
      <main className="flex-1 flex flex-col overflow-hidden relative bg-slate-950">
        {/* HEADER */}
        <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-20">
          <div className="flex items-center gap-4 w-1/3">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Pesquisar..."
                className="pl-9 bg-slate-900 border-slate-800 focus-visible:ring-blue-600 rounded-full text-slate-200"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <NotificationBellWrapper />
            <div className="flex items-center gap-3 border-l border-slate-800 pl-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-white">Admin</p>
                <p className="text-xs text-slate-400">Gestor</p>
              </div>
              <Avatar>
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>AD</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Conteúdo da Página */}
        <div className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-slate-800">
          {children}
        </div>
      </main>
    </div>
  );
}