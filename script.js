'use strict';

// prettier-ignore

// Set all variables
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const allMarkerClose = document.querySelector('.markers__close');
const singleMarkerClose = document.querySelector('.workout__close__button');
let map, mapEvent;

// Workout Parent class
class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  // Creates description based on given Workout Data for use in Sidebar + Popup
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase() + this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  _click() {
    this.clicks++;
  }
}

// Child classes of Workout class
// Running class
class Running extends Workout {
  type = 'running';
  workoutName = 'Running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    this.pace = this.duration / this.distance; // min/km
  }
}

// Cycling class
class Cycling extends Workout {
  type = 'cycling';
  workoutName = 'Cycling';
  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this.elevation = elevation;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60); // km/h
  }
}

////////////////////////////
// APPLICATION ARCHITECTURE
class App {
  #map;
  #mapEvent;
  #workouts = [];

  constructor() {
    // Get users position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    allMarkerClose.addEventListener('click', this._reset.bind(this));
    containerWorkouts.addEventListener(
      'click',
      this._removeSingleWorkout.bind(this)
    );
  }

  // Browser attains user location
  _getPosition() {
    // Gets position from Browser info, if not available returns ERROR
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert(`Could not get your position`);
        }
      );
  }

  // Map is loaded and shows current user position
  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, 10);

    // Map style
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map, executes showForm function on click
    this.#map.on('click', this._showForm.bind(this));

    // Render workout markers on load
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  // Logic to show input fields for adding workout information
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  // Hiding form after submission
  _hideForm() {
    // Clearing input fields after submission
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    // Ensuring cursor focus always returns to Distance Input

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
    inputDistance.focus();
  }

  // Toggling Elevation/Cadence input field corresponding to user desired input
  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  // Creating new workout from user input + Closing form
  _newWorkout(e) {
    const validInput = (...inputs) => inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    e.preventDefault();

    // Get Data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // Running activity? Create running workout
    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (
        !validInput(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Input has to be a positive number');
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // Cycling  activiity? Create cycling activity
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInput(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Input has to be a positive number');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Render workout as marker
    this._renderWorkoutMarker(workout);

    // Hide form + Clear input fields
    this._hideForm();

    // Set local storage to all Workouts
    this._setLocalStorage();
  }

  // Placing marker on map after creation of workout
  _renderWorkoutMarker(workout) {
    // Adding marker
    L.marker(workout.coords, {
      riseOnHover: true,
    })
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          closeOnClick: false,
          autoClose: false,
          className: `${workout.type}-popup`,
          closeButton: true,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂' : '🚴‍♀️'}${workout.description}`
      )
      .openPopup();
  }

  // Placing workout from _newWorkout() into sidebar
  _renderWorkout(workout) {
    // Common data
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
     <button type="button" class="workout__close__button">&#10006;</button>
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
    // Type dependent data
    html += `
      <div class="workout__details">
         <span class="workout__icon">⚡️</span>
         <span class="workout__value">${
           workout.type === 'running'
             ? workout.pace.toFixed(1)
             : workout.speed.toFixed(1)
         }</span>
         <span class="workout__unit">${
           workout.type === 'running' ? 'min/km' : 'KM/H'
         }</span>
       </div>
       <div class="workout__details">
         <span class="workout__icon">${
           workout.type === 'running' ? '🦶🏼' : '⛰'
         }</span>
         <span class="workout__value">${
           workout.type === 'running' ? workout.cadence : workout.elevation
         }</span>
         <span class="workout__unit">${
           workout.type === 'running' ? 'spm' : 'm'
         }</span>
       </div>
      </li>`;
    form.insertAdjacentHTML('afterend', html);
  }

  // Map pans to marker location of selected workout in sidebar
  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.flyTo(workout.coords, 13, {
      duration: 1.5,
    });
  }

  // All created workouts are stored in the local storage for later access
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  // All workouts are retrieved from local storage to show on map
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;
    this.#workouts = data;
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  // ALl workouts are removed from local storage
  _reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }

  // Single workout is removed from form
  _removeSingleWorkout(e) {
    // Check if the clicked element has the 'workout__close__button' class.
    if (e.target.classList.contains('workout__close__button')) {
      const workoutItem = e.target.closest('.workout');
      if (workoutItem) {
        const workoutId = workoutItem.dataset.id;
        workoutItem.remove();
        this._removeWorkoutFromLocalStorage(workoutId);
        this._removeSingleMarker(workoutId);
      }
    }
  }

  // Workout is removed from local storage and map
  _removeWorkoutFromLocalStorage(workoutId) {
    const workouts = JSON.parse(localStorage.getItem('workouts')) || [];

    const updatedWorkouts = workouts.filter(
      workout => workout.id !== workoutId
    );

    localStorage.setItem('workouts', JSON.stringify(updatedWorkouts));
    location.reload();
  }
}

const app = new App();
