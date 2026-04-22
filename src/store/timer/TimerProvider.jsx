import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';

const STORAGE_KEY = 'lofito_timer_v1';

export const PRESETS = [
    { id: '25-5', label: '25 / 5', work: 25, brk: 5 },
    { id: '45-15', label: '45 / 15', work: 45, brk: 15 },
    { id: '50-10', label: '50 / 10', work: 50, brk: 10 },
];

const DEFAULT_STATE = {
    presetId: '25-5',
    workMin: 25,
    breakMin: 5,
    mode: 'work',
    remaining: 25 * 60,
    completed: 0,
    widgetHidden: false,
};

const loadInitial = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_STATE;
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_STATE, ...parsed };
    } catch {
        return DEFAULT_STATE;
    }
};

const beep = () => {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 660;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
    } catch {
        /* ignore */
    }
};

const formatTitle = (seconds, mode) => {
    const m = Math.floor(Math.max(0, seconds) / 60);
    const s = Math.max(0, seconds) % 60;
    const label = mode === 'work' ? 'Enfoque' : 'Descanso';
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} · ${label}`;
};

export const TimerContext = createContext(null);

function TimerProvider({ children }) {
    const initial = loadInitial();
    const [presetId, setPresetId] = useState(initial.presetId);
    const [workMin, setWorkMin] = useState(initial.workMin);
    const [breakMin, setBreakMin] = useState(initial.breakMin);
    const [mode, setMode] = useState(initial.mode);
    const [remaining, setRemaining] = useState(initial.remaining);
    const [completed, setCompleted] = useState(initial.completed);
    const [running, setRunning] = useState(false);
    const [widgetHidden, setWidgetHidden] = useState(!!initial.widgetHidden);

    const intervalRef = useRef(null);
    const originalTitle = useRef(typeof document !== 'undefined' ? document.title : '');

    useEffect(() => {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ presetId, workMin, breakMin, mode, remaining, completed, widgetHidden })
        );
    }, [presetId, workMin, breakMin, mode, remaining, completed, widgetHidden]);

    const totalSeconds = (mode === 'work' ? workMin : breakMin) * 60;

    const switchMode = useCallback(() => {
        beep();
        setMode((prev) => {
            const next = prev === 'work' ? 'break' : 'work';
            setRemaining((next === 'work' ? workMin : breakMin) * 60);
            if (prev === 'work') setCompleted((c) => c + 1);
            return next;
        });
    }, [workMin, breakMin]);

    useEffect(() => {
        if (!running) return;
        intervalRef.current = setInterval(() => {
            setRemaining((prev) => {
                if (prev <= 1) {
                    clearInterval(intervalRef.current);
                    setRunning(false);
                    setTimeout(switchMode, 0);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(intervalRef.current);
    }, [running, switchMode]);

    useEffect(() => {
        if (!running) {
            if (document.title !== originalTitle.current) document.title = originalTitle.current;
            return;
        }
        document.title = formatTitle(remaining, mode);
        return () => {
            if (!running) document.title = originalTitle.current;
        };
    }, [running, remaining, mode]);

    useEffect(() => {
        const onUnload = () => {
            document.title = originalTitle.current;
        };
        window.addEventListener('beforeunload', onUnload);
        return () => {
            window.removeEventListener('beforeunload', onUnload);
            document.title = originalTitle.current;
        };
    }, []);

    const applyPreset = useCallback((preset) => {
        setPresetId(preset.id);
        setWorkMin(preset.work);
        setBreakMin(preset.brk);
        setRunning(false);
        setMode('work');
        setRemaining(preset.work * 60);
    }, []);

    const setCustom = useCallback(
        ({ work, brk }) => {
            setPresetId('custom');
            if (Number.isFinite(work)) {
                setWorkMin(work);
                if (mode === 'work' && !running) setRemaining(work * 60);
            }
            if (Number.isFinite(brk)) {
                setBreakMin(brk);
                if (mode === 'break' && !running) setRemaining(brk * 60);
            }
        },
        [mode, running]
    );

    const toggleRun = useCallback(() => setRunning((r) => !r), []);

    const reset = useCallback(() => {
        setRunning(false);
        setRemaining((mode === 'work' ? workMin : breakMin) * 60);
    }, [mode, workMin, breakMin]);

    const skip = useCallback(() => {
        setRunning(false);
        switchMode();
    }, [switchMode]);

    const hideWidget = useCallback(() => setWidgetHidden(true), []);
    const showWidget = useCallback(() => setWidgetHidden(false), []);

    const value = useMemo(
        () => ({
            presetId,
            workMin,
            breakMin,
            mode,
            remaining,
            running,
            completed,
            totalSeconds,
            widgetHidden,
            applyPreset,
            setCustom,
            toggleRun,
            reset,
            skip,
            hideWidget,
            showWidget,
        }),
        [
            presetId,
            workMin,
            breakMin,
            mode,
            remaining,
            running,
            completed,
            totalSeconds,
            widgetHidden,
            applyPreset,
            setCustom,
            toggleRun,
            reset,
            skip,
            hideWidget,
            showWidget,
        ]
    );

    return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export default TimerProvider;
