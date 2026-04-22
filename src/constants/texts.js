import { profileIcon, feedback, infos, infoIcon, settingIcon, price } from '~/assets/icons';

export const Titles = [
    {
        title1: 'Tu espacio digital tranquilo para estudiar,',
        title2: '',
        msg: '¡Bienvenido a lofi.co. Te mostramos cómo va!',
    },
    {
        title1: 'La playlist perfecta',
        title2: 'con un solo clic',
        msg: 'Dale al play y entra en la zona al instante. Sin anuncios. Sin letras que distraen.',
        msg2: '3 estaciones para cada estado de ánimo: chill, jazz o relajado.',
    },
    {
        title1: 'Crea tu entorno de concentración',
        title2: '',
        msg: '¿Prefieres terminar en una cafetería o escaparte a la playa? Lofi.co te da ambas con ilustraciones interactivas. ',
        msg2: 'Los usuarios básicos pueden acceder a 2 ilustraciones; los premium tienen acceso exclusivo a una biblioteca creciente de 13+ escenas.',
    },
    {
        title1: 'Elimina las distracciones',
        title2: 'con sonidos agradables',
        msg: 'Tapa hasta al vecino más ruidoso con sonidos de fondo relajantes. Cada ilustración viene con sonidos ajustables como lluvia, olas o pájaros. Algunos cambian incluso la escena visualmente.',
        msg2: 'Los básicos tienen 3 efectos de sonido. Los premium mezclan 20+. ',
    },

    {
        title1: 'Zona de concentración (Premium)',
        msg: '¿Deadline cerca? La Zona de Concentración reúne las mejores herramientas en un solo sitio — lejos del móvil que distrae.',
        msg2: '- Temporizador Pomodoro: haz más en menos tiempo (sin quemarte)<br/>- Bloc de notas: que no se te escape ninguna idea<br/>- Registro de tiempo: mide tu progreso<br/>- Lista de tareas: siempre sabes qué sigue',
    },
];

export const ABOUT_US = {
    about1: 'Como (en su mayoría) estudiantes, sabemos lo difícil que es sentarte en la mesa y concentrarte. Sobre todo cuando tienes que configurar la música, el timer y las notas desde tres apps distintas mientras te bombardean con anuncios de otra herramienta de productividad. Creamos lofi.co para arreglar eso y por fin tener un espacio digital personal y tranquilo para trabajar, estudiar o desconectar. Con una biblioteca creciente de 20+ ilustraciones interactivas originales, 15+ sonidos ambientales relajantes y herramientas potentes pero fáciles de usar, estamos construyendo la plataforma de referencia para quien trabaja frente al ordenador — con el objetivo de hacer la productividad menos estresante.',

    about2: '¡Mejoramos constantemente. Síguenos en redes sociales para no perderte nada!',
};

export const MENU_ITEMS = [
    {
        id: 0,
        title: 'Ajustes de usuario',
        icon: profileIcon,
        modal: 'Profile',
    },
    {
        id: 1,
        title: 'Iniciar sesión / Registrarme',
        icon: profileIcon,
    },
    {
        id: 2,
        title: 'Ajustes generales',
        icon: settingIcon,
    },
    // {
    //     id: 3,
    //     title: 'Contáctanos',
    //     icon: contactIcon,
    //     // to: '/contact',
    // },
    {
        id: 4,
        title: 'Cómo funciona',
        icon: infos,
        modal: 'Tutorial',
    },
    // {
    //     id: 5,
    //     title: 'FAQ',
    //     icon: faqIcon,
    //     // to: '/faq',
    // },
    {
        id: 6,
        title: 'Precios',
        icon: price,
        modal: 'Pricing',
    },
    {
        id: 7,
        title: 'Sobre nosotros',
        icon: infoIcon,
        modal: 'AboutUs',
    },
    {
        id: 8,
        title: 'Enviar comentarios',
        icon: feedback,
        action: () => window.open('https://airtable.com/shrDWZLVdKhXg4uiA', '__bank'),
    },
];

export const TEMPLATES = {
    chill: {
        _id: 'chill',
        level: 0.4,
        name: 'chill',
        sceneIndex: 1,
        mood: 'chill',
        setId: 'forest_house',
        effects: [
            { level: 0.3, type: 'river' },
            { level: 0.3, type: 'birds' },
        ],
    },
    sleep: {
        _id: 'sleep',
        level: 0.4,
        name: 'sleep',
        sceneIndex: 0,
        mood: 'sleepy',
        setId: 'van_life',

        effects: [
            { level: 0.3, type: 'forest' },
            { level: 0.35, type: 'fire' },
        ],
    },
    focus: {
        _id: 'focus',
        level: 0.4,
        name: 'focus',
        sceneIndex: 0,
        mood: 'chill',
        setId: 'lofi_cafe',
        effects: [
            { level: 0.35, type: 'rain_street' },
            { level: 0.3, type: 'city' },
        ],
    },
};
