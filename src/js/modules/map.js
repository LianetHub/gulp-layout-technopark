export const initYandexMap = () => {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;

    let myMap;

    const getIconParams = () => {
        const width = window.innerWidth;
        let size = [104, 116];

        if (width <= 767) {
            size = [78, 88];
        } else if (width <= 1024) {
            size = [67, 75];
        }

        return {
            size: size,
            offset: [-(size[0] / 2), -size[1]]
        };
    };

    const init = () => {
        const rawCoords = mapContainer.dataset.coords;
        const coords = rawCoords ? rawCoords.split(',').map(item => parseFloat(item.trim())) : [55.8528135688981, 48.842075499999964];

        const zoom = parseInt(mapContainer.dataset.zoom) || 16;
        const iconPath = mapContainer.dataset.icon;

        const iconParams = getIconParams();

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
                iconImageSize: iconParams.size,
                iconImageOffset: iconParams.offset
            });
        }

        const myPlacemark = new ymaps.Placemark(coords, {}, placemarkOptions);

        myMap.geoObjects.add(myPlacemark);
    };

    const loadScript = () => {
        if (typeof ymaps !== 'undefined') {
            ymaps.ready(init);
            return;
        }

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