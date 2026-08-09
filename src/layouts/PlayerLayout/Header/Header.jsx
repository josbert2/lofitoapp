import classNames from 'classnames/bind';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Switch from 'react-switch';

import { logoGif, pixelModeOff, pixelModeOn } from '~/assets/images';
import { share, volumeActive, volumeMute, menu, fullscreenIcon, sunIcon, moonIcon } from '~/assets/icons';
import Button from '~/components/Button';
import SettingMenu from '~/components/SettingMenu';
import { MENU_ITEMS } from '~/constants';
import { useStore } from '~/hooks';
import { useSelector } from '~/hooks/useSelector';
import { muteUnmuteAll, setAudioVolume, SessionSelect, setSceneNight, setScenePixel } from '~/store/session';
import styles from './Header.module.scss';
import MiniPlayerBar from './MiniPlayerBar';
import Clock from './Clock';
import Weather from './Weather';

const cx = classNames.bind(styles);

function Header() {
    const [fullscreen, setFullscreen] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const navigate = useNavigate();
    const { setModalType, session, currentUser } = useStore();
    const [, sessionDispatch] = session;

    const nightMode = useSelector(SessionSelect.nightMode);
    const pixelMode = useSelector(SessionSelect.pixelMode);
    const currentScene = useSelector(SessionSelect.getScene);
    const audioLevel = useSelector(SessionSelect.getAudioLevel);

    const variants = Object.keys(currentScene.variants);

    const hasNightVersion = !!variants.find((variant) => variant.includes('night'));
    const hasPixelVersion = !!variants.find((variant) => variant.includes('pixel'));

    const checkFullScreen = () => {
        var doc = window.document;
        // least one is fullscreen -> true
        return (
            doc.fullscreenElement || doc.mozFullScreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement
        );
    };

    // toggle when click fullscreen button
    const handleFullScreen = () => {
        const doc = window.document;
        const docEl = doc.documentElement;

        let requestFullScreen =
            docEl.requestFullscreen ||
            docEl.mozRequestFullScreen ||
            docEl.webkitRequestFullScreen ||
            docEl.msRequestFullscreen;
        let cancelFullScreen =
            doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;

        if (!checkFullScreen()) {
            requestFullScreen.call(docEl);
            setFullscreen(true);
        } else {
            cancelFullScreen.call(doc);
            setFullscreen(false);
        }
    };

    const handleMuteUnmuteAll = () => {
        sessionDispatch(muteUnmuteAll());
        setIsMuted(!isMuted);
    };

    // En la app de escritorio (Electron) reservamos espacio para los controles
    // nativos de ventana (min/max/cerrar) que se dibujan arriba a la derecha.
    const isDesktop = typeof window !== 'undefined' && window.lofitoDesktop && !window.lofitoDesktop.isMini;

    // Widget flotante (mini-player al minimizar): activable, persistido en localStorage.
    const [widgetEnabled, setWidgetEnabled] = useState(() => {
        try {
            return localStorage.getItem('lofito_widget') !== 'off';
        } catch {
            return true;
        }
    });
    useEffect(() => {
        if (isDesktop && window.lofitoDesktop.setWidgetEnabled) {
            window.lofitoDesktop.setWidgetEnabled(widgetEnabled);
        }
    }, [isDesktop, widgetEnabled]);
    const toggleWidget = () => {
        setWidgetEnabled((v) => {
            const next = !v;
            try {
                localStorage.setItem('lofito_widget', next ? 'on' : 'off');
            } catch {
                /* ignore */
            }
            return next;
        });
    };

    // Modo Wallpaper (escena como fondo de escritorio vivo): opt-in, persistido.
    const [wallpaperEnabled, setWallpaperEnabled] = useState(() => {
        try {
            return localStorage.getItem('lofito_wallpaper') === 'on';
        } catch {
            return false;
        }
    });
    useEffect(() => {
        if (isDesktop && window.lofitoDesktop.setWallpaperEnabled) {
            window.lofitoDesktop.setWallpaperEnabled(wallpaperEnabled);
        }
    }, [isDesktop, wallpaperEnabled]);
    const toggleWallpaper = () => {
        setWallpaperEnabled((v) => {
            const next = !v;
            try {
                localStorage.setItem('lofito_wallpaper', next ? 'on' : 'off');
            } catch {
                /* ignore */
            }
            return next;
        });
    };

    return (
        <header className={cx('wrapper')}>
            <div className={cx('inner')}>
                <Button type="clear" href="https://chillhop.onrender.com" className={cx('header-logo')}>
                    <img src={logoGif} alt="logo" style={{ height: 100 }} />
                </Button>
                <div className={cx('actions')} style={isDesktop ? { marginRight: 140 } : undefined}>
                    {/* clock show time */}
                    <Clock />
                    <Weather />
                    {/* button toggle day night */}
                    {hasNightVersion && (
                        <div className={cx('toggle-weather')}>
                            <Switch
                                checked={!nightMode}
                                onChange={() => {
                                    sessionDispatch(setSceneNight());
                                }}
                                offColor="#bfbfbf"
                                onColor="#f3a952"
                                offHandleColor="#fff"
                                height={30}
                                width={60}
                                handleDiameter={24}
                                activeBoxShadow="0px 0px 0px 0px transparent"
                                checkedIcon={
                                    <div className={cx('switch-icon')}>
                                        <img src={sunIcon} alt="sunIcon" />
                                    </div>
                                }
                                uncheckedIcon={
                                    <div className={cx('switch-icon')}>
                                        <img src={moonIcon} alt="moonIcon" />
                                    </div>
                                }
                            />
                        </div>
                    )}
                    {/* toggle pixel mode */}
                    {hasPixelVersion && (
                        <div
                            className={cx('toggle-pixel')}
                            onClick={() => {
                                sessionDispatch(setScenePixel());
                            }}
                        >
                            {pixelMode ? (
                                <img src={pixelModeOn} alt="pixelModeOn" className={cx('pixel-icon')} />
                            ) : (
                                <img
                                    src={pixelModeOff}
                                    alt="pixelModeOff"
                                    className={cx('pixel-icon')}
                                    style={{ filter: 'invert()' }}
                                />
                            )}
                        </div>
                    )}

                    {/* fullscreen button */}
                    {!fullscreen && !currentUser && (
                        <Button
                            type="premium"
                            emoji={{ symbol: '🚀', label: 'rocket' }}
                            onClick={() => setModalType('Pricing')}
                            className="hideMobile"
                        >
                            <p>
                                Accede a +20 escenas
                                <br />y más con premium
                            </p>
                        </Button>
                    )}
                    {/* <Button type="transparent" className={cx('signUp-btn', 'hideMobile')}>
                        Registrarme
                    </Button> */}
                    <button
                        className={cx('actionBtn', 'hideMobile')}
                        title="Mis videos de YouTube"
                        onClick={() => navigate('/playlists')}
                    >
                        <span style={{ fontSize: 22, lineHeight: 1 }}>🎬</span>
                    </button>
                    <button className={cx('actionBtn', 'hideMobile')} onClick={() => setModalType('Share')}>
                        <img src={share} alt="share" />
                    </button>
                    <div className={cx('volume-control', 'hideMobile')}>
                        <button className={cx('actionBtn')} onClick={handleMuteUnmuteAll}>
                            {!isMuted ? (
                                <img src={volumeActive} alt="volumeActive" />
                            ) : (
                                <img src={volumeMute} alt="volumeMute" />
                            )}
                        </button>
                        <input
                            className={cx('volume-slider')}
                            type="range"
                            min="0"
                            max="100"
                            value={Math.round((audioLevel ?? 0) * 100)}
                            onChange={(e) => sessionDispatch(setAudioVolume({ level: Number(e.target.value) / 100 }))}
                            title="Volumen"
                        />
                    </div>
                    <button className={cx('actionBtn', 'hideMobile')} onClick={handleFullScreen}>
                        <img src={fullscreenIcon} alt="fullscreenIcon" />
                    </button>
                    {/* mini player bar */}
                    <MiniPlayerBar />

                    {/* Menu */}
                    <SettingMenu items={MENU_ITEMS}>
                        <button className={cx('actionBtn')}>
                            <img src={menu} alt="menu" />
                        </button>
                    </SettingMenu>
                </div>
            </div>

            {isDesktop && (
                <div className={cx('winControls')}>
                    <button
                        className={cx('winBtn')}
                        title={wallpaperEnabled ? 'Modo wallpaper: activado' : 'Modo wallpaper (fondo de escritorio)'}
                        onClick={toggleWallpaper}
                        style={{ color: wallpaperEnabled ? '#a99bff' : 'rgba(255,255,255,0.35)' }}
                    >
                        <svg width="15" height="13" viewBox="0 0 15 13" fill="none">
                            <rect x="0.5" y="0.5" width="14" height="9.5" rx="1.5" stroke="currentColor" />
                            <path d="M5 12.5h5M7.5 10.2v2.3" stroke="currentColor" strokeLinecap="round" />
                        </svg>
                    </button>
                    <button
                        className={cx('winBtn')}
                        title={widgetEnabled ? 'Widget flotante: activado' : 'Widget flotante: desactivado'}
                        onClick={toggleWidget}
                        style={{ color: widgetEnabled ? '#a99bff' : 'rgba(255,255,255,0.35)' }}
                    >
                        <svg width="15" height="11" viewBox="0 0 15 11" fill="none">
                            <rect x="0.5" y="1.5" width="14" height="8" rx="4" stroke="currentColor" />
                            <circle cx="4.5" cy="5.5" r="1.6" fill="currentColor" />
                            <rect x="8" y="4.6" width="4.5" height="1.8" rx="0.9" fill="currentColor" />
                        </svg>
                    </button>
                    <button className={cx('winBtn')} title="Minimizar" onClick={() => window.lofitoDesktop.minimize()}>
                        <svg width="11" height="11" viewBox="0 0 11 11">
                            <rect y="5" width="11" height="1" fill="currentColor" />
                        </svg>
                    </button>
                    <button className={cx('winBtn')} title="Maximizar" onClick={() => window.lofitoDesktop.maximize()}>
                        <svg width="11" height="11" viewBox="0 0 11 11">
                            <rect x="0.5" y="0.5" width="10" height="10" fill="none" stroke="currentColor" />
                        </svg>
                    </button>
                    <button
                        className={cx('winBtn', 'winClose')}
                        title="Cerrar"
                        onClick={() => window.lofitoDesktop.close()}
                    >
                        <svg width="11" height="11" viewBox="0 0 11 11">
                            <path d="M0.5 0.5 L10.5 10.5 M10.5 0.5 L0.5 10.5" stroke="currentColor" strokeWidth="1" />
                        </svg>
                    </button>
                </div>
            )}
        </header>
    );
}

export default Header;
