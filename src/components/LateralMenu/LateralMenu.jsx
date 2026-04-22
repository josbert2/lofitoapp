import classNames from 'classnames/bind';
import { ReactSVG } from 'react-svg';
import Tippy from '@tippyjs/react';
import { followCursor } from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/themes/material.css';

import {
    focusIcon,
    menuHistory,
    menuNotesIcon,
    menuPDFIcon,
    menuRounded,
    menuTimerIcon,
    menuYoutubeIcon,
    moodIcon,
    setIcon,
    templateIcon,
} from '~/assets/icons';
import Mixer from './Mixer';
import SceneSelector from './SceneSelector';
import { useStore } from '~/hooks';
import styles from './LateralMenu.module.scss';
import SaveTemplate from './SaveTemplate';
import Notes from './Notes';
import Timer from './Timer';
import Youtube from './Youtube';
import PdfReader from './PdfReader';
import Insights from './Insights';

const cx = classNames.bind(styles);

function LateralMenu() {
    const { menuActive, setMenuActive } = useStore();
    function Tooltip({ children, content = 'tooltips' }) {
        return (
            <div>
                <Tippy
                    interactive
                    placement="left"
                    content={content}
                    theme="lateral"
                    delay={[0, 0]}
                    followCursor={true}
                    plugins={followCursor}
                    hideOnClick={false}
                >
                    {children}
                </Tippy>
            </div>
        );
    }
    const handleSelect = (menu) => {
        menuActive === menu ? setMenuActive(undefined) : setMenuActive(menu);
    };

    const toolSubItems = ['Youtube', 'Timer', 'Notes', 'Pdf', 'Insights'];
    const toolsExpanded = menuActive === 'Tools' || toolSubItems.includes(menuActive);

    return (
        <>
            <div className={cx('wrapper')} id="lateralMenu">
                {/* Show menu item */}
                {menuActive === 'SceneSelector' && <SceneSelector />}
                {menuActive === 'Mixer' && <Mixer />}
                {menuActive === 'Templates' && <SaveTemplate />}
                {menuActive === 'Notes' && <Notes />}
                {menuActive === 'Timer' && <Timer />}
                {menuActive === 'Youtube' && <Youtube />}
                {menuActive === 'Pdf' && <PdfReader />}
                {menuActive === 'Insights' && <Insights />}

                {/* lateral menu */}
                <div className={cx('lateral-menu')}>
                    {menuActive === 'Mixer' && (
                        <img src={menuRounded} alt="menuRounded" className={cx('rounded-top')} />
                    )}
                    <Tooltip content="Mezclador">
                        <div className={cx('menu-item')} onClick={() => handleSelect('Mixer')}>
                            <ReactSVG src={moodIcon} alt="mixer" className={menuActive === 'Mixer' ? cx('svg') : ''} />
                        </div>
                    </Tooltip>
                    <Tooltip content="Plantillas">
                        <div className={cx('menu-item')} onClick={() => handleSelect('Templates')}>
                            <ReactSVG
                                src={templateIcon}
                                alt="templates"
                                className={menuActive === 'Templates' ? cx('svg') : ''}
                            />
                        </div>
                    </Tooltip>
                    <Tooltip content="Escenas">
                        <div className={cx('menu-item')} onClick={() => handleSelect('SceneSelector')}>
                            <ReactSVG
                                src={setIcon}
                                alt="sets"
                                className={menuActive === 'SceneSelector' ? cx('svg') : ''}
                            />
                        </div>
                    </Tooltip>
                    <Tooltip content="Herramientas">
                        <div className={cx('menu-item')} onClick={() => handleSelect('Tools')}>
                            <ReactSVG
                                src={focusIcon}
                                alt="focus"
                                className={toolsExpanded ? cx('svg') : ''}
                            />
                        </div>
                    </Tooltip>
                    {/* study zone */}
                    <div className={cx('study-tools', toolsExpanded ? 'open' : 'closed')}>
                        <div className={cx('divider')}></div>
                        <Tooltip content="Youtube">
                            <div
                                className={cx('menu-item', !toolsExpanded && 'closed')}
                                onClick={() => handleSelect('Youtube')}
                            >
                                <ReactSVG
                                    src={menuYoutubeIcon}
                                    alt="youtube"
                                    className={menuActive === 'Youtube' ? cx('svg') : ''}
                                    style={{ pointerEvents: 'none' }}
                                />
                            </div>
                        </Tooltip>
                        <Tooltip content="Temporizador">
                            <div
                                className={cx('menu-item', !toolsExpanded && 'closed')}
                                onClick={() => handleSelect('Timer')}
                            >
                                <ReactSVG
                                    src={menuTimerIcon}
                                    alt="timer"
                                    className={menuActive === 'Timer' ? cx('svg') : ''}
                                    style={{ pointerEvents: 'none' }}
                                />
                            </div>
                        </Tooltip>
                        <Tooltip content="Notas">
                            <div
                                className={cx('menu-item', !toolsExpanded && 'closed')}
                                onClick={() => handleSelect('Notes')}
                            >
                                <ReactSVG
                                    src={menuNotesIcon}
                                    alt="notes"
                                    className={menuActive === 'Notes' ? cx('svg') : ''}
                                    style={{ pointerEvents: 'none' }}
                                />
                            </div>
                        </Tooltip>
                        <Tooltip content="Lector PDF">
                            <div
                                className={cx('menu-item', !toolsExpanded && 'closed')}
                                onClick={() => handleSelect('Pdf')}
                            >
                                <ReactSVG
                                    src={menuPDFIcon}
                                    alt="pdf"
                                    className={menuActive === 'Pdf' ? cx('svg') : ''}
                                    style={{ pointerEvents: 'none' }}
                                />
                            </div>
                        </Tooltip>
                        <Tooltip content="Estadísticas">
                            <div
                                className={cx('menu-item', !toolsExpanded && 'closed')}
                                onClick={() => handleSelect('Insights')}
                            >
                                <ReactSVG
                                    src={menuHistory}
                                    alt="insights"
                                    className={menuActive === 'Insights' ? cx('svg') : ''}
                                    style={{ pointerEvents: 'none' }}
                                />
                            </div>
                        </Tooltip>
                    </div>
                </div>
            </div>
        </>
    );
}

export default LateralMenu;
