import classNames from 'classnames/bind';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useStore } from '~/hooks';
import Button from '~/components/Button';
import Notification from '~/components/Notification';
import { arrowLeftIcon, deleteIcon } from '~/assets/icons';
import * as notesApi from '~/api/notes';
import styles from './Notes.module.scss';

const cx = classNames.bind(styles);

const SAVE_DEBOUNCE_MS = 600;

function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    if (sameDay) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
}

function Notes() {
    const { currentUser, setMenuActive } = useStore();
    const navigate = useNavigate();
    const [notes, setNotes] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [status, setStatus] = useState('idle'); // idle | saving | saved
    const [alert, setAlert] = useState({ message: '', severity: 'info' });
    const saveTimer = useRef(null);
    const skipNextSave = useRef(false);

    const selected = useMemo(() => notes.find((n) => n.id === selectedId), [notes, selectedId]);

    useEffect(() => {
        if (!currentUser) return;
        (async () => {
            try {
                const list = await notesApi.listNotes();
                setNotes(list);
            } catch (err) {
                setAlert({ message: 'No se pudieron cargar las notas', severity: 'error' });
            }
        })();
    }, [currentUser]);

    useEffect(() => {
        if (selected) {
            skipNextSave.current = true;
            setTitle(selected.title || '');
            setContent(selected.content || '');
            setStatus('idle');
        }
    }, [selected]);

    const persist = useCallback(
        async (id, payload) => {
            setStatus('saving');
            try {
                const updated = await notesApi.updateNote(id, payload);
                setNotes((prev) => {
                    const without = prev.filter((n) => n.id !== updated.id);
                    return [updated, ...without];
                });
                setStatus('saved');
            } catch (err) {
                setStatus('idle');
                setAlert({ message: 'No se pudo guardar', severity: 'error' });
            }
        },
        []
    );

    useEffect(() => {
        if (!selectedId) return;
        if (skipNextSave.current) {
            skipNextSave.current = false;
            return;
        }
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
            persist(selectedId, { title, content });
        }, SAVE_DEBOUNCE_MS);
        return () => {
            if (saveTimer.current) clearTimeout(saveTimer.current);
        };
    }, [title, content, selectedId, persist]);

    const handleCreate = async () => {
        try {
            const note = await notesApi.createNote({ title: '', content: '' });
            setNotes((prev) => [note, ...prev]);
            setSelectedId(note.id);
        } catch (err) {
            setAlert({ message: 'No se pudo crear la nota', severity: 'error' });
        }
    };

    const handleDelete = async (id, e) => {
        if (e) e.stopPropagation();
        const ok = window.confirm('¿Eliminar esta nota?');
        if (!ok) return;
        try {
            await notesApi.deleteNote(id);
            setNotes((prev) => prev.filter((n) => n.id !== id));
            if (selectedId === id) setSelectedId(null);
        } catch (err) {
            setAlert({ message: 'No se pudo eliminar', severity: 'error' });
        }
    };

    const handleBack = () => {
        if (saveTimer.current) {
            clearTimeout(saveTimer.current);
            if (selectedId) persist(selectedId, { title, content });
        }
        setSelectedId(null);
    };

    if (!currentUser) {
        return (
            <div className={cx('wrapper')}>
                <div className={cx('header')}>
                    <h5 className={cx('title')}>Notas</h5>
                </div>
                <div className={cx('premium-banner')}>
                    <h4>
                        <span className={cx('accent')}>Inicia sesión</span> para guardar notas
                    </h4>
                    <Button
                        type={'rounded'}
                        className={cx('login-btn')}
                        onClick={() => {
                            navigate('?auth=login');
                            setMenuActive(undefined);
                        }}
                    >
                        Iniciar sesión
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className={cx('wrapper')}>
            {alert.message && (
                <Notification
                    open={!!alert.message}
                    severity={alert.severity}
                    message={alert.message}
                    onClose={() => setAlert({ message: '', severity: 'info' })}
                />
            )}
            {!selected ? (
                <>
                    <div className={cx('header')}>
                        <h5 className={cx('title')}>Notas</h5>
                        <Button type="outline" className={cx('new-btn')} onClick={handleCreate}>
                            + Nueva
                        </Button>
                    </div>
                    <div className={cx('list')}>
                        {notes.length === 0 ? (
                            <p className={cx('empty')}>
                                Aún no tienes notas.
                                <br />
                                Pulsa “+ Nueva” para crear la primera.
                            </p>
                        ) : (
                            notes.map((note) => (
                                <div
                                    key={note.id}
                                    className={cx('note-item')}
                                    onClick={() => setSelectedId(note.id)}
                                >
                                    <img
                                        src={deleteIcon}
                                        alt="Eliminar"
                                        className={cx('delete-btn')}
                                        onClick={(e) => handleDelete(note.id, e)}
                                    />
                                    <div className={cx('note-title')}>{note.title || 'Sin título'}</div>
                                    {note.content && <div className={cx('note-preview')}>{note.content}</div>}
                                    <div className={cx('note-date')}>{formatDate(note.modifiedAt)}</div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            ) : (
                <>
                    <div className={cx('header')}>
                        <img src={arrowLeftIcon} alt="Volver" className={cx('back-btn')} onClick={handleBack} />
                        <h5 className={cx('title')} style={{ flex: 1, textAlign: 'center' }}>
                            Editar nota
                        </h5>
                    </div>
                    <div className={cx('editor')}>
                        <input
                            className={cx('title-input')}
                            value={title}
                            placeholder="Título"
                            onChange={(e) => setTitle(e.target.value)}
                        />
                        <textarea
                            className={cx('content-input')}
                            value={content}
                            placeholder="Escribe algo…"
                            onChange={(e) => setContent(e.target.value)}
                        />
                        <div className={cx('footer')}>
                            <span className={cx('status')}>
                                {status === 'saving' && 'Guardando…'}
                                {status === 'saved' && 'Guardado'}
                            </span>
                            <button type="button" className={cx('delete')} onClick={() => handleDelete(selected.id)}>
                                Eliminar
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default Notes;
