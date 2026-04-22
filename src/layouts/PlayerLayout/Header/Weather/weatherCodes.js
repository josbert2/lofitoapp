// Open-Meteo WMO weather codes → emoji + Spanish description
const ICONS = {
    clearDay: '☀️',
    clearNight: '🌙',
    mostlySunny: '🌤️',
    mostlySunnyNight: '🌙',
    partlyCloudy: '⛅',
    partlyCloudyNight: '☁️',
    cloudy: '☁️',
    fog: '🌫️',
    drizzle: '🌦️',
    freezingDrizzle: '🌧️',
    rain: '🌧️',
    freezingRain: '🌧️',
    snow: '🌨️',
    hail: '🌨️',
    showers: '🌦️',
    snowShowers: '🌨️',
    thunder: '⛈️',
    thunderHail: '⛈️',
};

export function weatherInfo(code, isDay) {
    const day = isDay === undefined ? true : !!isDay;
    switch (code) {
        case 0:
            return { icon: day ? ICONS.clearDay : ICONS.clearNight, label: day ? 'Soleado' : 'Despejado' };
        case 1:
            return {
                icon: day ? ICONS.mostlySunny : ICONS.mostlySunnyNight,
                label: 'Mayormente despejado',
            };
        case 2:
            return {
                icon: day ? ICONS.partlyCloudy : ICONS.partlyCloudyNight,
                label: 'Parcialmente nublado',
            };
        case 3:
            return { icon: ICONS.cloudy, label: 'Nublado' };
        case 45:
        case 48:
            return { icon: ICONS.fog, label: 'Niebla' };
        case 51:
        case 53:
        case 55:
            return { icon: ICONS.drizzle, label: 'Llovizna' };
        case 56:
        case 57:
            return { icon: ICONS.freezingDrizzle, label: 'Llovizna helada' };
        case 61:
        case 63:
        case 65:
            return { icon: ICONS.rain, label: 'Lluvia' };
        case 66:
        case 67:
            return { icon: ICONS.freezingRain, label: 'Lluvia helada' };
        case 71:
        case 73:
        case 75:
            return { icon: ICONS.snow, label: 'Nieve' };
        case 77:
            return { icon: ICONS.hail, label: 'Granizo' };
        case 80:
        case 81:
        case 82:
            return { icon: ICONS.showers, label: 'Chubascos' };
        case 85:
        case 86:
            return { icon: ICONS.snowShowers, label: 'Chubascos de nieve' };
        case 95:
            return { icon: ICONS.thunder, label: 'Tormenta' };
        case 96:
        case 99:
            return { icon: ICONS.thunderHail, label: 'Tormenta con granizo' };
        default:
            return { icon: day ? ICONS.clearDay : ICONS.clearNight, label: '—' };
    }
}
