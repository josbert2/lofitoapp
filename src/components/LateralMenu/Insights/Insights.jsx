import classNames from 'classnames/bind';
import { useEffect, useState } from 'react';

import { useStore } from '~/hooks';
import { useSelector } from '~/hooks/useSelector';
import { UserSelect } from '~/store/user';
import { listNotes } from '~/api/notes';
import styles from './Insights.module.scss';

const cx = classNames.bind(styles);

const formatDate = (iso) => {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return '—';
    }
};

function Insights() {
    const { currentUser } = useStore();
    const data = useSelector(UserSelect.getUserData);
    const [noteCount, setNoteCount] = useState(null);

    useEffect(() => {
        if (!currentUser) return;
        (async () => {
            try {
                const notes = await listNotes();
                setNoteCount(notes.length);
            } catch {
                setNoteCount(0);
            }
        })();
    }, [currentUser]);

    if (!currentUser) {
        return (
            <div className={cx('wrapper')}>
                <div className={cx('header')}>
                    <h5 className={cx('title')}>Estadísticas</h5>
                </div>
                <div className={cx('signin-hint')}>Inicia sesión para ver tus estadísticas.</div>
            </div>
        );
    }

    const templates = data?.templates || [];

    return (
        <div className={cx('wrapper')}>
            <div className={cx('header')}>
                <h5 className={cx('title')}>Estadísticas</h5>
            </div>
            <p className={cx('subtitle')}>Un vistazo rápido a tu actividad.</p>

            <div className={cx('cards')}>
                <div className={cx('card-accent')}>
                    <span className={cx('value')}>{templates.length}</span>
                    <span className={cx('label')}>Plantillas guardadas</span>
                </div>
                <div className={cx('card-accent')}>
                    <span className={cx('value')}>{noteCount == null ? '…' : noteCount}</span>
                    <span className={cx('label')}>Notas</span>
                </div>
            </div>

            <div className={cx('info')}>
                <div className={cx('row')}>
                    <span className={cx('key')}>Usuario</span>
                    <span>{currentUser.displayName || '—'}</span>
                </div>
                <div className={cx('row')}>
                    <span className={cx('key')}>Correo</span>
                    <span>{currentUser.email}</span>
                </div>
                <div className={cx('row')}>
                    <span className={cx('key')}>Miembro desde</span>
                    <span>{formatDate(data?.createdAt)}</span>
                </div>
                <div className={cx('row')}>
                    <span className={cx('key')}>Plan</span>
                    <span>Gratuito</span>
                </div>
            </div>
        </div>
    );
}

export default Insights;
