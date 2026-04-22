import classNames from 'classnames/bind';

import { PRESETS, useTimer } from '~/store/timer';
import styles from './Timer.module.scss';

const cx = classNames.bind(styles);

const format = (seconds) => {
    const m = Math.floor(Math.max(0, seconds) / 60);
    const s = Math.max(0, seconds) % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

function Timer() {
    const {
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
        showWidget,
    } = useTimer();

    const isCustom = presetId === 'custom';
    const atFullTime = remaining === totalSeconds;

    const handleCustomWork = (e) => {
        const v = Math.max(1, Math.min(180, Number(e.target.value) || 1));
        setCustom({ work: v });
    };
    const handleCustomBreak = (e) => {
        const v = Math.max(1, Math.min(60, Number(e.target.value) || 1));
        setCustom({ brk: v });
    };

    return (
        <div className={cx('wrapper')}>
            <div className={cx('header')}>
                <h5 className={cx('title')}>Temporizador</h5>
                {widgetHidden && (
                    <button className={cx('btn-ghost-sm')} onClick={showWidget} style={{ height: 32, fontSize: '1.2rem' }}>
                        Mostrar widget
                    </button>
                )}
            </div>
            <p className={cx('subtitle')}>Sesiones de enfoque tipo Pomodoro.</p>

            <div className={cx('presets')}>
                {PRESETS.map((p) => (
                    <button
                        key={p.id}
                        className={presetId === p.id ? cx('preset-active') : cx('preset')}
                        onClick={() => applyPreset(p)}
                    >
                        {p.label}
                    </button>
                ))}
                <button
                    className={isCustom ? cx('preset-active') : cx('preset')}
                    onClick={() => setCustom({})}
                >
                    Personalizado
                </button>
            </div>

            {isCustom && (
                <>
                    <div className={cx('custom')}>
                        <label>Trabajo</label>
                        <input type="number" min="1" max="180" value={workMin} onChange={handleCustomWork} />
                        <span style={{ opacity: 0.5, fontSize: '1.1rem' }}>min</span>
                    </div>
                    <div className={cx('custom')}>
                        <label>Descanso</label>
                        <input type="number" min="1" max="60" value={breakMin} onChange={handleCustomBreak} />
                        <span style={{ opacity: 0.5, fontSize: '1.1rem' }}>min</span>
                    </div>
                </>
            )}

            <div className={cx('display')}>
                <div className={cx('mode')}>{mode === 'work' ? '◉ Enfoque' : '☕ Descanso'}</div>
                <div className={cx('time')}>{format(remaining)}</div>
            </div>

            <div className={cx('controls')}>
                <button className={cx('btn-big-primary')} onClick={toggleRun}>
                    {running ? 'Pausar' : atFullTime ? 'Iniciar' : 'Reanudar'}
                </button>
                <button className={cx('btn-ghost-sm')} onClick={reset}>
                    Reiniciar
                </button>
                <button className={cx('btn-ghost-sm')} onClick={skip}>
                    Saltar
                </button>
            </div>

            <div className={cx('stats')}>
                <div className={cx('stat')}>
                    <b>{completed}</b>
                    <span>Pomodoros hoy</span>
                </div>
                <div className={cx('stat')}>
                    <b>{workMin}</b>
                    <span>Min. trabajo</span>
                </div>
                <div className={cx('stat')}>
                    <b>{breakMin}</b>
                    <span>Min. descanso</span>
                </div>
            </div>
        </div>
    );
}

export default Timer;
