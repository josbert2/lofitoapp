import classNames from 'classnames/bind';
import { useNavigate } from 'react-router-dom';

import { useTimer } from '~/store/timer';
import { useStore } from '~/hooks';
import styles from './TimerWidget.module.scss';

const cx = classNames.bind(styles);

const RADIUS = 32;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const format = (seconds) => {
    const m = Math.floor(Math.max(0, seconds) / 60);
    const s = Math.max(0, seconds) % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

function TimerWidget() {
    const {
        mode,
        remaining,
        running,
        completed,
        totalSeconds,
        widgetHidden,
        toggleRun,
        skip,
        hideWidget,
    } = useTimer();
    const { setMenuActive, menuActive } = useStore();
    const navigate = useNavigate();

    if (widgetHidden) return null;
    const atFull = remaining === totalSeconds;
    if (!running && atFull) return null;

    const progress = totalSeconds > 0 ? (totalSeconds - remaining) / totalSeconds : 0;
    const dashOffset = CIRCUMFERENCE * (1 - progress);

    const openPanel = () => {
        if (menuActive !== 'Timer') setMenuActive('Timer');
        navigate('');
    };

    return (
        <div className={cx('widget')}>
            <button className={cx('close')} onClick={hideWidget} title="Ocultar">
                ×
            </button>
            <div
                className={cx('ring')}
                onClick={openPanel}
                style={{ cursor: 'pointer' }}
                title="Abrir temporizador"
            >
                <svg width="72" height="72" viewBox="0 0 72 72">
                    <circle className={cx('track')} cx="36" cy="36" r={RADIUS} strokeWidth="5" />
                    <circle
                        className={cx('progress', mode === 'work' ? 'work' : 'break')}
                        cx="36"
                        cy="36"
                        r={RADIUS}
                        strokeWidth="5"
                        transform="rotate(-90 36 36)"
                        strokeDasharray={CIRCUMFERENCE}
                        strokeDashoffset={dashOffset}
                        style={{ stroke: 'currentColor' }}
                    />
                </svg>
                <div className={cx('inner')}>{format(remaining)}</div>
            </div>
            <div className={cx('info')}>
                <span className={cx('mode')}>{mode === 'work' ? '◉ Enfoque' : '☕ Descanso'}</span>
                <span className={cx('count')}>
                    Pomodoros: <b>{completed}</b>
                </span>
                <div className={cx('actions')}>
                    <button
                        className={cx('btn', running ? null : 'btn-primary')}
                        onClick={toggleRun}
                    >
                        {running ? 'Pausar' : 'Reanudar'}
                    </button>
                    <button className={cx('btn')} onClick={skip}>
                        Saltar
                    </button>
                </div>
            </div>
        </div>
    );
}

export default TimerWidget;
