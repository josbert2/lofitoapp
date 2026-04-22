import classNames from 'classnames/bind';
import { useEffect, useState } from 'react';

import styles from './Youtube.module.scss';

const cx = classNames.bind(styles);

const STORAGE_KEY = 'lofito_youtube_v1';

const extractVideoId = (input) => {
    if (!input) return null;
    const trimmed = input.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
    const patterns = [
        /[?&]v=([a-zA-Z0-9_-]{11})/,
        /youtu\.be\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    ];
    for (const re of patterns) {
        const m = trimmed.match(re);
        if (m) return m[1];
    }
    return null;
};

function Youtube() {
    const [url, setUrl] = useState('');
    const [videoId, setVideoId] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')?.current ?? null;
        } catch {
            return null;
        }
    });
    const [saved, setSaved] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')?.saved ?? [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ current: videoId, saved }));
    }, [videoId, saved]);

    const handleLoad = (e) => {
        e.preventDefault();
        const id = extractVideoId(url);
        if (!id) return;
        setVideoId(id);
        if (!saved.find((s) => s.id === id)) {
            setSaved((prev) => [{ id, url: url.trim(), addedAt: Date.now() }, ...prev].slice(0, 10));
        }
        setUrl('');
    };

    const remove = (id) => {
        setSaved((prev) => prev.filter((s) => s.id !== id));
        if (videoId === id) setVideoId(null);
    };

    return (
        <div className={cx('wrapper')}>
            <div className={cx('header')}>
                <h5 className={cx('title')}>YouTube</h5>
            </div>
            <p className={cx('subtitle')}>Pega un enlace o ID de YouTube.</p>

            <form className={cx('form')} onSubmit={handleLoad}>
                <input
                    type="text"
                    placeholder="https://youtu.be/… o ID"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                />
                <button type="submit" disabled={!url.trim()}>
                    Cargar
                </button>
            </form>

            {videoId ? (
                <div className={cx('player')}>
                    <iframe
                        title="YouTube player"
                        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                </div>
            ) : (
                <div className={cx('placeholder')}>Aún no has cargado ningún video.</div>
            )}

            {saved.length > 0 && (
                <>
                    <p className={cx('label')}>Recientes</p>
                    <div className={cx('saved-list')}>
                        {saved.map((item) => (
                            <div key={item.id} className={cx('saved-item')} onClick={() => setVideoId(item.id)}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {item.url || item.id}
                                </span>
                                <button
                                    className={cx('remove')}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        remove(item.id);
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

export default Youtube;
