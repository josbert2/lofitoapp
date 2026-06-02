import React, { useState, createContext, useReducer } from 'react';
import { logger } from '~/utils/logger';
import reducer, { makeInitialState } from './reducer';

export const AppContext = createContext();

function AppProvider({ children }) {
    const [modalType, setModalType] = useState();
    const [menuActive, setMenuActive] = useState();
    // inicializador lazy: corre al montar, cuando el catálogo de la API ya está hidratado
    const [sessionState, sessionDispatch] = useReducer(logger(reducer), undefined, makeInitialState);

    // console.log('-----------provider render------------');
    const value = {
        modalType,
        setModalType,
        menuActive,
        setMenuActive,
        session: [sessionState, sessionDispatch],
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export default AppProvider;
