import { useCallback, useEffect, useRef } from 'react';
import ReactPlayer from 'react-player';
import { useStore } from '~/hooks';
import { useSelector } from '~/hooks/useSelector';
import { nextTrack, previousTrack, playAndPauseAudio, setAudioVolume, SessionSelect } from '~/store/session';

function AudioPlayer() {
    const { session } = useStore();
    const [, sessionDispatch] = session;
    const playerRef = useRef();
    const currentTrack = useSelector(SessionSelect.getCurrentTrack);
    const playing = useSelector(SessionSelect.getPlayingStatus);
    const level = useSelector(SessionSelect.getAudioLevel);
    const currentScene = useSelector(SessionSelect.getScene);
    // Tiempo de reproducción para la barra de progreso del widget.
    const elapsedRef = useRef(0);
    const durationRef = useRef(0);

    // --- Puente con el mini-player de escritorio (solo en Electron) ---
    // Arma el estado "qué suena" y lo publica para que el widget lo muestre.
    const publishNowPlaying = useCallback(() => {
        const D = window.lofitoDesktop;
        if (!D || D.isMini) return;
        // La foto de la escena es un asset del bundle → la resolvemos a URL absoluta
        // para que el mini-player (misma origin) la pueda cargar.
        let art = null;
        const thumb = currentScene?.thumbnail;
        if (thumb) {
            try {
                art = new URL(thumb, window.location.href).href;
            } catch {
                art = typeof thumb === 'string' ? thumb : null;
            }
        }
        D.publishNowPlaying({
            title: currentTrack?.title || '',
            artist: currentTrack?.artist || '',
            playing,
            volume: level,
            art,
            elapsed: elapsedRef.current,
            duration: durationRef.current,
        });
    }, [currentTrack, playing, level, currentScene]);

    useEffect(() => {
        publishNowPlaying();
    }, [publishNowPlaying]);

    // Reinicia el progreso al cambiar de track.
    useEffect(() => {
        elapsedRef.current = 0;
        durationRef.current = 0;
    }, [currentTrack]);

    const handleProgress = ({ playedSeconds }) => {
        elapsedRef.current = playedSeconds || 0;
        publishNowPlaying();
    };
    const handleDuration = (d) => {
        durationRef.current = d || 0;
        publishNowPlaying();
    };

    // Ejecuta los controles que llegan desde el widget.
    useEffect(() => {
        const D = window.lofitoDesktop;
        if (!D || D.isMini) return;
        return D.onCommand((cmd) => {
            if (cmd === 'toggle') sessionDispatch(playAndPauseAudio());
            else if (cmd === 'next') sessionDispatch(nextTrack());
            else if (cmd === 'prev') sessionDispatch(previousTrack());
            else if (cmd && cmd.type === 'volume') sessionDispatch(setAudioVolume({ level: cmd.value }));
        });
    }, [sessionDispatch]);

    const handleNextTrack = () => sessionDispatch(nextTrack());
    return (
        <div style={{ display: 'none' }} id="audio track">
            <ReactPlayer
                config={{
                    file: { forceAudio: true },
                }}
                playing={playing}
                ref={playerRef}
                url={currentTrack.url}
                volume={level}
                progressInterval={500}
                onProgress={handleProgress}
                onDuration={handleDuration}
                onEnded={handleNextTrack}
            />
        </div>
    );
}

export default AudioPlayer;
