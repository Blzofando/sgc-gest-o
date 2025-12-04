"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/app/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, UserPlus } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        // Validações
        if (password !== confirmPassword) {
            setError("As senhas não coincidem");
            return;
        }

        if (password.length < 6) {
            setError("A senha deve ter pelo menos 6 caracteres");
            return;
        }

        if (!name.trim()) {
            setError("Por favor, insira seu nome");
            return;
        }

        setLoading(true);

        try {
            // Criar usuário no Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Criar documento do usuário no Firestore (AGUARDANDO APROVAÇÃO)
            await setDoc(doc(db, "users", user.uid), {
                name: name.trim(),
                email: email,
                approved: false, // IMPORTANTE: novo usuário NÃO está aprovado
                createdAt: new Date(),
                role: "user"
            });

            // O AuthProvider vai redirecionar para /pending automaticamente
        } catch (err: any) {
            console.error("Erro no registro:", err);
            if (err.code === "auth/email-already-in-use") {
                setError("Este email já está em uso");
            } else if (err.code === "auth/invalid-email") {
                setError("Email inválido");
            } else if (err.code === "auth/weak-password") {
                setError("Senha muito fraca");
            } else {
                setError("Erro ao criar conta. Tente novamente.");
            }
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo/Header */}
                <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4">
                        <UserPlus className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Criar Conta</h1>
                    <p className="text-slate-400">Registre-se no SGC Gestão</p>
                </div>

                {/* Register Card */}
                <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div>
                            <Label htmlFor="name" className="text-slate-300">Nome Completo</Label>
                            <Input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="João Silva"
                                className="mt-1.5 bg-slate-950/50 border-slate-800 text-white placeholder:text-slate-500"
                                required
                                disabled={loading}
                            />
                        </div>

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
                                minLength={6}
                            />
                        </div>

                        <div>
                            <Label htmlFor="confirmPassword" className="text-slate-300">Confirmar Senha</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                className="mt-1.5 bg-slate-950/50 border-slate-800 text-white placeholder:text-slate-500"
                                required
                                disabled={loading}
                                minLength={6}
                            />
                        </div>

                        {error && (
                            <div className="bg-red-900/20 border border-red-900 text-red-400 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <div className="bg-amber-900/20 border border-amber-900/50 text-amber-400 px-4 py-3 rounded-lg text-xs">
                            <strong>Importante:</strong> Sua conta precisará ser aprovada por um administrador antes de acessar o sistema.
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold h-11"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Criando conta...
                                </>
                            ) : (
                                "Criar Conta"
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-slate-400 text-sm">
                            Já tem uma conta?{" "}
                            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">
                                Entrar
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
