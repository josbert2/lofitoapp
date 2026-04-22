import { useState, useEffect } from 'react';
import PropsType from 'prop-types';
import classNames from 'classnames/bind';

import { useStore } from '~/hooks';
import { useSelector } from '~/hooks/useSelector';
import { setAuthLoading, UserSelect } from '~/store/user';
import { logoGif } from '~/assets/images';
import Button, { ButtonClose } from '../../components/Button';
import { eye1, eye2 } from '~/assets/icons';
import Notification from '../../components/Notification';
import styles from './SignUp.module.scss';
import { addUSer } from '~/firebase/services';

const cx = classNames.bind(styles);
function SignUp({ onClose, changePage }) {
    const [isHidden, setHidden] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUserName] = useState('');
    const [alert, setAlert] = useState({ message: '', severity: 'info' });

    const { createUser, changeProfile, user } = useStore();

    const [, userDispatch] = user;

    const authLoadingStatus = useSelector(UserSelect.getAuthLoadingStatus);

    useEffect(() => {
        if (authLoadingStatus === false) return;
        const timer = setTimeout(() => {
            userDispatch(setAuthLoading({ status: false }));
        }, 6000);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoadingStatus]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setAlert({ ...alert, message: '' });

        try {
            userDispatch(setAuthLoading({ status: true }));
            const { user } = await createUser(email, password);
            await changeProfile(username);
            await addUSer(user.uid, {
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                uid: user.uid,
            });
            onClose();
            window.location.reload();
        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                setAlert({ ...alert, message: 'Este correo ya está registrado', severity: 'error' });
            } else if (error.code === 'auth/invalid-email') {
                setAlert({ ...alert, message: 'Correo no válido', severity: 'error' });
            } else if (error.code === 'auth/weak-password') {
                setAlert({ ...alert, message: 'La contraseña debe tener al menos 8 caracteres', severity: 'error' });
            } else {
                setAlert({ ...alert, message: error.code, severity: 'error' });
            }
            userDispatch(setAuthLoading({ status: false }));
        }
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
            <div className={cx('signUp-form')}>
                <img src={logoGif} alt="logo" className={cx('logoGif')} />
                <h1 className={cx('greeting')}>¡Encantado de conocerte!</h1>
                <h4>Crea tu cuenta gratis.</h4>
                <form onSubmit={handleSubmit} id="form">
                    <div className={cx('form-container')}>
                        <div className={cx('form-group')}>
                            <div className={cx('form-control')}>
                                <input
                                    id="username"
                                    placeholder="Nombre de usuario"
                                    className={cx('signUp-input', 'separator')}
                                    type="text"
                                    onChange={(e) => {
                                        setUserName(e.target.value);
                                    }}
                                />
                                <div />
                            </div>
                            <div className={cx('form-control')}>
                                <input
                                    required
                                    id="email"
                                    placeholder="Correo electrónico"
                                    className={cx('signUp-input', 'separator')}
                                    type="email"
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                    }}
                                />
                                <div />
                            </div>
                            <div className={cx('form-control')}>
                                <input
                                    required
                                    id="password"
                                    placeholder="Contraseña"
                                    className={cx('signUp-input')}
                                    type={isHidden ? 'password' : 'text'}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                    }}
                                />
                                <div />
                                <img
                                    src={isHidden ? eye2 : eye1}
                                    alt="eye icon"
                                    className={cx('hidden-eye')}
                                    onClick={() => setHidden(!isHidden)}
                                />
                            </div>
                        </div>
                        <p className={cx('privacy')}>
                            Al registrarte aceptas nuestra <br />
                            <span className={cx('accent')}>Política de Privacidad y Términos del Servicio</span>
                        </p>
                        <Button disabled={authLoadingStatus} type="rounded" className={cx('signUp-btn')}>
                            Registrarme
                        </Button>
                        <div className={cx('login-option')}>
                            <p>¿Ya tienes cuenta?</p>
                            <p className={cx('accent')} onClick={changePage}>
                                Iniciar sesión
                            </p>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

SignUp.propsType = {
    onClose: PropsType.func.isRequired,
    changePage: PropsType.func.isRequired,
};
export default SignUp;
