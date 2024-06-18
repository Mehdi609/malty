'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const btn1 = document.querySelector('.btn1');
const btn2 = document.querySelector('.btn2');

// for (const workout of workouts) {
//   workout.remove();
// }

class App {
  #map;
  #mapEvent;
  #mapZoomLevel = 13;
  #workouts = [];
  #markers = [];
  #sorted = false;
  #mod = true;
  #updateEl;
  constructor() {
    this._getPosition();
    this._getLocalStorage();
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    btn1.addEventListener('click', this.reset);
    btn2.addEventListener(
      'click',
      function () {
        this._sort(this.#sorted);
      }.bind(this)
    );
  }

  _deleteWorkout(e) {
    e.target.closest('.workout').remove();

    const workoutId = e.target.closest('.workout').dataset.id;

    const markerIndice = this.#workouts.findIndex(
      work => workoutId === work.id
    );

    this.#map.removeLayer(this.#markers[markerIndice]);
    this.#markers.splice(markerIndice, 1);
    this.#workouts.splice(markerIndice, 1);
    this._setLocalStorage();
  }

  
  // _updateWorkout() {
  //   this.#updateEl.distance = inputDistance.value;
  //   this.#updateEl.duration = inputDuration.value;
  //   if(this.#updateEl.type = "running"){
  //     this.#updateEl.cadence = inputCadence.value;
  //     this.#updateEl.pace = inputCadence.value;
  //     // console.log(this.#updateEl);
  //     // this.#updateEl.calcPace();
  //   }
  //   if(this.#updateEl.type = "cycling"){
      
  //     this.#updateEl.elevationGain = inputElevation.value;
  //     this.#updateEl.speed = inputElevation.value;
  //     // this.#updateEl.speed();
  //     // [{"id":"5759577056","date":"2024-05-15T07:52:57.056Z","clicks":0,"distance":"1","duration":"1","coords":[33.9926190428354,-6.868858337402345],"type":"cycling","cadence":"1","pace":"1","description":"Running on May 15","elevationGain":"","speed":""}]
  //   }
  //   this._setLocalStorage();
  //   location.reload();
  // }



  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        error => {
          console.log('Error', error);
        }
      );
    }
  }


  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on(
      'click',
      function (mapE) {
        this._showForm(mapE, false);
      }.bind(this)
    );
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE, mod = true) {
    form.classList.remove('hidden');
    inputDistance.focus();
    if (mod === false) {
      this.#mapEvent = mapE;
      this.#mod = false;
    } else {
      this.#mod = true;
    }
  }
  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }
  _renderWorkoutMarker(workout) {
    const mark = new L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxwidth: 250,
          minWidth: 150,
          autoClose: false,
          closeOnClick: false,
          className: ` leaflet-popup ${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
    this.#markers.push(mark);
  }


  _newWorkout(e) {
    e.preventDefault();
    if (this.#mod === true) {
      this._updateWorkout();
      this._hideForm();
      return;
    }

    const inputValid = function (...inputs) {
      return inputs.every(el => {
        return Number.isFinite(el);
      });
    };
    const allPositive = function (...inputs) {
      return inputs.every(el => {
        return el > 0;
      });
    };

    const { lat, lng } = this.#mapEvent.latlng;
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    let workout;
    if (type === 'cycling') {
      const elevationGain = +inputElevation.value;
      if (
        !allPositive(distance, duration) ||
        !inputValid(distance, duration, elevationGain)
      )
        return alert('Please enter a valid number for duration');
      workout = new Cycling(distance, duration, [lat, lng], elevationGain);
      this.#workouts.push(workout);
    }

    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (
        !allPositive(distance, duration, cadence) ||
        !inputValid(distance, duration, cadence)
      ) {
        return alert('Please enter a valid number for duration');
      }
      workout = new Running(distance, duration, [lat, lng], cadence);
      this.#workouts.push(workout);
    }

    this._renderWorkoutMarker(workout);

    this._renderWorkout(workout);

    this._hideForm();

    this._setLocalStorage();
  }
  _sort(sorted = false) {
    const dist = this.#workouts.slice().sort((a, b) => {
      return a.distance - b.distance;
    });
    const workouts = [...document.querySelectorAll('.workout')];
    if (dist.length === 0) return;
    const removed = function () {
      for (const workout of workouts) {
        workout.remove();
      }
    };
    if (!sorted) {
      removed();
      dist.forEach(d => this._renderWorkout(d));
      this.#sorted = true;
    } else {
      removed();
      this.#workouts.forEach(d => this._renderWorkout(d));
      this.#sorted = false;
    }
  }

  _hideForm() {
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        '';
  }
  _renderWorkout(workout) {
    let html = `<li class="workout workout--${workout.type}" data-id="${
      workout.id
    }" >
                <h2 class="workout__title">${workout.description}</h2>
                <div class="UD" style="display: flex; gap: 1rem; grid-column: -2/-1;">
                  <span class="workout__icon mod"><img src="modifier.png" width="30px"></span>
                  <span class="workout__icon del"><img src="supprimer.png" width="30px"></span>
                </div>
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
    if (workout.type === 'running') {
      html += `
      <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
          </li>`;
    }
    if (workout.type === 'cycling') {
      html += `
      <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>`;
    }
    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    // if (e.target.closest('.del') || e.target.closest('.mod')) return;

    const workoutEl = e.target.closest('.workout');
    if (e.target.closest('.del')) {
      this._deleteWorkout(e);
      return;
    }
    if (e.target.closest('.mod')) {
      this.#updateEl = this.#workouts.find(work => workoutEl.dataset.id === work.id);
      this._showForm();
      return;
    }

    if (!workoutEl) return;
    // function workoutFun() {
      
    //   return this.#workouts.find(work => workoutEl.dataset.id === work.id);
    // }
    const workout = this.#workouts.find(work => workoutEl.dataset.id === work.id);
    this.#map.setView(workout.coords, this.#mapZoomLevel);
    // workout.click()
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;
    this.#workouts = data;
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();

class Workout {
  id = (Date.now() + '').slice(-10);
  date = new Date();
  clicks = 0;
  constructor(distance, duration, coords) {
    this.distance = distance;
    this.duration = duration;
    this.coords = coords;
  }
  _setDescription() {
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(distance, duration, coords, cadence) {
    super(distance, duration, coords);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
const run = new Running(1,1,[1,1],1);
console.log(run);

class Cycling extends Workout {
  type = 'cycling';
  constructor(distance, duration, coords, elevationGain) {
    super(distance, duration, coords);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    this.speed = (this.distance * 60) / this.duration;
    return this.speed;
  }
}



// arr
