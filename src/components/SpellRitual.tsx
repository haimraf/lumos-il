"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Sparkles, X, Wand2, BookOpen } from "lucide-react";

/**
 * LUMOS IL - SPELL RITUAL V1.3 (The Type-Safe Update)
 * תיקון: פתרון שגיאות TypeScript ב-useRef ובהשוואות הסטטוס.
 */

export default function SpellRitual({ spell, onSuccess, onCancel }: any) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState<'intro' | 'drawing' | 'success'>('intro');
    const particles = useRef<any[]>([]);
    // ✨ תיקון 1: הוספת ערך התחלתי ל-useRef כדי למנוע את שגיאת ה-Expected 1 argument
    const requestRef = useRef<number | undefined>(undefined);

    const animateParticles = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.current.forEach((p, index) => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.02;

            if (p.life <= 0) {
                particles.current.splice(index, 1);
            } else {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(245, 158, 11, ${p.life})`;
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#f59e0b';
                ctx.fill();
            }
        });

        requestRef.current = requestAnimationFrame(animateParticles);
    }, []);

    useEffect(() => {
        if (status === 'drawing') {
            requestRef.current = requestAnimationFrame(animateParticles);
        }
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [status, animateParticles]);

    const addParticles = (x: number, y: number) => {
        for (let i = 0; i < 3; i++) {
            particles.current.push({
                x,
                y,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                size: Math.random() * 4 + 2,
                life: 1.0
            });
        }
    };

    const handleInteraction = (clientX: number, clientY: number) => {
        // אם אנחנו לא במצב ציור, אל תעשה כלום
        if (status !== 'drawing') return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        addParticles(x, y);

        setProgress(prev => {
            const next = Math.min(prev + 0.6, 100);
            // ✨ תיקון 2: הסרת הבדיקה המיותרת של status !== 'success' שגרמה לשגיאת ה-Types No Overlap
            // מאחר וכבר וידאנו בתחילת הפונקציה ש-status הוא 'drawing', ה-TypeScript יקבל את זה עכשיו.
            if (next >= 100) {
                handleSuccess();
            }
            return next;
        });
    };

    const handleSuccess = () => {
        setStatus('success');
        window.dispatchEvent(new CustomEvent('play-magic-ding'));
        setTimeout(onSuccess, 2000);
    };

    return (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-500 overflow-hidden" dir="rtl">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')]"></div>
            </div>

            <div className="relative w-full max-w-4xl h-[80vh] flex flex-col items-center justify-center p-6 md:p-12 text-center border border-amber-500/20 rounded-[3rem] md:rounded-[4rem] bg-black/40 shadow-[0_0_100px_rgba(245,158,11,0.1)] mx-4">

                <button onClick={onCancel} className="absolute top-8 right-8 text-white/20 hover:text-white transition-colors z-50">
                    <X size={32} />
                </button>

                {status === 'intro' && (
                    <div className="space-y-8 animate-in zoom-in duration-700">
                        <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto border border-amber-500/20">
                            <BookOpen size={48} className="text-amber-500" />
                        </div>
                        <div>
                            <h2 className="font-cinzel text-4xl md:text-6xl font-black text-amber-500 mb-4 tracking-widest">{spell.name}</h2>
                            <p className="font-crimson text-xl md:text-2xl text-white/50 italic leading-relaxed">
                                "עליך להניף את השרביט בתנועה מדויקת כדי לשלוט בכשף."
                            </p>
                        </div>
                        <button
                            onClick={() => setStatus('drawing')}
                            className="px-12 py-5 rounded-full bg-amber-600 text-amber-950 font-cinzel font-black text-lg hover:shadow-[0_0_40px_rgba(245,158,11,0.4)] transition-all active:scale-95"
                        >
                            התחל את הריטואל
                        </button>
                    </div>
                )}

                {status === 'drawing' && (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                        <div className="mb-8 md:mb-12 text-amber-500/40 font-cinzel tracking-[0.2em] md:tracking-[0.3em] uppercase animate-pulse text-xs md:text-sm">
                            החזק והנע את השרביט בתנועה סיבובית מעל הקלף
                        </div>

                        <div
                            className="relative w-72 h-72 md:w-96 md:h-96 cursor-crosshair touch-none"
                            onMouseMove={(e) => handleInteraction(e.clientX, e.clientY)}
                            onTouchMove={(e) => handleInteraction(e.touches[0].clientX, e.touches[0].clientY)}
                        >
                            <div className="absolute inset-0 rounded-full border-4 border-dashed border-amber-500/10 animate-spin-slow"></div>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <div className="text-5xl md:text-6xl text-amber-500 drop-shadow-[0_0_20px_rgba(245,158,11,0.5)] font-cinzel font-black">
                                    {Math.floor(progress)}%
                                </div>
                                <Wand2 size={20} className="text-amber-500/30 mt-4 animate-bounce" />
                            </div>

                            <canvas
                                ref={canvasRef}
                                width={400}
                                height={400}
                                className="absolute inset-0 w-full h-full"
                            />
                        </div>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-8 animate-in zoom-in duration-1000">
                        <div className="relative">
                            <Sparkles size={100} className="text-amber-500 animate-bounce mx-auto" />
                            <div className="absolute inset-0 bg-amber-500 blur-3xl opacity-20"></div>
                        </div>
                        <h2 className="font-cinzel text-5xl md:text-7xl font-black text-white tracking-widest uppercase">תם ונשלם!</h2>
                        <p className="font-crimson text-xl md:text-2xl text-amber-500 italic">
                            "הכוח זורם בך, הלחש {spell.latin_name} כעת חלק ממך."
                        </p>
                    </div>
                )}
            </div>

            <style jsx>{`
                .animate-spin-slow { animation: spin 12s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}