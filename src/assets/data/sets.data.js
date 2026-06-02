import {
    cafeThumb,
    forestThumb,
    summerThumb,
    vanThumb,
    oceanThumb,
    chillVibes,
    lofi_desk,
    cottage,
    bookCafe,
    kyoto,
    dreamingScene,
    honoluluPW,
    greenHousePW,
    seoulPW,
    trainPW,
} from '~/assets/thumbnails';

import { scenes } from './scenes.data';

export const sets = [
    {
        _id: 'seoul',
        thumbnail: seoulPW,
        name: 'Seoul',
        scenes: [scenes.seoulOutside, scenes.seoulInside],
        effects: ['keyboard', 'city', 'rain_street'],
        premium: false,
    },
    // {
    //     _id: 'train_journey',
    //     thumbnail: trainPW,
    //     name: 'Train Journey',
    //     scenes: [scenes.trainJourneyCity, scenes.trainJourneyCountry],
    //     effects: ['train_rain', 'train_noise', 'keyboard'],
    //     premium: false,
    // },
    {
        _id: 'green_house',
        thumbnail: greenHousePW,
        name: 'Green House',
        scenes: [scenes.greenHouse],
        effects: ['rain_forest', 'river', 'birds'],
        premium: true,
    },
    {
        _id: 'book_cafe',
        thumbnail: bookCafe,
        name: 'Book Cafe',
        scenes: [scenes.bookCafeOut, scenes.bookCafeIn],
        effects: ['city', 'rain_street', 'keyboard'],
        premium: true,
    },

    {
        _id: 'dreaming',
        thumbnail: dreamingScene,
        name: 'Am I Dreaming?',
        scenes: [scenes.space, scenes.underwater],
        effects: ['keyboard', 'space', 'underwater'],
        premium: true,
    },
    {
        _id: 'kyoto',
        thumbnail: kyoto,
        name: 'Kyoto',
        scenes: [scenes.kyotoStreet, scenes.kyotoPark],
        effects: ['city', 'birds', 'river'],
        premium: true,
    },
    {
        _id: 'honolulu',
        thumbnail: honoluluPW,
        name: 'Honolulu',
        scenes: [scenes.honoluluIn, scenes.honoluluOut],
        effects: ['keyboard', 'storm', 'ocean'],
        premium: true,
    },
    {
        _id: 'chill_vibes',
        thumbnail: chillVibes,
        name: 'Chill Vibes',
        scenes: [scenes.lrBedRoom, scenes.lrLivingRoom],
        effects: ['city', 'rain_street', 'fireplace'],
        premium: true,
    },
    {
        _id: 'cottage',
        thumbnail: cottage,
        premium: true,
        name: 'Northern Lights',
        scenes: [scenes.cottageIn, scenes.cottageOut],
        effects: ['snow', 'keyboard', 'fireplace'],
    },
    {
        _id: 'desk_lofi',
        thumbnail: lofi_desk,
        name: 'Lofi Desk',
        scenes: [scenes.deskCity, scenes.deskBeach, scenes.deskSnow],
        effects: ['city', 'waves', 'snow'],
        premium: true,
    },
    {
        _id: 'forest_house',
        thumbnail: forestThumb,
        name: 'Forest House',
        scenes: [scenes.forestInside, scenes.forestOutside],
        effects: ['rain_forest', 'birds', 'river'],
        premium: true,
    },
    {
        _id: 'ocean_tale',
        thumbnail: oceanThumb,
        name: 'Ocean Tales',
        scenes: [scenes.oceanInside, scenes.oceanOutside],
        effects: ['ocean', 'wind', 'storm'],
        premium: true,
    },
    {
        _id: 'lofi_cafe',
        thumbnail: cafeThumb,
        name: 'Lofi cafè',
        scenes: [scenes.cafeInside, scenes.cafeOutside],
        effects: ['city', 'rain_street', 'people'],
        premium: true,
    },
    {
        _id: 'van_life',
        thumbnail: vanThumb,
        name: 'Van Life',
        scenes: [scenes.vanInside, scenes.vanOutside],
        effects: ['fire', 'forest', 'rain_forest'],
        premium: true,
    },

    {
        _id: 'summer_days',
        thumbnail: summerThumb,
        name: 'Summer Days',
        scenes: [scenes.summerInside, scenes.summerOutside],
        effects: ['storm', 'fan', 'waves'],
        premium: true,
    },
];

// Snapshot del catálogo original (al cargar el módulo, antes de hidratar) para
// que el admin pueda "importar el catálogo actual" y sembrar la DB.
export const staticSets = JSON.parse(JSON.stringify(sets));

// Mapea un set del catálogo de la API a la forma que consume el player.
const mapApiSet = (s) => ({
    _id: s._id ?? s.slug,
    id: s.id,
    name: s.name,
    thumbnail: s.thumbnail,
    effects: Array.isArray(s.effects) ? s.effects : [],
    premium: !!s.premium,
    scenes: (Array.isArray(s.scenes) ? s.scenes : []).map((sc) => ({
        sceneKey: sc.sceneKey,
        thumbnail: sc.thumbnail,
        wallpaper: sc.wallpaper,
        variants: sc.variants ?? {},
        actions: Array.isArray(sc.actions) ? sc.actions : [],
    })),
});

// Combina el catálogo estático con el de la API (mutación in-place para
// preservar la referencia del array que el store y los componentes importan).
// Regla: un set estático se sigue mostrando salvo que su slug esté gestionado
// en la DB (managedSlugs) — ahí manda la DB (publicar/ocultar). Los sets de la
// DB no estáticos se agregan al final. Si la DB está vacía, queda lo estático.
export function hydrateSets(apiSets, managedSlugs = []) {
    if (!Array.isArray(apiSets)) return false;
    const mapped = apiSets.map(mapApiSet).filter((s) => s.scenes.length > 0);
    const managed = new Set(managedSlugs || []);
    if (!mapped.length && managed.size === 0) return false; // DB vacío → catálogo estático intacto

    const base = JSON.parse(JSON.stringify(staticSets)).filter((s) => !managed.has(s._id));
    sets.length = 0;
    sets.push(...base, ...mapped);
    return true;
}
