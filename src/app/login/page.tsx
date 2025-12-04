"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/app/lib/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await signInWithEmailAndPassword(auth, email, password);
            // O AuthProvider vai redirecionar automaticamente
        } catch (err: any) {
            console.error("Erro no login:", err);
            if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
                setError("Email ou senha incorretos");
            } else if (err.code === "auth/user-not-found") {
                setError("Usuário não encontrado");
            } else if (err.code === "auth/invalid-email") {
                setError("Email inválido");
            } else {
                setError("Erro ao fazer login. Tente novamente.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo/Header */}
                <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4">
                        <ShieldCheck className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">SGC Gestão</h1>
                    <p className="text-slate-400">Sistema de Gestão de Compras e Contratos</p>
                </div>

                {/* Login Card */}
                <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-2xl font-bold text-white mb-6">Entrar</h2>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <Label htmlFor="email" className="text-slate-300">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu@email.com"
                                className="mt-1.5 bg-slate-950/50 border-slate-800 text-white placeholder:text-slate-500"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <Label htmlFor="password" className="text-slate-300">Senha</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="mt-1.5 bg-slate-950/50 border-slate-800 text-white placeholder:text-slate-500"
                                required
                                disabled={loading}
                            />
                        </div>

                        {error && (
                            <div className="bg-red-900/20 border border-red-900 text-red-400 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold h-11"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Entrando...
                                </>
                            ) : (
                                "Entrar"
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-slate-400 text-sm">
                            Não tem uma conta?{" "}
                            <Link href="/register" className="text-blue-400 hover:text-blue-300 font-medium">
                                Registre-se
                            </Link>
                        </p>
                    </div>
                </div>

                <p className="text-center text-slate-500 text-xs mt-8">
                    © 2024 SGC Gestão. Todos os direitos reservados.
                </p>
            </div>
        </div>
    );
}
