import classNames from 'classnames/bind';
import { useEffect, useRef, useState } from 'react';

import styles from './PdfReader.module.scss';

const cx = classNames.bind(styles);

function PdfReader() {
    const [file, setFile] = useState(null);
    const [url, setUrl] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        return () => {
            if (url) URL.revokeObjectURL(url);
        };
    }, [url]);

    const loadFile = (f) => {
        if (!f) return;
        if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
            alert('Sólo se admiten archivos PDF');
            return;
        }
        if (url) URL.revokeObjectURL(url);
        setFile(f);
        setUrl(URL.createObjectURL(f));
    };

    const onDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        loadFile(e.dataTransfer.files?.[0]);
    };

    const remove = () => {
        if (url) URL.revokeObjectURL(url);
        setFile(null);
        setUrl(null);
        if (inputRef.current) inputRef.current.value = '';
    };

    return (
        <div className={cx('wrapper')}>
            <div className={cx('header')}>
                <h5 className={cx('title')}>Lector PDF</h5>
            </div>
            <p className={cx('subtitle')}>Abre un PDF local. Todo se queda en tu navegador.</p>

            {!url ? (
                <div
                    className={dragOver ? cx('dropzone-active') : cx('dropzone')}
                    onClick={() => inputRef.current?.click()}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={onDrop}
                >
                    Arrastra un PDF aquí o <strong>haz clic</strong> para elegir uno
                </div>
            ) : (
                <>
                    <div className={cx('file-bar')}>
                        <span className={cx('name')}>{file?.name || 'documento.pdf'}</span>
                        <button className={cx('remove')} onClick={remove} title="Quitar">
                            ×
                        </button>
                    </div>
                    <div className={cx('preview')}>
                        <object data={url} type="application/pdf">
                            <iframe title="PDF" src={url} />
                        </object>
                    </div>
                </>
            )}

            <input
                ref={inputRef}
                type="file"
                accept="application/pdf,.pdf"
                className={cx('hidden-input')}
                onChange={(e) => loadFile(e.target.files?.[0])}
            />
        </div>
    );
}

export default PdfReader;
