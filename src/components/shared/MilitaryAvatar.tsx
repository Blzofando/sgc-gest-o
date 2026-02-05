"use client";

// Lista de postos/graduações
const POSTOS_GRADUACOES = [
    { valor: "Cap", label: "Capitão" },
    { valor: "1º Ten", label: "1º Tenente" },
    { valor: "2º Ten", label: "2º Tenente" },
    { valor: "Asp", label: "Aspirante" },
    { valor: "S Ten", label: "Subtenente" },
    { valor: "1º Sgt", label: "1º Sargento" },
    { valor: "2º Sgt", label: "2º Sargento" },
    { valor: "3º Sgt", label: "3º Sargento" },
    { valor: "Cb", label: "Cabo" },
    { valor: "Sd EP", label: "Soldado EP" },
    { valor: "Sd EV", label: "Soldado EV" },
];

interface MilitaryAvatarProps {
    posto: string;
    size?: number;
}

export function MilitaryAvatar({ posto, size = 40 }: MilitaryAvatarProps) {
    // Cores e insígnias por posto
    const getConfig = (p: string) => {
        // Oficiais - estrelas douradas
        if (p === "Cap") {
            return { bg: "#1e40af", accent: "#fbbf24", insignia: "stars", count: 3 };
        } else if (p === "1º Ten") {
            return { bg: "#1e40af", accent: "#fbbf24", insignia: "stars", count: 2 };
        } else if (p === "2º Ten" || p === "Asp") {
            return { bg: "#1e40af", accent: "#fbbf24", insignia: "stars", count: 1 };
        }
        // Subtenente - losango
        else if (p === "S Ten") {
            return { bg: "#7c3aed", accent: "#c4b5fd", insignia: "diamond", count: 1 };
        }
        // Sargentos - 3 gaivotas
        else if (p.includes("Sgt")) {
            return { bg: "#059669", accent: "#34d399", insignia: "chevrons", count: 3 };
        }
        // Cabo - 2 gaivotas
        else if (p === "Cb") {
            return { bg: "#d97706", accent: "#fcd34d", insignia: "chevrons", count: 2 };
        }
        // Soldado EP - 1 gaivota
        else if (p === "Sd EP") {
            return { bg: "#6b7280", accent: "#9ca3af", insignia: "chevrons", count: 1 };
        }
        // Soldado EV - sem insígnia
        else {
            return { bg: "#6b7280", accent: "#9ca3af", insignia: "none", count: 0 };
        }
    };

    const config = getConfig(posto);

    // Renderizar insígnia baseado no tipo
    const renderInsignia = () => {
        if (config.insignia === "stars") {
            const starPositions = config.count === 3
                ? [{ x: 42, y: 78 }, { x: 50, y: 78 }, { x: 58, y: 78 }]
                : config.count === 2
                    ? [{ x: 45, y: 78 }, { x: 55, y: 78 }]
                    : [{ x: 50, y: 78 }];

            return starPositions.map((pos, i) => (
                <text key={i} x={pos.x} y={pos.y} textAnchor="middle" fill={config.accent} fontSize="10">★</text>
            ));
        } else if (config.insignia === "diamond") {
            return (
                <polygon
                    points="50,70 56,78 50,86 44,78"
                    fill={config.accent}
                    stroke="#fff"
                    strokeWidth="0.5"
                />
            );
        } else if (config.insignia === "chevrons") {
            // Gaivotas (V com ponta para cima)
            const chevrons = [];
            for (let i = 0; i < config.count; i++) {
                const y = 84 - (i * 5);
                chevrons.push(
                    <path
                        key={i}
                        d={`M 42 ${y} L 50 ${y - 4} L 58 ${y}`}
                        stroke={config.accent}
                        strokeWidth="2.5"
                        fill="none"
                        strokeLinecap="round"
                    />
                );
            }
            return chevrons;
        }
        return null;
    };

    return (
        <svg width={size} height={size} viewBox="0 0 100 100" className="rounded-full">
            {/* Fundo do avatar */}
            <circle cx="50" cy="50" r="48" fill={config.bg} />

            {/* Brilho */}
            <circle cx="50" cy="50" r="48" fill="url(#shine)" opacity="0.3" />

            {/* Cabeça */}
            <circle cx="50" cy="35" r="18" fill="#fcd9c5" />

            {/* Boina/Quepe */}
            <ellipse cx="50" cy="22" rx="20" ry="8" fill="#1a1a1a" />
            <ellipse cx="50" cy="24" rx="16" ry="6" fill="#2a2a2a" />

            {/* Olhos */}
            <circle cx="43" cy="35" r="3" fill="#1a1a1a" />
            <circle cx="57" cy="35" r="3" fill="#1a1a1a" />
            <circle cx="44" cy="34" r="1" fill="white" />
            <circle cx="58" cy="34" r="1" fill="white" />

            {/* Boca (sorriso) */}
            <path d="M 43 42 Q 50 48 57 42" stroke="#c97c5d" strokeWidth="2" fill="none" />

            {/* Corpo/Farda */}
            <path d="M 25 95 Q 25 60 50 55 Q 75 60 75 95" fill="#2d4a2d" />

            {/* Gola da farda */}
            <path d="M 35 60 L 50 70 L 65 60" stroke="#1a3a1a" strokeWidth="3" fill="none" />

            {/* Insígnia */}
            {renderInsignia()}

            {/* Gradiente de brilho */}
            <defs>
                <radialGradient id="shine" cx="30%" cy="30%">
                    <stop offset="0%" stopColor="white" />
                    <stop offset="100%" stopColor="transparent" />
                </radialGradient>
            </defs>
        </svg>
    );
}
