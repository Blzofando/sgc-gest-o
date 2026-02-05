"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/app/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UserPlus } from "lucide-react";
import Link from "next/link";

// Lista de postos/graduações do Exército
const POSTOS_GRADUACOES = [
    { valor: "Cap", label: "Capitão", simples: "Cap" },
    { valor: "1º Ten", label: "1º Tenente", simples: "Ten" },
    { valor: "2º Ten", label: "2º Tenente", simples: "Ten" },
    { valor: "Asp", label: "Aspirante", simples: "Asp" },
    { valor: "S Ten", label: "Subtenente", simples: "S Ten" },
    { valor: "1º Sgt", label: "1º Sargento", simples: "Sgt" },
    { valor: "2º Sgt", label: "2º Sargento", simples: "Sgt" },
    { valor: "3º Sgt", label: "3º Sargento", simples: "Sgt" },
    { valor: "Cb", label: "Cabo", simples: "Cb" },
    { valor: "Sd EP", label: "Soldado EP", simples: "Sd" },
    { valor: "Sd EV", label: "Soldado EV", simples: "Sd" },
];

export default function RegisterPage() {
    const [nomeCompleto, setNomeCompleto] = useState("");
    const [nomeGuerra, setNomeGuerra] = useState("");
    const [postoGrad, setPostoGrad] = useState("");
    const [telefone, setTelefone] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        // Validações
        if (!nomeCompleto.trim()) {
            setError("Por favor, insira seu nome completo");
            return;
        }

        if (!nomeGuerra.trim()) {
            setError("Por favor, insira seu nome de guerra");
            return;
        }

        if (!postoGrad) {
            setError("Por favor, selecione seu posto/graduação");
            return;
        }

        if (password !== confirmPassword) {
            setError("As senhas não coincidem");
            return;
        }

        if (password.length < 6) {
            setError("A senha deve ter pelo menos 6 caracteres");
            return;
        }

        setLoading(true);

        try {
            // Encontrar o posto simplificado para saudação
            const postoInfo = POSTOS_GRADUACOES.find(p => p.valor === postoGrad);
            const postoGradSimples = postoInfo?.simples || postoGrad;

            // Criar usuário no Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await setDoc(doc(db, "users", user.uid), {
                nomeCompleto: nomeCompleto.trim(),
                nomeGuerra: nomeGuerra.trim().toUpperCase(),
                postoGrad: postoGrad,
                postoGradSimples: postoGradSimples,
                telefone: telefone.trim(),
                email: email,
                approved: false,
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
        <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
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
                        {/* Nome Completo */}
                        <div>
                            <Label htmlFor="nomeCompleto" className="text-slate-300">Nome Completo</Label>
                            <Input
                                id="nomeCompleto"
                                type="text"
                                value={nomeCompleto}
                                onChange={(e) => setNomeCompleto(e.target.value)}
                                placeholder="João da Silva Santos"
                                className="mt-1.5 bg-slate-950/50 border-slate-800 text-white placeholder:text-slate-500"
                                required
                                disabled={loading}
                            />
                        </div>

                        {/* Nome de Guerra */}
                        <div>
                            <Label htmlFor="nomeGuerra" className="text-slate-300">Nome de Guerra</Label>
                            <Input
                                id="nomeGuerra"
                                type="text"
                                value={nomeGuerra}
                                onChange={(e) => setNomeGuerra(e.target.value)}
                                placeholder="SILVA"
                                className="mt-1.5 bg-slate-950/50 border-slate-800 text-white placeholder:text-slate-500 uppercase"
                                required
                                disabled={loading}
                            />
                        </div>

                        {/* Posto/Graduação */}
                        <div>
                            <Label htmlFor="postoGrad" className="text-slate-300">Posto/Graduação</Label>
                            <Select value={postoGrad} onValueChange={setPostoGrad} disabled={loading}>
                                <SelectTrigger className="mt-1.5 bg-slate-950/50 border-slate-800 text-white">
                                    <SelectValue placeholder="Selecione seu posto/graduação" />
                                </SelectTrigger>
                                <SelectContent>
                                    {POSTOS_GRADUACOES.map((posto) => (
                                        <SelectItem key={posto.valor} value={posto.valor}>
                                            {posto.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Telefone */}
                        <div>
                            <Label htmlFor="telefone" className="text-slate-300">Telefone</Label>
                            <Input
                                id="telefone"
                                type="tel"
                                value={telefone}
                                onChange={(e) => setTelefone(e.target.value)}
                                placeholder="(11) 99999-9999"
                                className="mt-1.5 bg-slate-950/50 border-slate-800 text-white placeholder:text-slate-500"
                                disabled={loading}
                            />
                        </div>

                        {/* Email */}
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

                        {/* Senha */}
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

                        {/* Confirmar Senha */}
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
