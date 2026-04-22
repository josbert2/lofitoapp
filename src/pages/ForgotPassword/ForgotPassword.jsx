import { useState } from 'react';
import classNames from 'classnames/bind';
import PropsType from 'prop-types';

import { useStore } from '~/hooks';
import { useSelector } from '~/hooks/useSelector';
import { setAuthLoading, UserSelect } from '~/store/user';
import Notification from '../../components/Notification';
import { logoGif } from '~/assets/images';
import Button, { ButtonClose } from '../../components/Button';
import styles from './ForgotPassword.module.scss';

const cx = classNames.bind(styles);

function ForgotPassword({ onClose, changePage }) {
    const { resetPassword, user } = useStore();
    const [, userDispatch] = user;
    const [email, setEmail] = useState('');
    const [alert, setAlert] = useState({ message: '', severity: 'info' });

    const authLoadingStatus = useSelector(UserSelect.getAuthLoadingStatus);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setAlert({ ...alert, message: '' });

        try {
            userDispatch(setAuthLoading({ status: true }));
            await resetPassword(email);
            setAlert({ ...alert, message: 'Revisa tu bandeja de entrada', severity: 'success' });
        } catch (error) {
            if (error.code === 'auth/invalid-email') {
                setAlert({ ...alert, message: 'Correo no válido', severity: 'error' });
            } else {
                setAlert({ ...alert, message: 'No se pudo enviar el correo de recuperación', severity: 'error' });
            }
        }
        userDispatch(setAuthLoading({ status: false }));
    };
    return (
        <div className={cx('wrapper', 'fade-in')}>
            {alert.message && (
                <Notification
                    open={!!alert.message}
                    severity={alert.severity}
                    message={alert.message}
                    onClose={() => setAlert({ ...alert, message: '' })}
                />
            )}

            <ButtonClose className={cx('pos')} onClick={onClose} />
            <div className={cx('ResetPW-form')}>
                <img src={logoGif} alt="logo" className={cx('logoGif')} />
                <h1 className={cx('greeting')}>Recupera tu contraseña</h1>
                <h5>Escribe tu correo y te enviaremos instrucciones para restablecerla.</h5>
                <form id="form" onSubmit={handleSubmit}>
                    <div className={cx('form-container')}>
                        <div className={cx('form-group')}>
                            <div className={cx('form-control')}>
                                <input
                                    required
                                    id="email"
                                    placeholder="Correo electrónico"
                                    className={cx('form-input')}
                                    type="text"
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                                <div />
                            </div>
                        </div>
                        <Button disabled={authLoadingStatus} type="rounded" className={cx('reset-btn')}>
                            Enviar correo de recuperación
                        </Button>
                        <div className={cx('sign-up-option')}>
                            <p>¿No tienes cuenta?</p>
                            <p className={cx('accent')} onClick={changePage}>
                                Regístrate gratis
                            </p>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
ForgotPassword.propsType = {
    onClose: PropsType.func.isRequired,
    changePage: PropsType.func.isRequired,
};
export default ForgotPassword;
