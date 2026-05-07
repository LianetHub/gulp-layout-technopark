export const initYandexMap = () => {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;

    let myMap;

    const init = () => {
        const rawCoords = mapContainer.dataset.coords;
        const coords = rawCoords ? rawCoords.split(',').map(item => parseFloat(item.trim())) : [55.8528135688981, 48.842075499999964];

        const zoom = parseInt(mapContainer.dataset.zoom) || 16;
        const iconPath = mapContainer.dataset.icon;
        const iconSize = mapContainer.dataset.iconSize ? mapContainer.dataset.iconSize.split(',').map(item => parseInt(item.trim())) : [104, 116];
        const iconOffset = [-(iconSize[0] / 2), -iconSize[1]];

        myMap = new ymaps.Map('map', {
            center: coords,
            zoom: zoom,
            controls: ['zoomControl']
        });

        myMap.behaviors.disable('scrollZoom');

        const placemarkOptions = {};

        if (iconPath) {
            Object.assign(placemarkOptions, {
                iconLayout: 'default#image',
                iconImageHref: iconPath,
                iconImageSize: iconSize,
                iconImageOffset: iconOffset
            });
        }

        const myPlacemark = new ymaps.Placemark(coords, {}, placemarkOptions);

        myMap.geoObjects.add(myPlacemark);
    };

    const loadScript = () => {
        if (typeof ymaps !== 'undefined') return;

        const script = document.createElement('script');
        script.src = 'https://api-maps.yandex.ru/2.1/?apikey=4b85df55-35b1-4c23-8034-e5e8e6e58e52&lang=ru_RU';
        script.type = 'text/javascript';
        script.async = true;
        script.onload = () => {
            ymaps.ready(init);
        };
        document.head.appendChild(script);
    };


    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                loadScript();
                observer.unobserve(entry.target);
            }
        });
    }, {
        rootMargin: '200px'
    });

    observer.observe(mapContainer);
};
