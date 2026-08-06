import { useEffect, useRef } from 'react';
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

    // --- Puente con el mini-player de escritorio (solo en Electron) ---
    // Publica qué suena para que el widget lo muestre.
    useEffect(() => {
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
        });
    }, [currentTrack, playing, level, currentScene]);

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
                onEnded={handleNextTrack}
            />
        </div>
    );
}

export default AudioPlayer;
