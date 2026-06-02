import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import ffmpegPath from 'ffmpeg-static';

const run = promisify(execFile);

// Comprime un video: H.264 CRF 28 (buen tamaño/calidad para loops), escala a
// máximo 1920px de ancho manteniendo aspecto (dimensiones pares), sin audio
// (las escenas son loops mudos) y faststart para streaming web progresivo.
export async function compressVideo(input, output) {
    await run(
        ffmpegPath,
        [
            '-y',
            '-i', input,
            '-vcodec', 'libx264',
            '-crf', '28',
            '-preset', 'veryfast',
            '-pix_fmt', 'yuv420p',
            '-vf', "scale='min(1920,iw)':-2",
            '-an',
            '-movflags', '+faststart',
            output,
        ],
        { maxBuffer: 1024 * 1024 * 64 }
    );
}

// Saca un frame (~seg 1) como JPG de máx 640px de ancho para usar de thumbnail.
export async function makeThumbnail(input, output) {
    await run(
        ffmpegPath,
        ['-y', '-ss', '1', '-i', input, '-frames:v', '1', '-vf', "scale='min(640,iw)':-2", '-q:v', '4', output],
        { maxBuffer: 1024 * 1024 * 16 }
    );
}
