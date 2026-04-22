import { useContext } from 'react';
import { TimerContext } from './TimerProvider';

export { default as TimerProvider, TimerContext, PRESETS } from './TimerProvider';

export const useTimer = () => {
    const ctx = useContext(TimerContext);
    if (!ctx) throw new Error('useTimer must be used inside TimerProvider');
    return ctx;
};
