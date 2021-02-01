///
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const numberAlert = document.querySelector('.alert');

//MAP ICONS

const icons = {
  Black: L.icon({
    iconUrl: '/black-pin-icon.jpg',
    iconSize: [38, 54],
    iconAnchor: [20, 53.5],
    popupAnchor: [-3, -50],
  }),
  Current: L.icon({
    iconUrl: '/red-pin-icon.jpg',
    iconSize: [38, 54],
    iconAnchor: [20, 53.5],
    popupAnchor: [-3, -50],
  }),
  cycling: L.icon({
    iconUrl: '/blue-pin-icon.jpg',
    iconSize: [38, 54],
    iconAnchor: [20, 53.5],
    popupAnchor: [-3, -50],
  }),
  running: L.icon({
    iconUrl: '/yellow-pin-icon.jpg',
    iconSize: [38, 54],
    iconAnchor: [20, 53.5],
    popupAnchor: [-3, -50],
  }),
};

////Class workout

class Workout {
  date = new Date();

  id = (Date.now() + '').slice(-10);
  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(
      1
    )} on ${this.date.toLocaleString('deafult', {
      month: 'long',
    })} ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    // min/km
    this.pace = Number((this.duration / this.distance).toFixed(1));
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    //km/h
    this.speed = Number(((this.distance * 60) / this.duration).toFixed(1));
  }
}

///
//Class App

class App {
  #map;
  #crrCoords;
  #coords;
  #marker;
  #workouts = [];
  #mapZoomLevel = 13;
  constructor() {
    this._getPosition();

    //Get data from local storage
    this._getLocalStorage();

    //add app object with bind when it calls its callback function
    form.addEventListener('submit', this._newWorkout.bind(this));

    //when runnin or cycling input changes show proper field: Elevation for cyling, cadence for running
    inputType.addEventListener('change', this._toogleElevationField);

    //rendering workout clicks
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

    document
      .querySelector('.btn')
      .addEventListener('click', this._btnCurrentLocation.bind(this));
  }

  //navigator.geolocation.getCurrentposition calls _loadMap as a callback function with argument positon. also we need to bind caller object to be able reach private properties of class app too
  _btnCurrentLocation() {
    //getposition kullansan realtime ve daha gerçekçi olurdu
    this._popupper(this.#crrCoords);
    this.#map.setView(this.#crrCoords, this.#mapZoomLevel, {
      animate: true,
      pan: { duration: 1 },
    });
  }
  _clearInputs() {
    inputCadence.value = inputDistance.value = inputDuration.value = inputElevation.value =
      '';
  }
  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position.');
        }
      );
  }

  _loadMap(position) {
    this.#coords = [position.coords.latitude, position.coords.longitude];
    this.#map = L.map('map').setView(this.#coords, this.#mapZoomLevel);
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png').addTo(
      this.#map
    );
    this.#crrCoords = this.#coords;
    this._showMarker('Current');

    //show prestored workouts's markers
    this.#workouts.forEach(workout => {
      this.#coords = workout.coords;
      this._showMarker(workout);
    });

    //close all popups and open current locations' popup
    this._popupper(this.#crrCoords);

    //map click event
    this.#map.on('click', this._showForm.bind(this));
  }

  //show marker function
  _showMarker(workout = '') {
    if (this.#marker) this.#map.removeLayer(this.#marker);
    //if (!this.#coords) this.#coords = workout.coords;
    if (workout) {
      L.marker(this.#coords, {
        icon: icons[workout !== 'Current' ? workout.type : workout],
      })
        .addTo(this.#map)
        .bindPopup(
          L.popup({
            maxWidth: 250,
            minWidth: 100,
            autoClose: false,
            //closeOnClick: false,
            className: workout !== 'Current' ? `${workout.type}-popup` : '',
          })
        )
        .setPopupContent(
          workout === 'Current'
            ? 'You are here.'
            : (workout.type === 'running' ? '🏃‍♂️ ' : '🚴‍♀️ ') + workout.description
        )
        .openPopup();
    } else {
      //if (this.#marker) this.#map.removeLayer(this.#marker);

      this.#marker = L.marker(this.#coords);
      this.#marker.addTo(this.#map);
    }
  }

  _showForm(mapE) {
    //mapEvent and coords are set to clicked position
    // this.#mapEvent = mapE;
    this.#coords = [mapE.latlng.lat, mapE.latlng.lng];
    form.classList.remove('hidden');
    inputDistance.focus();
    //show chosen location without popup
    this._showMarker('');
  }

  _toogleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _showAlert() {
    numberAlert.style.color = ' rgb(58, 167, 218)';
    setTimeout(() => (numberAlert.style.color = 'var(--color-dark--1)'), 1500);
  }

  _newWorkout(e) {
    //input validation
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();
    //Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    let workout;

    if (type === 'running') {
      const cadence = +inputCadence.value;
      //guard clause
      //check input validty
      //if running create running object
      //if cycling create cycling object
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        //clear input fields.
        this._clearInputs();
        return this._showAlert();
      }
      workout = new Running(this.#coords, distance, duration, cadence);
    }
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      ) {
        //clear input fields.
        this._clearInputs();
        return this._showAlert();
      }
      workout = new Cycling(this.#coords, distance, duration, elevation);
    }

    //add new object to workout array
    this.#workouts.push(workout);

    // render  workout on map as a marker
    this._showMarker(workout);

    // Render workout on the list
    this._renderWorkouts(workout);
    //clear input fields.
    this._clearInputs();
    //Hide the form
    form.classList.add('hidden');

    //set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkouts(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
    <h2 class="workout__title">${workout.description}</h2>
    <div class="workout__details">
    <span class="workout__icon">${
      workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
    }</span>
    <span class="workout__value">${workout.distance}</span>
    <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
    <span class="workout__icon">⏱</span>
    <span class="workout__value">${workout.duration}</span>
    <span class="workout__unit">min</span>
    </div>
    `;
    if (workout.type === 'running')
      html += `
      <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.pace}</span>
      <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.cadence}</span>
      <span class="workout__unit">spm</span>
      </div>
      </li>
      `;
    if (workout.type === 'cycling')
      html += `
      <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.speed}</span>
      <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${workout.elevationGain}</span>
      <span class="workout__unit">m</span>
      </div>
      </li>
      `;

    //insert created html
    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    //console.log(workoutEl);
    //data id is stored in UI. clicking returns closest workout class. and we get id. with that id we can find on which workout instance we will center the map.

    //guard clause
    if (!workoutEl) return;

    const workout = this.#workouts.find(w => w.id === workoutEl.dataset.id);
    //console.log(workout);
    //open choosen coord's popup close all others
    this._popupper(workout.coords);

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: { duration: 1 },
    });

    //L.marker(workout.coords).tooglePopup();
  }

  //for small amounts of data
  //it is very bad to use, large data slows webapp
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    //dont forget to use locally stored data at initiation. To APP class construtor this issue is added.
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    //console.log(data);

    //Guard clause
    if (!data) return;
    this.#workouts = data;

    //render data
    //all data wont have regular running and cyling object. correct this issue
    this.#workouts.forEach(workout => {
      this._renderWorkouts(workout);
    });
  }
  _popupper(coords) {
    let layer;
    this.#map.eachLayer(l => {
      l.closePopup();
      try {
        if (l._latlng.lat === coords[0] && l._latlng.lng === coords[1])
          layer = l;
      } catch (e) {}
    });
    layer.openPopup();
  }
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}
const layers = [];
//instance of App
const app = new App();
