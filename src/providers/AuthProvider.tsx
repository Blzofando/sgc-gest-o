"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/app/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

// Interface para dados do usuário salvos no Firestore
export interface UserData {
  nomeCompleto: string;
  nomeGuerra: string;
  postoGrad: string;       // "3º Sgt"
  postoGradSimples: string; // "Sgt" (para saudação)
  email: string;
  approved: boolean;
  role: string;
}

// Context para autenticação
interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  isApproved: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Hook para usar o contexto de autenticação
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isApproved, setIsApproved] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Usuário logado, buscar dados do Firestore
        try {
          const userRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const data = userSnap.data();

            // Verificar aprovação
            if (data.approved === true) {
              setIsApproved(true);
            } else {
              setIsApproved(false);
            }

            // Montar objeto UserData (compatível com dados antigos que só tinham "name")
            setUserData({
              nomeCompleto: data.nomeCompleto || data.name || "",
              nomeGuerra: data.nomeGuerra || "",
              postoGrad: data.postoGrad || "",
              postoGradSimples: data.postoGradSimples || "",
              email: data.email || currentUser.email || "",
              approved: data.approved || false,
              role: data.role || "user"
            });
          } else {
            setIsApproved(false);
            setUserData(null);
          }
          setUser(currentUser);
        } catch (error) {
          console.error("Erro ao verificar aprovação:", error);
          setIsApproved(false);
          setUser(currentUser);
          setUserData(null);
        }
      } else {
        // Ninguém logado
        setUser(null);
        setUserData(null);
        setIsApproved(false);
      }
      setLoading(false);
    });

    // Safety timeout: If Firebase takes too long, stop loading
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  // Lógica do "Porteiro" (Redirecionamentos)
  useEffect(() => {
    if (loading) return;

    const publicPages = ["/login", "/register"];
    const isPublicPage = publicPages.includes(pathname);
    const isPendingPage = pathname === "/pending";

    if (!user && !isPublicPage) {
      // 1. Não logado tentando acessar painel -> Login
      router.push("/login");
    }
    else if (user && !isApproved && !isPendingPage) {
      // 2. Logado mas NÃO aprovado -> Tela de Pendente
      router.push("/pending");
    }
    else if (user && isApproved && (isPublicPage || isPendingPage)) {
      // 3. Logado E Aprovado tentando ir pra Login ou Pendente -> Dashboard
      router.push("/");
    }

  }, [user, isApproved, loading, pathname, router]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <p className="text-slate-500 text-sm font-medium animate-pulse">Verificando credenciais...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, userData, isApproved, loading }}>
      {children}
    </AuthContext.Provider>
  );
}