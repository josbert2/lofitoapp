import classNames from 'classnames/bind';
import { useEffect, useState } from 'react';

import { weatherInfo } from './weatherCodes';
import styles from './Weather.module.scss';

const cx = classNames.bind(styles);

const CACHE_KEY = 'lofito_weather_v1';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 min

async function locateByIp() {
    const res = await fetch('https://ipapi.co/json/');
    if (!res.ok) throw new Error('ip lookup failed');
    const data = await res.json();
    if (!data?.latitude || !data?.longitude) throw new Error('no coords');
    return {
        lat: data.latitude,
        lon: data.longitude,
        city: data.city,
        country: data.country_name,
    };
}

async function fetchWeather({ lat, lon }) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('weather fetch failed');
    const data = await res.json();
    const cur = data.current;
    if (!cur) throw new Error('no current weather');
    return {
        temperature: Math.round(cur.temperature_2m),
        code: cur.weather_code,
        isDay: cur.is_day === 1,
    };
}

function Weather() {
    const [state, setState] = useState({ status: 'loading' });

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
                if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
                    if (!cancelled) setState({ status: 'ready', ...cached });
                    return;
                }
                const loc = await locateByIp();
                const wx = await fetchWeather(loc);
                const payload = { ...loc, ...wx, fetchedAt: Date.now() };
                localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
                if (!cancelled) setState({ status: 'ready', ...payload });
            } catch (err) {
                if (!cancelled) setState({ status: 'error' });
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    if (state.status === 'loading') {
        return (
            <div className={cx('pill')}>
                <span className={cx('loading')}>Cargando clima…</span>
            </div>
        );
    }

    if (state.status === 'error') return null;

    const { icon, label } = weatherInfo(state.code, state.isDay);
    const place = state.city || state.country || '';

    return (
        <div className={cx('pill')} title={`${label}${place ? ' · ' + place : ''}`}>
            <span className={cx('icon')}>{icon}</span>
            <div className={cx('info')}>
                <span className={cx('temp')}>{state.temperature}°C</span>
                <span className={cx('desc')}>
                    {label}
                    {place ? ` · ${place}` : ''}
                </span>
            </div>
        </div>
    );
}

export default Weather;
