"use client";

import { useState, useEffect } from "react";
import { db } from "@/app/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { NotificationBell } from "./NotificationBell";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Wrapper que busca todos os dados necessários e passa para NotificationBell
 */
export function NotificationBellWrapper() {
    const [entregas, setEntregas] = useState<any[]>([]);
    const [ncs, setNcs] = useState<any[]>([]);
    const [empenhos, setEmpenhos] = useState<any[]>([]);
    const [processos, setProcessos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [entregasSnap, ncsSnap, empenhosSnap, processosSnap] = await Promise.all([
                    getDocs(collection(db, "entregas")),
                    getDocs(collection(db, "ncs")),
                    getDocs(collection(db, "empenhos")),
                    getDocs(collection(db, "processos"))
                ]);

                setEntregas(entregasSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                setNcs(ncsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                setEmpenhos(empenhosSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                setProcessos(processosSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (error) {
                console.error("Erro ao carregar dados para notificações:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        // Re-fetch a cada 5 minutos
        const interval = setInterval(fetchData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white relative hover:bg-slate-800 rounded-full">
                <Bell className="h-5 w-5" />
            </Button>
        );
    }

    return (
        <NotificationBell
            entregas={entregas}
            ncs={ncs}
            empenhos={empenhos}
            processos={processos}
        />
    );
}
