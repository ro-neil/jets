/* Add your Application JavaScript */

// NOTE: //
// STORE FLASH MESSAGE AS JSON.stringify({flash: [message, isSuccess]}) // where isSuccess determines color

function loginNav(){
  document.getElementById('logged-in').classList.remove('d-none');
  document.getElementById('user-menu').classList.remove('d-none');
  document.getElementById('navbar').classList.remove('d-none');
  document.getElementById('navbar').classList.add('d-flex');
  document.getElementsByTagName('body')[0].style.backgroundColor = 'var(--whitespace)';
}

function logoutNav(){
  document.getElementById('logged-in').classList.add('d-none');
  document.getElementById('user-menu').classList.add('d-none');
  document.getElementById('navbar').classList.add('d-none');
  document.getElementById('navbar').classList.remove('d-flex');
  document.getElementsByTagName('body')[0].style.backgroundColor = 'rgba(25, 62, 97,0.1)';
}

function isLoggedIn(){
  return sessionStorage.getItem('jets_token');
}

function flashMessage(obj, success=true) {
  if (obj.flashMessage){
    obj.displayFlash = true;
    obj.isSuccess = success;
    setTimeout(function() { 
      obj.displayFlash = false;
        sessionStorage.removeItem('flash')
    }, 3000);
  }
}

const Register = {
  name: 'Register',
  template: `
    <div class="container registration-page d-flex justify-content-center w-100">
      <div class='d-flex registration-frame pt-3'>
          <section id='register-user-section' class=''>
            <img src="/static/assets/favicon.svg" alt="JETS Logo">
            <span class='jets-name ml-3'>JETS</span>

            <transition name="fade" class="mt-3">
              <div v-if="displayFlash" v-bind:class="[isSuccess ? alertSuccessClass : alertErrorClass]" class="alert">
                  {{ flashMessage }}
              </div>
            </transition>

            <form method="post" @submit.prevent="register_user" id="registrationForm" class="d-flex flex-column">
              <h1 class="sign-in-text mb-4">New User</h1>
              <div class="form-group">
                <label for="username" class="mt-2">Username</label>
                <input type="text" name="username" class='form-control' id='usernameField' required/> 
              </div>
              <div class="form-group ml-5">
                <label for="password" class="mt-3">Password</label>
                <div class='d-flex'>
                  <img src="/static/assets/visibility_off.svg" alt="Visibility Icon" class='mr-2' @click='togglePassword' id='visibility-icon'>
                  <input type="password" name="password" class='form-control' id='password-field' required/>
                </div>
              </div>
              <div class="form-group d-flex align-items-center justify-content-center mt-2">
                <input type="checkbox" name="isAdmin" class='form-control' id='isAdminCheckbox'/>
                <label for="isAdmin" class="" id='adminAccountLbl'>Admin Account</label>
              </div>
              <button type="submit" name="submit-btn" class="btn submit-button py-1 mx-auto mt-3">Submit</button>
            </form>
          </section>
          <section id='app-name-section' class='d-flex justify-content-center'>
            <div class='d-flex flex-column justify-content-center'>
              <div class='login-app-name d-flex justify-content-end'>JamaicaEye</div>
              <div class='login-app-name d-flex justify-content-end'>Ticketing</div>
              <div class='login-app-name d-flex justify-content-end'>System</div>
            </div>
          </section>
      </div>
      
    </div>
  `,
  data(){
    return {
      user_data: '',
      flashMessage: sessionStorage.getItem('flash'),
      displayFlash: false,
      isSuccess: false,
      alertSuccessClass: 'alert-success',
      alertErrorClass: 'alert-danger'
    }
  },
  created() {
    let self = this;
    if (isLoggedIn()){
      if (JSON.parse(sessionStorage.getItem('jets_user')).isAdmin === 'False'){
        let message = 'You are not authorized to register an account.';
        sessionStorage.setItem('flash', message);
        console.log(message);
        this.$router.push('/accountSettings');
      }
    } else {
      this.$router.push('/login');
      let message = 'Sign in as an admin to register an account.';
      sessionStorage.setItem('flash', message);
      console.log(message);
    }
  },
  methods: {
    register_user() {
      const form = document.forms['registrationForm'];
      let form_data = new FormData(form);
      let self = this;
      fetch("/api/register", {
          method: 'POST',
          body: form_data,
          headers: {
              'X-CSRFToken': csrf_token,
              'Authorization': 'Bearer ' + sessionStorage.getItem('jets_token')
          },
          credentials: 'same-origin'
      })
      .then(function (response) {
        if (!response.ok) {
          throw Error(response.statusText);
        }
        return response.json();
      })
      .then(function (jsonResponse) {
        if (jsonResponse['error']){
          self.displayFlash = true;
          self.flashMessage = jsonResponse['error'];
          setTimeout(function() { 
              self.displayFlash = false;
          }, 3000);
        } else {
            self.$router.push('/accountSettings');
            self.user_data = jsonResponse;
            console.log('Username: ' + jsonResponse['username']);
            let flash = ''
            if(jsonResponse['username']){
              flash = `${jsonResponse['username']} was registered`
            } else {
              flash = jsonResponse['message']
            }
            
            sessionStorage.setItem('flash',flash);
            console.log(flash);
        }
          console.log(jsonResponse);
      })
      .catch(function (error) {
          console.log(error);
      });
    },
    togglePassword(){
      let passwordField = document.getElementById("password-field");
      let visibilityIcon = document.getElementById("visibility-icon");
      if (passwordField.type === "password") {
        passwordField.type = "text";
        passwordField.style.letterSpacing = '2px';
        visibilityIcon.src="/static/assets/visibility.svg";
      } else {
        passwordField.type = "password";
        passwordField.style.letterSpacing = '0.35rem';
        visibilityIcon.src="/static/assets/visibility_off.svg";
      }
    }
  }
};

const Login = {
  name: 'Login',
  template: `
    <div class="container login-page d-flex justify-content-center w-100">
      <div class='d-flex login-frame'>
          <section id='sign-in-section' class='p-4'>
            <img src="/static/assets/favicon.svg" alt="JETS Logo">
            <span class='jets-name ml-3'>JETS</span>

            <transition name="fade" class="mt-3">
              <div v-if="displayFlash" v-bind:class="[isSuccess ? alertSuccessClass : alertErrorClass]" class="alert">
                  {{ flashMessage }}
              </div>
            </transition>

            <form method="post" @submit.prevent="login_user" id="loginForm" class="d-flex flex-column">
              <h1 class="sign-in-text mb-4">Sign in</h1>
              <div class="form-group">
                <label for="username" class="mt-2">Username</label>
                <input type="text" name="username" class='form-control' id='usernameField' required/> 
              </div>
              <div class="form-group ml-5">
                <label for="password" class="mt-3">Password</label>
                <div class='d-flex'>
                  <img src="/static/assets/visibility_off.svg" alt="Visibility Icon" class='mr-2' @click='togglePassword' id='visibility-icon'>
                  <input type="password" name="password" class='form-control' id='password-field' required/>
                </div>
              </div>
              <button type="submit" name="submit-btn" class="btn submit-button py-1 mx-auto mt-3">Sign in</button>
            </form>
          </section>
          <section id='app-name-section' class='d-flex justify-content-center'>
            <div class='d-flex flex-column justify-content-center'>
              <div class='login-app-name d-flex justify-content-end'>JamaicaEye</div>
              <div class='login-app-name d-flex justify-content-end'>Ticketing</div>
              <div class='login-app-name d-flex justify-content-end'>System</div>
            </div>
          </section>
      </div>
      
    </div>
  `,
  created(){
    if (isLoggedIn()){
      console.log('You are already logged in.');
      sessionStorage.setItem('flash','You are already logged in')
      this.$router.push('/');
    } else {
      logoutNav();
      flashMessage(this);
    }
  },
  data(){
    return {
      flashMessage: sessionStorage.getItem('flash'),
      displayFlash: false,
      isSuccess: false,
      alertSuccessClass: 'alert-success',
      alertErrorClass: 'alert-danger'
    }
  },
  methods: {
    login_user() {
      let loginForm = document.getElementById('loginForm');
      let form_data = new FormData(loginForm);
      let self = this;
      fetch("/api/auth/login", {
          method: 'POST',
          body: form_data,
          headers: {
              'X-CSRFToken': csrf_token
          },
          credentials: 'same-origin'
      })
      .then(function (response) {
          if (!response.ok) {
            throw Error(response.statusText);
          }
          return response.json();
      })
      .then(function (jsonResponse) {
          if (jsonResponse['token']){
            if (typeof(Storage) !== "undefined") {
              sessionStorage.setItem('jets_token', jsonResponse['token']);
              sessionStorage.setItem('jets_user', JSON.stringify(jsonResponse['user']));
            } else {
              console.log('No Web Storage support..');
            }
            self.$router.push('/flagged');
            setTimeout(function() {
              window.location.reload();
            }, 0);
            sessionStorage.setItem('flash',jsonResponse['message']);
            document.getElementById('username').innerHTML = jsonResponse['user'].name
          } else {
            if(jsonResponse['error']){
              self.displayFlash = true;
              self.flashMessage = jsonResponse['error'];
              setTimeout(function() { 
                self.displayFlash = false;
              }, 3000);
            } 
          }
          console.log(jsonResponse);
      })
      .catch(function (error) {
          console.log(error);
      });
    },
    togglePassword(){
      let passwordField = document.getElementById("password-field");
      let visibilityIcon = document.getElementById("visibility-icon");
      if (passwordField.type === "password") {
        passwordField.type = "text";
        passwordField.style.letterSpacing = '2px';
        visibilityIcon.src="/static/assets/visibility.svg";
      } else {
        passwordField.type = "password";
        passwordField.style.letterSpacing = '0.35rem';
        visibilityIcon.src="/static/assets/visibility_off.svg";
      }
    }
  }
};

const Logout = {
  name: 'Logout',
  template: `
  `,
  created(){
    if (!isLoggedIn()){
      this.$router.push('/login')
      return;
    }
    let self = this;
    fetch("/api/auth/logout", {
      method: 'GET',
      headers: {
          'X-CSRFToken': csrf_token,
          'Authorization': 'Bearer ' + sessionStorage.getItem('jets_token')
      },
      credentials: 'same-origin'
    })
    .then(function (response) {
        if (!response.ok) {
          throw Error(response.statusText);
        }
        return response.json();
    })
    .then(function (jsonResponse) {
        self.$router.push('/login');
        sessionStorage.removeItem('jets_token');
        sessionStorage.removeItem('jets_user');
        sessionStorage.removeItem('flash');
        self.message = jsonResponse['message'];
    })
    .catch(function (error) {
        console.log(error);
    });
  },
  data() {
      return {
        message: ''
      }
  },
  methods: {
  }
};

const Offenders = {
  name: 'Offenders',
  template: `
    <div id="offenders-page-container" class="">
      <transition name="fade" class="mt-5">
          <div v-if="displayFlash" v-bind:class="[isSuccess ? alertSuccessClass : alertErrorClass]" class="alert table-alert">
              {{ flashMessage }}
          </div>
        </transition>
      <div class='controls-container d-flex justify-content-between pt-3'>
        <search-bar></search-bar>
        <div class='buttons d-flex'>
          <simulate-btn @click=fetchImage></simulate-btn>
          <reset-btn @click='resetSimulation' class='ml-4'></reset-btn>
        </div>
      </div>
      <h3 class='mt-3'><b>Traffic Offenders</b></h3>
      <table class="table mt-4" id="offenders-table">
        <caption class="sr-only">List of offenders</caption>
        <thead>
          <tr>
            <th scope="col">Vehicle Owner</th>
            <th scope="col">Date & Time</th>
            <th scope="col">Offence Desc.</th>
            <th scope="col">Registration #</th>
            <th scope="col">Location</th>
          </tr>
        </thead>

        <tbody v-if='tickets.length > 0' id='offenders-table-body'>
          <tr v-for='ticket in tickets' @click="viewTicket(ticket.id)">
            <td>{{ticket.vehicleOwner.fname}} {{ticket.vehicleOwner.lname}}</td>
            <td>{{ticket.incident.date}} {{ticket.incident.time}}</td>
            <td>{{ticket.offence.description}}</td>
            <td>{{ticket.vehicle.licenseplate}}</td>
            <td>{{ticket.location.description}}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- The Modal -->
    <div id="jmodal" class="jmodal align-self-center pb-5">

      <!-- Modal content -->
      <div class="jmodal-content">
        <div class="jmodal-header d-flex justify-content-between align-items-center">
          <h2 class=''>Traffic Cam Image</h2>
          <img src="/static/assets/close.svg" @click=closeModal class="close" alt="Close Icon">
        </div>
        <div class="jmodal-body">
          <img :src="selectedImage" alt="Traffic Cam Image" class='w-100'>
        </div>
        <div class="jmodal-footer d-flex justify-content-end">
          <div class="btn d-flex justify-content-start align-items-center modal-btn" @click="simulateOffender(); closeModal();">
            <img src="/static/assets/send_email.svg" alt="Button Icon">
            <span class="d-inline-block pl-2">Continue</span>
          </div>
        </div>
      </div>

    </div>
    `,
  data() {
      return {
        tickets: [],
        selectedImage: '',
        flashMessage: sessionStorage.getItem('flash'),
        displayFlash: false,
        isSuccess: false,
        alertSuccessClass: 'alert-success',
        alertErrorClass: 'alert-danger'
      }
  },
  created() {
    if (isLoggedIn()){
      loginNav();
      this.$router.push('/issued');
      flashMessage(this);
    } else {
      logoutNav();
      this.$router.push('/login');
    }
    this.fetchOffenders();
  },
  methods: {
    fetchOffenders() {
      let self = this;
      fetch("/api/issued", {
          fetchOffenders: 'GET',
          headers: {
              'X-CSRFToken': csrf_token,
              'Authorization': 'Bearer ' + sessionStorage.getItem('jets_token')
          },
          credentials: 'same-origin'
      })
      .then(function (response) {
        if (!response.ok) {
          throw Error(response.statusText);
        }
        return response.json();
      })
      .then(function (offenceData) {
        console.log(offenceData);
        offenceData.forEach((ticket, index) => {
          if(ticket['status'] === 'IMAGE PROCESSING ERROR' || ticket['status'] === 'NO EMAIL ADDRESS ON FILE' ){
            console.log('PUSH TO NOTIFICATIONS');
            this.$router.push(`/flagged`);
          } else {
            console.log(ticket);
            self.updateTable(ticket);
          }
        })
      })
      .catch(function (error) {
          console.log(error);
      });
    },
    simulateOffender() {
      let self = this;
      let endSimulation = false;
      fetch(`/api/simulate?q=${self.selectedImage}`, {
          method: 'GET',
          headers: {
              'X-CSRFToken': csrf_token,
              'Authorization': 'Bearer ' + sessionStorage.getItem('jets_token')
          },
          credentials: 'same-origin'
      })
      .then(function (response) {
        if (!response.ok) {
          throw Error(response.statusText);
        }
        return response.json();
      })
      .then(function (offenceData) {
        if(offenceData['id'] !== '#'){
          console.log('SIMULATING TRAFFIC OFFENDER');
          let message = '';
          if(offenceData['status'] === 'IMAGE PROCESSING ERROR'){
            message = 'NOTIFICATION: IMAGE PROCESSING ERROR';
            self.$router.push(`/flagged`);
          } else if(offenceData['status'] === 'NO EMAIL ADDRESS ON FILE'){
            message = 'NOTIFICATION: NO EMAIL ADDRESS ON FILE';
            self.$router.push(`/flagged`);
          } else {
              console.log(`TICKET STATUS: ${offenceData['status']}`);
              self.updateTable(offenceData);
              // message = 'A TICKET WAS JUST ISSUED';
              // window.location.reload();
          }
          sessionStorage.setItem('flash', message);
          console.log(offenceData);
          flashMessage(this);
        } else {
          sessionStorage.setItem('flash', 'NO MORE IMAGES TO SERVE');
          window.location.reload();
        }
      })
      .catch(function (error) {
          console.log(error);
      });
    },
    fetchImage(){
      let self = this;
      fetch("/api/snapshot", {
          method: 'GET',
          headers: {
              'X-CSRFToken': csrf_token,
              'Authorization': 'Bearer ' + sessionStorage.getItem('jets_token')
          },
          credentials: 'same-origin'
      })
      .then(function (response) {
        if (!response.ok) {
          throw Error(response.statusText);
        }
        return response.json();
      })
      .then(function (offenceData) {
        if(!offenceData['id']){
          self.selectedImage = offenceData['image'];
          self.openModal();
        } else {
          sessionStorage.setItem('flash', 'NO MORE IMAGES TO SERVE');
          window.location.reload();
          console.log('NO MORE IMAGES TO SERVE')
        }
        
        console.log(self.selectedImage);
      })
      .catch(function (error) {
          console.log(error);
      });
    },
    viewTicket(ticketID){
      this.$router.push(`/issued/${ticketID}`);
    },
    updateTable(offenceData){
      this.tickets.unshift(offenceData);
    },
    resetSimulation(){
      let self = this;
      fetch("/api/resetSimulation", {
          method: 'GET',
          headers: {
              'X-CSRFToken': csrf_token,
              'Authorization': 'Bearer ' + sessionStorage.getItem('jets_token')
          },
          credentials: 'same-origin'
      })
      .then(function (response) {
        if (!response.ok) {
          throw Error(response.statusText);
        }
        return response.json();
      })
      .then(function (status) {
          console.log(status['message']);
          self.$router.push(`/`);
      })
      .catch(function (error) {
          console.log(error);
      });
    },
    openModal(){
        openModal()
    },
    closeModal(){
      closeModal()
    },
    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  }
};

const Notifications = {
  name: 'Notifications',
  template: `
    <div id="notifications-page-container" class="">
      <transition name="fade" class="mt-5">
        <div v-if="displayFlash" v-bind:class="[isSuccess ? alertSuccessClass : alertErrorClass]" class="alert table-alert">
            {{ flashMessage }}
        </div>
      </transition>
      <div class='controls-container d-flex justify-content-between pt-3'>
        <search-bar></search-bar>
        <!--<simulate-btn @click=simulateOffender></simulate-btn>-->
      </div>
      <h3 class='mt-3'><b>Notifications</b></h3>
      <table class="table mt-4" id="notifications-table">
        <caption class="sr-only">Notifications Table</caption>
        <thead>
          <tr>
            <th scope="col">Vehicle Owner</th>
            <th scope="col">Date & Time</th>
            <th scope="col">Offence Desc.</th>
            <th scope="col">Registration #</th>
            <th scope="col">Location</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody v-if='tickets.length > 0' id='notifications-table-body'>
          <tr v-for='ticket in tickets' @click="viewTicket(ticket.id, ticket.status)">
            <td>{{ticket.vehicleOwner.fname}} {{ticket.vehicleOwner.lname}}</td>
            <td>{{ticket.incident.date}} {{ticket.incident.time}}</td>
            <td>{{ticket.offence.description}}</td>
            <td>{{ticket.vehicle.licenseplate}}</td>
            <td>{{ticket.location.description}}</td>
            <td>{{ticket.status}}</td>
          </tr>
        </tbody>
      </table>
    </div>
    `, data() {
      return {
        tickets: [],
        flashMessage: sessionStorage.getItem('flash'),
        displayFlash: false,
        isSuccess: false,
        alertSuccessClass: 'alert-success',
        alertErrorClass: 'alert-danger'
      }
  },
  created() {
    if (isLoggedIn()){
      loginNav()
      this.fetchOffenders();
      this.$router.push('/flagged');
      flashMessage(this);
    }
    else {
      logoutNav();
      this.$router.push('/login');
    }
  },
  methods: {
    fetchOffenders() {
      let self = this;
      fetch("/api/flagged", {
          fetchOffenders: 'GET',
          headers: {
              'X-CSRFToken': csrf_token,
              'Authorization': 'Bearer ' + sessionStorage.getItem('jets_token')
          },
          credentials: 'same-origin'
      })
      .then(function (response) {
        if (!response.ok) {
          throw Error(response.statusText);
        }
        return response.json();
      })
      .then(function (offenceData) {
        console.log(offenceData)  
        offenceData.forEach((ticket, index) => {
          console.log(ticket);
          self.updateTable(ticket);
        })

      })
      .catch(function (error) {
          console.log(error);
      });
    },
    viewTicket(ticketID,status){
      this.$router.push(`/flagged/${ticketID}/${status}`);
    },
    updateTable(offenceData){
      this.tickets.unshift(offenceData);
    }
  }
};

const Archives = {
  name: 'Archives',
  template: `
    <div id="archives-page-container" class="">
      <transition name="fade" class="mt-5">
        <div v-if="displayFlash" v-bind:class="[isSuccess ? alertSuccessClass : alertErrorClass]" class="alert table-alert">
            {{ flashMessage }}
        </div>
      </transition>
      <div class='controls-container d-flex justify-content-between pt-3'>
        <search-bar></search-bar>
      </div>
      <h3 class='mt-3'><b>Archives</b></h3>
      <table class="table mt-4" id="archives-table">
        <caption class="sr-only">Archives</caption>
        <thead>
          <tr>
            <th scope="col">Vehicle Owner</th>
            <th scope="col">Date & Time</th>
            <th scope="col">Offence Desc.</th>
            <th scope="col">Registration #</th>
            <th scope="col">Location</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody v-if='tickets.length > 0' id='archives-table-body'>
          <tr v-for='ticket in tickets' @click="viewTicket(ticket.id, ticket.status)">
            <td>{{ticket.vehicleOwner.fname}} {{ticket.vehicleOwner.lname}}</td>
            <td>{{ticket.incident.date}} {{ticket.incident.time}}</td>
            <td>{{ticket.offence.description}}</td>
            <td>{{ticket.vehicle.licenseplate}}</td>
            <td>{{ticket.location.description}}</td>
            <td>{{ticket.status}}</td>
          </tr>
        </tbody>
      </table>
    </div>
    `, data() {
      return {
        tickets: [],
        flashMessage: sessionStorage.getItem('flash'),
        displayFlash: false,
        isSuccess: false,
        alertSuccessClass: 'alert-success',
        alertErrorClass: 'alert-danger'
      }
  },
  created() {
    if (isLoggedIn()){
      loginNav()
      this.fetchOffenders();
      this.$router.push('/archives');
      flashMessage(this);
    }
    else {
      logoutNav();
      this.$router.push('/login');
    }
  },
  methods: {
    fetchOffenders() {
      let self = this;
      fetch("/api/archives", {
          fetchOffenders: 'GET',
          headers: {
              'X-CSRFToken': csrf_token,
              'Authorization': 'Bearer ' + sessionStorage.getItem('jets_token')
          },
          credentials: 'same-origin'
      })
      .then(function (response) {
        if (!response.ok) {
          throw Error(response.statusText);
        }
        return response.json();
      })
      .then(function (offenceData) {
        console.log(offenceData)  
        offenceData.forEach((ticket, index) => {
          console.log(ticket);
          self.updateTable(ticket);
        })

      })
      .catch(function (error) {
          console.log(error);
      });
    },
    viewTicket(ticketID,status){
      this.$router.push(`/archives/${ticketID}/${status}`);
    },
    updateTable(offenceData){
      this.tickets.unshift(offenceData);
    }
  }
};

const ViewIssued = {
  name: 'ViewIssued',
  template: `
    <div id="ticket-page-container" class="mt-5">
      <transition name="fade" class="mt-5">
        <div v-if="displayFlash" v-bind:class="[isSuccess ? alertSuccessClass : alertErrorClass]" class="alert">
            {{ flashMessage }}
        </div>
      </transition>
      <div class="controls d-flex justify-content-end pt-2">
        <print-btn id='print-btn' class='ml-3' @click=printTicket></print-btn>
      </div>
      <div id='issued-ticket-status' class='status-bar rounded-top mt-5 d-flex align-items-center'>
        <h2 class='mb-0 py-2'>{{ticket.status}}</h2>
      </div>
      <div class="ticket">
        <div class='ticket-header d-flex align-items-center pb-2'>
          <img src="/static/assets/coat_of_arms.png" alt="Coat of Arms" class='rounded'>
          <div class='ticket-header-headings d-flex flex-column'>
            <h1 class='mb-0'>ELECTRONIC TRAFFIC VIOLATION TICKET</h1>
            <h2 class=''>JAMAICA CONSTABULARY FORCE</h2>
          </div>
        </div>
        <section>
          <h3>VEHICLE OWNER INFORMATION</h3>
          <div class='ticket-rows owner'>
            <div class='ticket-row drivers-license'>
              <div class='ticket-field'>
                <h4 class='field-name'>Driver's License Number</h4>
                <p class='field-value'>{{ticket.vehicleOwner.trn}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>Expiration Date</h4>
                <p class='field-value'>{{ticket.vehicleOwner.expdate}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>Type</h4>
                <p class='field-value'>{{ticket.vehicleOwner.licenseType}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>Licensed In</h4>
                <p class='field-value'>{{ticket.vehicleOwner.licensein}}</p>
              </div>
            </div>

            <div class='ticket-row bio'>
              <div class='ticket-field'>
                <h4 class='field-name'>Last Name</h4>
                <p class='field-value'>{{ticket.vehicleOwner.lname}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>First Name</h4>
                <p class='field-value'>{{ticket.vehicleOwner.fname}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>Middle Name</h4>
                <p class='field-value'>{{ticket.vehicleOwner.mname}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>Date of Birth</h4>
                <p class='field-value'>{{ticket.vehicleOwner.dob}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>Gender</h4>
                <p class='field-value'>{{ticket.vehicleOwner.gender}}</p>
              </div>
            </div>

            <div class='ticket-row address'>
              <div class='ticket-field'>
                <h4 class='field-name'>Address</h4>
                <p class='field-value'>{{ticket.vehicleOwner.address}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>Country</h4>
                <p class='field-value'>{{ticket.vehicleOwner.country}}</p>
              </div>
              <div class='ticket-field parish-residence'>
                <h4 class='field-name'>Parish</h4>
                <p class='field-value'>{{ticket.vehicleOwner.parish}}</p>
              </div>
            </div>
          </div>
        </section>
        <section>
          <h3>VEHICLE INFORMATION</h3>
          <div class='ticket-rows'>
            <div class='ticket-row vehicle vehicle-1'>
              <div class='ticket-field'>
                <h4 class='field-name'>Type of Vehicle</h4>
                <p class='field-value'>{{ticket.vehicle.cartype}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>Registration Plate No.</h4>
                <p class='field-value'>{{ticket.vehicle.licenseplate}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>License Disc No.</h4>
                <p class='field-value'>{{ticket.vehicle.licensediscno}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>Expiration Date</h4>
                <p class='field-value'>{{ticket.vehicle.expdate}}</p>
              </div>
            </div>

            <div class='ticket-row vehicle vehicle-2'>
              <div class='ticket-field'>
                <h4 class='field-name'>Year</h4>
                <p class='field-value'>{{ticket.vehicle.year}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>Make</h4>
                <p class='field-value'>{{ticket.vehicle.make}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>Model</h4>
                <p class='field-value'>{{ticket.vehicle.model}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>Colour</h4>
                <p class='field-value'>{{ticket.vehicle.colour}}</p>
              </div>
            </div>
          </div>
        </section>
        <section>
          <h3>OFFENCE INFORMATION</h3>
          <div class='ticket-rows offence'>
            <div class='ticket-row offence-1'>
              <div class='ticket-field'>
                <h4 class='field-name'>Date of Offence</h4>
                <p class='field-value'>{{ticket.incident.date}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>Time of Offence</h4>
                <p class='field-value'>{{ticket.incident.time}}</p>
              </div>
              <div class='ticket-field parish-offence'>
                <h4 class='field-name'>Parish of Offence</h4>
                <p class='field-value'>{{ticket.location.parish}}</p>
              </div>
            </div>

            <div class='ticket-row offence-2'>
              <div class='ticket-field offence-location'>
                <h4 class='field-name'>Location of Offence</h4>
                <p class='field-value'>{{ticket.location.description}}</p>
              </div>
              <div class='ticket-field offence-desc'>
                <h4 class='field-name'>Description of Offence</h4>
                <p class='field-value'>{{ticket.offence.description}}</p>
              </div>
            </div>

            <div class='ticket-row tax-auth'>
              <div class='ticket-field'>
                <h4 class='field-name'>Fine</h4>
                <p class='field-value'>&#36{{ticket.offence.fine}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>Points Assigned</h4>
                <p class='field-value'>{{ticket.offence.points}}</p>
              </div>
              <div class='ticket-field payment-deadline'>
                <h4 class='field-name'>Payment Deadline</h4>
                <p class='field-value'>{{ticket.paymentDeadline}}</p>
              </div>
            </div>
          </div>
        </section>
        <section>
          <h3>TRAFFIC CAM SNAPSHOT</h3>
          <div id='snapshot-container'>
            <img :src="ticket.incident.image" alt='offender snapshot' class=''/>
          </div>
          <div class='ticket-row official-use'>
            <div class='ticket-field'>
              <h4 class='field-name'>Traffic Ticket No.</h4>
              <p class='field-value'>{{ticket.id}}</p>
            </div>
            <div class='ticket-field'>
              <h4 class='field-name'>Date of Issue</h4>
              <p class='field-value'>{{ticket.dateIssued}}</p>
            </div>
            <div class='ticket-field'>
              <h4 class='field-name'>Status</h4>
              <p class='field-value'>{{ticket.status}}</p>
            </div>
          </div>
        </section>
      </div>

    </div>
  `,
  data() {
    return {
      ticket: {
        'vehicleOwner': '',
        'vehicle': '',
        'offence': '',
        'incident': '',
        'location': '',
        'status': '',
        'dateIssued': '',
        'id': ''
      },
      user: sessionStorage.getItem('jets_user'),
      flashMessage: sessionStorage.getItem('flash'),
      displayFlash: false,
      isSuccess: false,
      alertSuccessClass: 'alert-success',
      alertErrorClass: 'alert-danger'
    }
  },
  created(){
    if (!isLoggedIn()){
      //this.$router.push('/login');
      logoutNav();
      console.log('Viewing as Offender. Should require email confirmation input for security purposes.');
      sessionStorage.setItem('flash', 'You are not signed in, hence viewing as an offender.');
      let self = this;
      self.fetchOffender(self);
      flashMessage(self);
    } else {
    loginNav();
      let self = this;
      self.fetchOffender(self);
      flashMessage(self);
    }
  },
  methods: {
    fetchOffender(self){
      fetch(`/api/issued/${this.$route.params.ticketID}`, {
        method: 'GET',
        headers: {
            'X-CSRFToken': csrf_token,
            'Authorization': 'Bearer ' + sessionStorage.getItem('jets_token')
        },
        credentials: 'same-origin'
      })
      .then(function (response) {
        return response.json();
        })
      .then(function (response) {
        self.ticket = response;
        console.log(response)    
      })
    },
    printTicket(self){
        // Make navbar and footer invisible
        document.getElementById('navbar').classList.add('d-none');
        document.getElementById('navbar').classList.remove('d-flex');
        document.getElementById('footer').classList.add('d-none');
        document.getElementById('print-btn').classList.add('d-none');
        document.getElementById('print-btn').classList.remove('d-flex');
        document.getElementById('issued-ticket-status').classList.add('d-none');
        document.getElementById('issued-ticket-status').classList.remove('d-flex');
        
        window.print()  // Print E-Ticket

        // Make navbar and footer Visible
        document.getElementById('navbar').classList.remove('d-none');
        document.getElementById('navbar').classList.add('d-flex');
        document.getElementById('footer').classList.remove('d-none');
        document.getElementById('print-btn').classList.remove('d-none');
        document.getElementById('print-btn').classList.add('d-flex');
        document.getElementById('issued-ticket-status').classList.remove('d-none');
        document.getElementById('issued-ticket-status').classList.add('d-flex');

    }
  }
};

const ViewFlagged = {
  name: 'ViewFlagged',
  template: `
    <div id="ticket-page-container" class="mt-5">
      <j-modal v-if="ticket.status === 'IMAGE PROCESSING ERROR'" headerTitle='LOCATE VEHICLE INFORMATION' inputLabel='Registration #' icon='search_btn.svg' btnText='Locate' @submit='issueFlagedImageTicket'></j-modal>
      <j-modal v-if="ticket.status === 'NO EMAIL ADDRESS ON FILE'" headerTitle='SET EMAIL ADDRESS' inputLabel='Email Address' icon='send_email.svg' btnText='Send Email' @submit='issueFlagedEmailTicket'></j-modal>
      <transition name="fade" class="mt-5">
        <div v-if="displayFlash" v-bind:class="[isSuccess ? alertSuccessClass : alertErrorClass]" class="alert">
            {{ flashMessage }}
        </div>
      </transition>
      <div class="controls d-flex justify-content-end pt-2">
        <issue-btn @issue_ticket=openModal class='issue-btn'></issue-btn>
        <archive-btn v-if="ticket.status === 'IMAGE PROCESSING ERROR'" @click=archiveTicket class='archive-btn ml-3'></archive-btn>
        <print-btn id='print-btn' class='ml-3' @click=printTicket></print-btn>
      </div>
      <div id='flagged-ticket-status' class='status-bar rounded-top mt-5 d-flex align-items-center'>
        <h2 class='mb-0 py-2'>{{ticket.status}}</h2>
      </div>
      <div class="ticket">
        <div class='ticket-header d-flex align-items-center pb-2'>
          <img src="/static/assets/coat_of_arms.png" alt="Coat of Arms" class='rounded'>
          <div class='ticket-header-headings d-flex flex-column'>
            <h1 class='mb-0'>ELECTRONIC TRAFFIC VIOLATION TICKET</h1>
            <h2 class=''>JAMAICA CONSTABULARY FORCE</h2>
          </div>
        </div>
        <section>
          <h3>VEHICLE OWNER INFORMATION</h3>
          <div class='ticket-rows owner'>
            <div class='ticket-row drivers-license'>
              <div class='ticket-field'>
                <h4 class='field-name'>Driver's License Number</h4>
                <p class='field-value'>{{ticket.vehicleOwner.trn}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>Expiration Date</h4>
                <p class='field-value'>{{ticket.vehicleOwner.expdate}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>Type</h4>
                <p class='field-value'>{{ticket.vehicleOwner.licenseType}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>Licensed In</h4>
                <p class='field-value'>{{ticket.vehicleOwner.licensein}}</p>
              </div>
            </div>

            <div class='ticket-row bio'>
              <div class='ticket-field'>
                <h4 class='field-name'>Last Name</h4>
                <p class='field-value'>{{ticket.vehicleOwner.lname}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>First Name</h4>
                <p class='field-value'>{{ticket.vehicleOwner.fname}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>Middle Name</h4>
                <p class='field-value'>{{ticket.vehicleOwner.mname}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>Date of Birth</h4>
                <p class='field-value'>{{ticket.vehicleOwner.dob}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>Gender</h4>
                <p class='field-value'>{{ticket.vehicleOwner.gender}}</p>
              </div>
            </div>

            <div class='ticket-row address'>
              <div class='ticket-field'>
                <h4 class='field-name'>Address</h4>
                <p class='field-value'>{{ticket.vehicleOwner.address}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>Country</h4>
                <p class='field-value'>{{ticket.vehicleOwner.country}}</p>
              </div>
              <div class='ticket-field parish-residence'>
                <h4 class='field-name'>Parish</h4>
                <p class='field-value'>{{ticket.vehicleOwner.parish}}</p>
              </div>
            </div>
          </div>
        </section>
        <section>
          <h3>VEHICLE INFORMATION</h3>
          <div class='ticket-rows'>
            <div class='ticket-row vehicle vehicle-1'>
              <div class='ticket-field'>
                <h4 class='field-name'>Type of Vehicle</h4>
                <p class='field-value'>{{ticket.vehicle.cartype}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>Registration Plate No.</h4>
                <p class='field-value'>{{ticket.vehicle.licenseplate}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>License Disc No.</h4>
                <p class='field-value'>{{ticket.vehicle.licensediscno}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>Expiration Date</h4>
                <p class='field-value'>{{ticket.vehicle.expdate}}</p>
              </div>
            </div>

            <div class='ticket-row vehicle vehicle-2'>
              <div class='ticket-field'>
                <h4 class='field-name'>Year</h4>
                <p class='field-value'>{{ticket.vehicle.year}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>Make</h4>
                <p class='field-value'>{{ticket.vehicle.make}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>Model</h4>
                <p class='field-value'>{{ticket.vehicle.model}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>Colour</h4>
                <p class='field-value'>{{ticket.vehicle.colour}}</p>
              </div>
            </div>
          </div>
        </section>
        <section>
          <h3>OFFENCE INFORMATION</h3>
          <div class='ticket-rows offence'>
            <div class='ticket-row offence-1'>
              <div class='ticket-field'>
                <h4 class='field-name'>Date of Offence</h4>
                <p class='field-value'>{{ticket.incident.date}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>Time of Offence</h4>
                <p class='field-value'>{{ticket.incident.time}}</p>
              </div>
              <div class='ticket-field parish-offence'>
                <h4 class='field-name'>Parish of Offence</h4>
                <p class='field-value'>{{ticket.location.parish}}</p>
              </div>
            </div>

            <div class='ticket-row offence-2'>
              <div class='ticket-field offence-location'>
                <h4 class='field-name'>Location of Offence</h4>
                <p class='field-value'>{{ticket.location.description}}</p>
              </div>
              <div class='ticket-field offence-desc'>
                <h4 class='field-name'>Description of Offence</h4>
                <p class='field-value'>{{ticket.offence.description}}</p>
              </div>
            </div>

            <div class='ticket-row tax-auth'>
              <div class='ticket-field'>
                <h4 class='field-name'>Fine</h4>
                <p class='field-value'>&#36{{ticket.offence.fine}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>Points Assigned</h4>
                <p class='field-value'>{{ticket.offence.points}}</p>
              </div>
              <div class='ticket-field payment-deadline'>
                <h4 class='field-name'>Payment Deadline</h4>
                <p class='field-value'>{{ticket.paymentDeadline}}</p>
              </div>
            </div>
          </div>
        </section>
        <section>
          <h3>TRAFFIC CAM SNAPSHOT</h3>
          <div id='snapshot-container'>
            <img :src="ticket.incident.image" alt='offender snapshot' class=''/>
          </div>
          <div class='ticket-row official-use'>
            <div class='ticket-field'>
              <h4 class='field-name'>Traffic Ticket No.</h4>
              <p class='field-value'>{{ticket.id}}</p>
            </div>
            <div class='ticket-field'>
              <h4 class='field-name'>Date of Issue</h4>
              <p class='field-value'>{{ticket.dateIssued}}</p>
            </div>
            <div class='ticket-field'>
              <h4 class='field-name'>Status</h4>
              <p class='field-value'>{{ticket.status}}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
  data() {
    return {
      ticket: {
        'vehicleOwner': '',
        'vehicle': '',
        'offence': '',
        'incident': '',
        'location': '',
        'status': '',
        'dateIssued': '',
        'id': ''
      },
      user: sessionStorage.getItem('jets_user'),
      flashMessage: sessionStorage.getItem('flash'),
      displayFlash: false,
      isSuccess: false,
      alertSuccessClass: 'alert-success',
      alertErrorClass: 'alert-danger'
    }
  },
  created(){
    if (!isLoggedIn()){
      this.$router.push('/login');
      return;
    }
    loginNav();
    let self = this;
    self.fetchOffender(self);
    flashMessage(self);
  },
  methods: {
    fetchOffender(self){
      fetch(`/api/flagged/${this.$route.params.ticketID}/${this.$route.params.ticketStatus}`, {
        method: 'GET',
        headers: {
            'X-CSRFToken': csrf_token,
            'Authorization': 'Bearer ' + sessionStorage.getItem('jets_token')
        },
        credentials: 'same-origin'
      })
      .then(function (response) {
        return response.json();
        })
      .then(function (response) {
        self.ticket = response;
        console.log(response)    
      })
    },
    printTicket(self){
        // Make navbar and footer invisible
        document.getElementById('navbar').classList.add('d-none');
        document.getElementById('navbar').classList.remove('d-flex');
        document.getElementById('footer').classList.add('d-none');
        document.getElementById('print-btn').classList.add('d-none');
        document.getElementById('print-btn').classList.remove('d-flex');
        document.getElementById('flagged-ticket-status').classList.add('d-none');
        document.getElementById('flagged-ticket-status').classList.remove('d-flex');
        document.getElementsByClassName('issue-btn')[0].classList.add('d-none');
        document.getElementsByClassName('issue-btn')[0].classList.remove('d-flex');
        document.getElementsByClassName('archive-btn')[0].classList.add('d-none');
        document.getElementsByClassName('archive-btn')[0].classList.remove('d-flex');
        
        window.print()  // Print E-Ticket

        // Make navbar and footer Visible
        document.getElementById('navbar').classList.remove('d-none');
        document.getElementById('navbar').classList.add('d-flex');
        document.getElementById('footer').classList.remove('d-none');
        document.getElementById('print-btn').classList.remove('d-none');
        document.getElementById('print-btn').classList.add('d-flex');
        document.getElementById('flagged-ticket-status').classList.remove('d-none');
        document.getElementById('flagged-ticket-status').classList.add('d-flex');
        document.getElementsByClassName('issue-btn')[0].classList.remove('d-none');
        document.getElementsByClassName('issue-btn')[0].classList.add('d-flex');
        document.getElementsByClassName('archive-btn')[0].classList.remove('d-none');
        document.getElementsByClassName('archive-btn')[0].classList.add('d-flex');
    },
    issueFlagedImageTicket(registrationNumber){
      let self = this;
      console.log(`ISSUING TICKET TO: ${registrationNumber}`)
      fetch(`/api/issue/flaggedImage?registrationNumber=${registrationNumber}&ticketID=${self.ticket['id']}`, {
        method: 'GET',
        headers: {
            'X-CSRFToken': csrf_token,
            'Authorization': 'Bearer ' + sessionStorage.getItem('jets_token')
        },
        credentials: 'same-origin'
      })
      .then(function (response) {
        return response.json();
        })
      .then(function (response) {
        if(response['id'] === '#'){
          let status = 'NO VEHICLE OR VEHICLE OWNER FOUND'
          console.log(status);
          sessionStorage.setItem('flash',status); 
          //this.$router.push(`/flagged/${this.ticket['id']}/IMAGE PROCESSING ERROR`);
          window.history.back();
        } else {
          // IF TICKET WAS SUCCESSFULLY ISSUED
          if(response['status'].search('ISSUED') >= 0){
            console.log(response['status']);  
            self.$router.push(`/issued/${response['id']}`);
            sessionStorage.setItem('flash',response['status']);
          } else {
            console.log(response['status']);
            window.history.back();
            sessionStorage.setItem('flash',response['status']);
          }
        }
        console.log(response)    
      })
    },
    issueFlagedEmailTicket(emailAddress){
      let self = this;
      console.log(`ISSUING TICKET TO: ${emailAddress}`)
      fetch(`/api/issue/flaggedEmail?email=${emailAddress}&ticketID=${self.ticket['id']}`, {
        method: 'GET',
        headers: {
            'X-CSRFToken': csrf_token,
            'Authorization': 'Bearer ' + sessionStorage.getItem('jets_token')
        },
        credentials: 'same-origin'
      })
      .then(function (response) {
        return response.json();
        })
      .then(function (response) {
        if(response['id'] === '#'){
          let status = 'NO VEHICLE OR VEHICLE OWNER FOUND'
          console.log(status);
          sessionStorage.setItem('flash',status); 
          //this.$router.push(`/flagged/${this.ticket['id']}/IMAGE PROCESSING ERROR`);
          window.history.back();
        } else {
          // IF TICKET WAS SUCCESSFULLY ISSUED
          if(response['status'].search('ISSUED') >= 0){
            console.log(response['status']);  
            self.$router.push(`/issued/${response['id']}`);
            sessionStorage.setItem('flash',response['status']);
          } else {
            console.log(response['status']); 
            self.$router.push(`/flagged/${response['id']}/${response['status']}`);
            sessionStorage.setItem('flash',response['status']);
          }
        }
        console.log(response)    
      })
    },
    archiveTicket(){
      let self = this;
      console.log(`ARCHIVING TICKET`)
      fetch(`/api/archives/new?ticketID=${self.ticket['id']}`, {
        method: 'GET',
        headers: {
            'X-CSRFToken': csrf_token,
            'Authorization': 'Bearer ' + sessionStorage.getItem('jets_token')
        },
        credentials: 'same-origin'
      })
      .then(function (response) {
        return response.json();
        })
      .then(function (response) {
        console.log(response) 
        self.$router.push(`/archives/${response['id']}/${response['status']}`);
        sessionStorage.setItem('flash','THIS TICKET HAS BEEN ARCHIVED');   
      })
    },
    openModal(){
        openModal()
    },
    closeModal(){
      closeModal()
    }
  }
};

const ViewArchived = {
  name: 'ViewArchived',
  template: `
    <div id="ticket-page-container" class="mt-5">
      <j-modal v-if="ticket.status === 'IMAGE PROCESSING ERROR'" headerTitle='LOCATE VEHICLE INFORMATION' inputLabel='Registration #' icon='search_btn.svg' btnText='Locate' @submit='issueArchivedTicket'></j-modal>
      <transition name="fade" class="mt-5">
        <div v-if="displayFlash" v-bind:class="[isSuccess ? alertSuccessClass : alertErrorClass]" class="alert">
            {{ flashMessage }}
        </div>
      </transition>
      <div class="controls d-flex justify-content-end pt-2">
        <issue-btn @issue_ticket=openModal class='issue-btn'></issue-btn>
        <print-btn id='print-btn' class='ml-3' @click=printTicket></print-btn>
      </div>
      <div id='flagged-ticket-status' class='status-bar rounded-top mt-5 d-flex align-items-center'>
        <h2 class='mb-0 py-2'>{{ticket.status}}</h2>
      </div>
      <div class="ticket">
        <div class='ticket-header d-flex align-items-center pb-2'>
          <img src="/static/assets/coat_of_arms.png" alt="Coat of Arms" class='rounded'>
          <div class='ticket-header-headings d-flex flex-column'>
            <h1 class='mb-0'>ELECTRONIC TRAFFIC VIOLATION TICKET</h1>
            <h2 class=''>JAMAICA CONSTABULARY FORCE</h2>
          </div>
        </div>
        <section>
          <h3>VEHICLE OWNER INFORMATION</h3>
          <div class='ticket-rows owner'>
            <div class='ticket-row drivers-license'>
              <div class='ticket-field'>
                <h4 class='field-name'>Driver's License Number</h4>
                <p class='field-value'>{{ticket.vehicleOwner.trn}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>Expiration Date</h4>
                <p class='field-value'>{{ticket.vehicleOwner.expdate}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>Type</h4>
                <p class='field-value'>{{ticket.vehicleOwner.licenseType}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>Licensed In</h4>
                <p class='field-value'>{{ticket.vehicleOwner.licensein}}</p>
              </div>
            </div>

            <div class='ticket-row bio'>
              <div class='ticket-field'>
                <h4 class='field-name'>Last Name</h4>
                <p class='field-value'>{{ticket.vehicleOwner.lname}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>First Name</h4>
                <p class='field-value'>{{ticket.vehicleOwner.fname}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>Middle Name</h4>
                <p class='field-value'>{{ticket.vehicleOwner.mname}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>Date of Birth</h4>
                <p class='field-value'>{{ticket.vehicleOwner.dob}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>Gender</h4>
                <p class='field-value'>{{ticket.vehicleOwner.gender}}</p>
              </div>
            </div>

            <div class='ticket-row address'>
              <div class='ticket-field'>
                <h4 class='field-name'>Address</h4>
                <p class='field-value'>{{ticket.vehicleOwner.address}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>Country</h4>
                <p class='field-value'>{{ticket.vehicleOwner.country}}</p>
              </div>
              <div class='ticket-field parish-residence'>
                <h4 class='field-name'>Parish</h4>
                <p class='field-value'>{{ticket.vehicleOwner.parish}}</p>
              </div>
            </div>
          </div>
        </section>
        <section>
          <h3>VEHICLE INFORMATION</h3>
          <div class='ticket-rows'>
            <div class='ticket-row vehicle vehicle-1'>
              <div class='ticket-field'>
                <h4 class='field-name'>Type of Vehicle</h4>
                <p class='field-value'>{{ticket.vehicle.cartype}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>Registration Plate No.</h4>
                <p class='field-value'>{{ticket.vehicle.licenseplate}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>License Disc No.</h4>
                <p class='field-value'>{{ticket.vehicle.licensediscno}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>Expiration Date</h4>
                <p class='field-value'>{{ticket.vehicle.expdate}}</p>
              </div>
            </div>

            <div class='ticket-row vehicle vehicle-2'>
              <div class='ticket-field'>
                <h4 class='field-name'>Year</h4>
                <p class='field-value'>{{ticket.vehicle.year}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>Make</h4>
                <p class='field-value'>{{ticket.vehicle.make}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>Model</h4>
                <p class='field-value'>{{ticket.vehicle.model}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>Colour</h4>
                <p class='field-value'>{{ticket.vehicle.colour}}</p>
              </div>
            </div>
          </div>
        </section>
        <section>
          <h3>OFFENCE INFORMATION</h3>
          <div class='ticket-rows offence'>
            <div class='ticket-row offence-1'>
              <div class='ticket-field'>
                <h4 class='field-name'>Date of Offence</h4>
                <p class='field-value'>{{ticket.incident.date}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>Time of Offence</h4>
                <p class='field-value'>{{ticket.incident.time}}</p>
              </div>
              <div class='ticket-field parish-offence'>
                <h4 class='field-name'>Parish of Offence</h4>
                <p class='field-value'>{{ticket.location.parish}}</p>
              </div>
            </div>

            <div class='ticket-row offence-2'>
              <div class='ticket-field offence-location'>
                <h4 class='field-name'>Location of Offence</h4>
                <p class='field-value'>{{ticket.location.description}}</p>
              </div>
              <div class='ticket-field offence-desc'>
                <h4 class='field-name'>Description of Offence</h4>
                <p class='field-value'>{{ticket.offence.description}}</p>
              </div>
            </div>

            <div class='ticket-row tax-auth'>
              <div class='ticket-field'>
                <h4 class='field-name'>Fine</h4>
                <p class='field-value'>&#36{{ticket.offence.fine}}</p>
              </div>
              <div class='ticket-field'>
                <h4 class='field-name'>Points Assigned</h4>
                <p class='field-value'>{{ticket.offence.points}}</p>
              </div>
              <div class='ticket-field payment-deadline'>
                <h4 class='field-name'>Payment Deadline</h4>
                <p class='field-value'>{{ticket.paymentDeadline}}</p>
              </div>
            </div>
          </div>
        </section>
        <section>
          <h3>TRAFFIC CAM SNAPSHOT</h3>
          <div id='snapshot-container'>
            <img :src="ticket.incident.image" alt='offender snapshot' class=''/>
          </div>
          <div class='ticket-row official-use'>
            <div class='ticket-field'>
              <h4 class='field-name'>Traffic Ticket No.</h4>
              <p class='field-value'>{{ticket.id}}</p>
            </div>
            <div class='ticket-field'>
              <h4 class='field-name'>Date Issued</h4>
              <p class='field-value'>{{ticket.dateIssued}}</p>
            </div>
            <div class='ticket-field'>
              <h4 class='field-name'>Status</h4>
              <p class='field-value'>{{ticket.status}}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
  data() {
    return {
      ticket: {
        'vehicleOwner': '',
        'vehicle': '',
        'offence': '',
        'incident': '',
        'location': '',
        'status': '',
        'dateIssued': '',
        'id': ''
      },
      user: sessionStorage.getItem('jets_user'),
      flashMessage: sessionStorage.getItem('flash'),
      displayFlash: false,
      isSuccess: false,
      alertSuccessClass: 'alert-success',
      alertErrorClass: 'alert-danger'
    }
  },
  created(){
    if (!isLoggedIn()){
      this.$router.push('/login');
      return;
    }
    loginNav();
    let self = this;
    self.fetchOffender(self);
    flashMessage(self);
  },
  methods: {
    fetchOffender(self){
      fetch(`/api/archives/${this.$route.params.ticketID}/${this.$route.params.ticketStatus}`, {
        method: 'GET',
        headers: {
            'X-CSRFToken': csrf_token,
            'Authorization': 'Bearer ' + sessionStorage.getItem('jets_token')
        },
        credentials: 'same-origin'
      })
      .then(function (response) {
        return response.json();
        })
      .then(function (response) {
        self.ticket = response;
        console.log(response)    
      })
    },
    printTicket(self){
        // Make navbar and footer invisible
        document.getElementById('navbar').classList.add('d-none');
        document.getElementById('navbar').classList.remove('d-flex');
        document.getElementById('footer').classList.add('d-none');
        document.getElementById('print-btn').classList.add('d-none');
        document.getElementById('print-btn').classList.remove('d-flex');
        document.getElementById('flagged-ticket-status').classList.add('d-none');
        document.getElementById('flagged-ticket-status').classList.remove('d-flex');
        document.getElementsByClassName('issue-btn')[0].classList.add('d-none');
        document.getElementsByClassName('issue-btn')[0].classList.remove('d-flex');
        document.getElementsByClassName('archive-btn')[0].classList.add('d-none');
        document.getElementsByClassName('archive-btn')[0].classList.remove('d-flex');
        
        window.print()  // Print E-Ticket

        // Make navbar and footer Visible
        document.getElementById('navbar').classList.remove('d-none');
        document.getElementById('navbar').classList.add('d-flex');
        document.getElementById('footer').classList.remove('d-none');
        document.getElementById('print-btn').classList.remove('d-none');
        document.getElementById('print-btn').classList.add('d-flex');
        document.getElementById('flagged-ticket-status').classList.remove('d-none');
        document.getElementById('flagged-ticket-status').classList.add('d-flex');
        document.getElementsByClassName('issue-btn')[0].classList.remove('d-none');
        document.getElementsByClassName('issue-btn')[0].classList.add('d-flex');
        document.getElementsByClassName('archive-btn')[0].classList.remove('d-none');
        document.getElementsByClassName('archive-btn')[0].classList.add('d-flex');
    },
    issueArchivedTicket(registrationNumber){
      let self = this;
      console.log(`ISSUING TICKET TO: ${registrationNumber}`)
      fetch(`/api/issue/archived?registrationNumber=${registrationNumber}&ticketID=${self.ticket['id']}`, {
        method: 'GET',
        headers: {
            'X-CSRFToken': csrf_token,
            'Authorization': 'Bearer ' + sessionStorage.getItem('jets_token')
        },
        credentials: 'same-origin'
      })
      .then(function (response) {
        return response.json();
        })
      .then(function (response) {
        if(response['id'] === '#'){
          let status = 'NO VEHICLE OR VEHICLE OWNER FOUND'
          console.log(status);
          sessionStorage.setItem('flash',status); 
          //this.$router.push(`/flagged/${this.ticket['id']}/IMAGE PROCESSING ERROR`);
          window.history.back();
        } else {
          // IF TICKET WAS SUCCESSFULLY ISSUED
          if(response['status'].search('ISSUED') >= 0){
            console.log(response['status']);  
            self.$router.push(`/issued/${response['id']}`);
            sessionStorage.setItem('flash',response['status']);
          } else {
            console.log(response['status']);
            window.history.back();
            sessionStorage.setItem('flash',response['status']);
          }
        }
        console.log(response)    
      })
    },
    openModal(){
        openModal()
    },
    closeModal(){
      closeModal()
    }
  }
};

const ManualIssue = {
  name: 'ManualIssue',
  template: `

    <div class="container d-flex justify-content-center pb-5">
      <div class='d-flex form-container flex-column'>

        <form method="post" @submit.prevent="add_offender" id="manualIssueForm" class="px-5 pb-3 rounded border d-flex flex-column align-items-center">
          <h1 class="sign-in-text my-3">Issue Ticket</h1>  
          <div class="form-group sm-padding-right">
            <label for="date"><span class='pr-2'>Date</span><span id='date-format'>(yyyy-mm-dd)</span></label><br>
            <input type="text" name="date" class='form-control' required/> 
          </div>
          <div class="form-group">
            <label for="time"><span class='pr-2'>Time</span><span id='time-format'>(hh:mm)</span></label><br>
            <input type="text" name="time" class='form-control' required/>
          </div>
        
          <div class="form-group sm-padding-right">
            <label for="location">Location Description</label><br>
            <input type="text" name="location" class='form-control' required/> 
          </div>
          <div class="form-group">
            <label for="parish">Parish</label><br>
            <select name="parish" id="parish" form="manualIssueForm" class="form-control">
              <option value="St. Andrew">St. Andrew</option>
              <option value="Kingston">Kingston</option>
              <option value="St. Catherine">St. Catherine</option>
              <option value="Clarendon">Clarendon</option>
              <option value="Manchester">Manchester</option>
              <option value="St. Elizabeth">St. Elizabeth</option>
              <option value="Westmoreland">Westmoreland</option>
              <option value="Hanover">Hanover</option>
              <option value="St. James">St. James</option>
              <option value="Trelawny">Trelawny</option>
              <option value="St. Ann">St. Ann</option>
              <option value="St. Mary">St. Mary</option>
              <option value="Portland">Portland</option>
              <option value="St. Thomas">St. Thomas</option>
            </select>
          </div>

          <div class="form-group sm-padding-right">
            <label for="Offence">Offence</label><br>
            <select name="offence" id="offence" form="manualIssueForm" class="form-control">
              <option value="F100">Failure to obey traffic signal</option>
              <option value="E200">Exceeding the speed limit > 10kmph</option>
              <option value="E300">Exceeding the speed limit > 50kmph</option>
              <option value="E400">Exceeding the speed limit > 80kmph</option>
            </select>
          </div>
          <div class="form-group d-flex flex-column">
            <label for="snapshot">Snapshot</label>
            <input type="file" name="snapshot" required/> 
          </div>
          <button id='manual-submit-btn' type="submit" name="submit-btn" class="btn submit-button py-1 mx-auto mt-2 w-50" style='color: white'>Submit</button>
        </form>
      </div>
    </div>
  `,
  data() {
    return {
      flashMessage: sessionStorage.getItem('flash'),
      displayFlash: false,
      isSuccess: false,
      alertSuccessClass: 'alert-success',
      alertErrorClass: 'alert-danger'
    }
  },
  created(){
    if (!isLoggedIn()){
      this.$router.push('/login')
      return;
    }
    loginNav();
    flashMessage(this);
  },
  methods: {
    add_offender(){
      let form = document.getElementById('manualIssueForm');
      let form_data = new FormData(form);
      let self = this;
      fetch("/api/issue/upload", {
          method: 'POST',
          body: form_data,
          headers: {
              'X-CSRFToken': csrf_token,
              'Authorization': 'Bearer ' + sessionStorage.getItem('jets_token')
          },
          credentials: 'same-origin'
      })
      .then(function (response) {
          if (!response.ok) {
            sessionStorage.setItem('flash', "Offender could not be added")
            self.$router.push('/')
            throw Error(response.statusText);
          }
          return response.json();
      })
      .then(function (jsonResponse) {
          //self.offender_data = jsonResponse

          if (jsonResponse['status'].search('@') > 0) {
            self.$router.push('/issued');
            sessionStorage.setItem('flash', "Ticket succesfully issued");
          } else {
            self.$router.push('/');
            sessionStorage.setItem('flash', "Ticket could not be issued");
          }
          
      })
      .catch(function (error) {
          console.log('Looks like there was a problem: \n', error);
      });
    },
    fetchOffences(){

    }
  }
};

let searchQuery = ''  // Global variable for storing a search query entered on a route outside SearchResults

const SearchResults = {
  name: 'SearchResults',
  template: `
    <div id="search-page-container" class="">
      <div class='controls-container d-flex justify-content-between pt-3'>
        <div id="searchbar-container" class="d-flex">
          <input type="search" v-model='query' id="searchbar" name="searchbar" placeholder="Search" class="form-control align-self-center">
          <label for="searchbar" id='search-btn-label' class="ml-2 align-self-center">
            <!--<img @click='searchTickets' src="/static/assets/search_btn.svg" alt="search icon" id="search-icon" class="">-->
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 15" width="24px" fill="#7F8189" alt="search icon" id="search-icon" @click='searchTickets'>
              <path d="M0 0h24v24H0V0z" fill="none"/>
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
          </label>
        </div>
      </div>
      <h3 class='mt-3'>
        <b>Search Results</b>
      </h3>
      <table class="table mt-4" id="search-table">
        <caption class="sr-only">Search Results Table</caption>
        <thead>
          <tr>
            <th scope="col">Vehicle Owner</th>
            <th scope="col">Date & Time</th>
            <th scope="col">Offence Desc.</th>
            <th scope="col">Registration #</th>
            <th scope="col">Location</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody v-if='tickets.length > 0' id='search-table-body'>
          <tr v-for='ticket in tickets' @click="viewTicket(ticket.id, ticket.status)">
            <td>{{ticket.vehicleOwner.fname}} {{ticket.vehicleOwner.lname}}</td>
            <td>{{ticket.incident.date}} {{ticket.incident.time}}</td>
            <td>{{ticket.offence.description}}</td>
            <td>{{ticket.vehicle.licenseplate}}</td>
            <td>{{ticket.location.description}}</td>
            <td>{{ticket.status}}</td>
          </tr>
        </tbody>
      </table>
      <div id='search-message' class='d-flex justify-content-center my-5'>
        <h3 class='mt-3'>
          <span v-if='tickets.length === 0' class='search-count'>No Records Found</span>
          <span v-else-if='tickets.length === 1' class='search-count'>1 Record Found</span>
          <span v-else class='search-status'>{{tickets.length}} Records Found</span>
        </h3>
      </div>
    </div>
    `, data() {
      return {
        tickets: [],
        query: searchQuery
      }
  },
  created() {
    if (isLoggedIn()){
      this.query = searchQuery;
      this.searchTickets();
    }
    else {
      this.$router.push('/login');
    }
  },
  methods: {
    searchTickets() {
      let self = this;
      if(self.query.length >= 3){
        self.tickets = [];
        fetch(`/api/search/tickets?q=${self.query}`, {
            method: 'GET',
            headers: {
                'X-CSRFToken': csrf_token,
                'Authorization': 'Bearer ' + sessionStorage.getItem('jets_token')
            },
            credentials: 'same-origin'
        })
        .then(function (response) {
          if (!response.ok) {
            throw Error(response.statusText);
          }
          return response.json();
        })
        .then(function (offenceData) {
          console.log(offenceData);  
          offenceData.forEach((ticket, index) => {
            console.log(ticket);
            self.updateTable(ticket);
          })
        })
        .catch(function (error) {
            console.log(error);
        });
      } else {
        console.log('Query length should be at least 3 characters long');
      }
    },
    viewTicket(ticketID,status){
      if(status.search('ISSUED') === 0){
        // IF THE STATUS IS ISSUED ...
        this.$router.push(`/issued/${ticketID}`);
      } else {
        this.$router.push(`/flagged/${ticketID}/${status}`);
      }
    },
    updateTable(offenceData){
      this.tickets.unshift(offenceData);
    }
  }
}

const AccountSettings = {
  name: 'AccountSettings',
  template: `
    <div id="account-page-container" class="d-flex">
      <user-management v-if="user.isAdmin === 'True'" class='border rounded-top'></user-management>
      <div class='mx-auto align-self-start mt-5'>
        <password-table></password-table>
        <transition name="fade" class="mt-3">
          <div v-if="displayFlash" v-bind:class="[isSuccess ? alertSuccessClass : alertErrorClass]" class="alert">
              {{ flashMessage }}
          </div>
        </transition>
      </div>
    </div>
    `, data() {
      return {
        user: JSON.parse(sessionStorage.getItem('jets_user')),
        status: '',
        statusStr: 'successfully',
        flashMessage: sessionStorage.getItem('flash'),
        displayFlash: false,
        isSuccess: false,
        alertSuccessClass: 'alert-success',
        alertErrorClass: 'alert-danger'
      }
  },
  created() {
    if (!isLoggedIn()){
      this.$router.push('/login');
    } else {
      flashMessage(this);
    }
  },
  methods: {
    changePassword() {
      let self = this;
      let changePasswordForm = document.forms['change-password-form'];
      let form_data = new FormData(changePasswordForm);
      fetch("/api/users/changePassword", {
          method: 'POST',
          body: form_data,
          headers: {
              'X-CSRFToken': csrf_token,
              'Authorization': 'Bearer ' + sessionStorage.getItem('jets_token')
          },
          credentials: 'same-origin'
      })
      .then(function (response) {
        if (!response.ok) {
          throw Error(response.statusText);
        }
        return response.json();
      })
      .then(function (offenceData) {
        console.log(offenceData)
        self.status = offenceData['message']

        if(self.status.search('successfully') >= 0){
          console.log('Success')
          const oldpswd = document.getElementById('old-password-field');
          oldpswd.value ='';
          const newpswd = document.getElementById('new-password-field');
          newpswd.value ='';
          self.isSuccess = true;
        } else {
          const oldpswd = document.getElementById('old-password-field');
          oldpswd.value ='';
          const newpswd = document.getElementById('new-password-field');
          newpswd.value ='';
        }
        flashMessage(this);   
      })
      .catch(function (error) {
          console.log(error);
      });
    }
  }
}

const Stats = {
  name: 'Stats',
  template: `
    <div id="stats-page-container" class="d-flex flex-column">
      <h1 class='mt-3 mb-5 align-self-center'>STATISTICAL REPORTS</h1>
      <h2 class='mb-4 align-self-center'>OFFENCE DATA</h2>
      <div class="d-flex flex-column align-items-center border rounded pt-4 w-75 align-self-center">

        <div class="form-group">
          <label for="parish">Traffic Division</label><br>
          <select name="parish" id="parish" form="manualIssueForm" class="form-control">
            <option value="St. Andrew">Islandwide</option>
            <option value="St. Andrew">St. Andrew</option>
            <option value="Kingston">Kingston</option>
            <option value="St. Catherine">St. Catherine</option>
            <option value="Clarendon">Clarendon</option>
            <option value="Manchester">Manchester</option>
            <option value="St. Elizabeth">St. Elizabeth</option>
            <option value="Westmoreland">Westmoreland</option>
            <option value="Hanover">Hanover</option>
            <option value="St. James">St. James</option>
            <option value="Trelawny">Trelawny</option>
            <option value="St. Ann">St. Ann</option>
            <option value="St. Mary">St. Mary</option>
            <option value="Portland">Portland</option>
            <option value="St. Thomas">St. Thomas</option>
          </select>
        </div>

        <table class="table w-50" id="avg-offence">
          <caption class="sr-only">Average Offence per Day, per Traffic Division</caption>
          <thead>
            <tr>
              <th scope="col">Offence</th>
              <th scope="col">Daily Avg/Vehicle</th>
            </tr>
          </thead>
          <tbody id='avg-offence-table-body'>
            <tr>
              <td class=''>Failure to obey traffic signal</td>
              <td>9.9</td>
            </tr>
            <tr>
              <td class=''>Exceeding the speed limit > 10kmph</td>
              <td>21.7</td>
            </tr>
            <tr>
              <td class=''>Exceeding the speed limit > 50kmph</td>
              <td>14.3</td>
            </tr>
            <tr>
              <td class=''>Exceeding the speed limit > 80kmph</td>
              <td>1.3</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    `,
    data() {
      return {
        user: JSON.parse(sessionStorage.getItem('jets_user')),
        status: '',
        flashMessage: sessionStorage.getItem('flash'),
        displayFlash: false,
        isSuccess: false,
        alertSuccessClass: 'alert-success',
        alertErrorClass: 'alert-danger'
      }
  },
  created() {
    if (!isLoggedIn()){
      this.$router.push('/login');
    } else {
      flashMessage(this);
    }
  },
  methods: {

  }
}

const NotFound = {
  name: 'NotFound',
  template: `
  <div class="not-found mt-5">
    <h1>404</h1>
    <p>That page doesn't even exist.</p>
    <p>Why don't you just <router-link to="/">go back notifications</router-link></p>
  </div>

  `,
  data() {
      return {}
  },
  created(){
    if (isLoggedIn()){
      loginNav();
    }
  },
  methods: {
  }
}


/* CREATE APP */
const app = Vue.createApp({
  components: {
    'notifications': Notifications,
    'login': Login
  },
  data() {
    return {
      token: ''
    }
  }
});

/* COMPONENTS */
app.component('app-header', {
  name: 'AppHeader',
  template: `
    <nav id='navbar' class="navbar navbar-expand-lg navbar-dark fixed-top d-flex justify-content-between px-5">
      <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>

      <router-link to="/flagged">
        <div class="navbar-brand my-0 py-0">
          <div id="website-name" class='d-flex flex-column'>
            <p id='jets' class='mb-0'>JETS</p>
            <p id='jets-long' class='my-0'>JamaicaEye Ticketing System</p>
          </div>
        </div>
      </router-link>
      <div class="collapse navbar-collapse mx-auto" id="navbarSupportedContent">
        <ul id="logged-in" class="navbar-nav w-100">
          <li class="nav-item dynamic-link">
            <router-link class="nav-link" to="/flagged">Notifications</router-link>
          </li>
          <li class="nav-item dynamic-link">
            <router-link class="nav-link" to="/issueTicket">Issue Ticket</router-link>
          </li>
          <li class="nav-item dynamic-link">
            <router-link class="nav-link" to="/issued">Traffic Offenders</router-link>
          </li>
          <li class="nav-item dynamic-link">
            <router-link class="nav-link" to="/archives">Archives</router-link>
          </li>
          <li v-if='isAdmin()' class="nav-item dynamic-link" id='stat-route'>
            <router-link class="nav-link" to="/stats">Stats</router-link>
          </li>
        </ul>
      </div>
      <ul id="user-menu" class="navbar-nav ml-auto">
        <li class="nav-item dynamic-link dropdown d-inline-block">
          <router-link v-if='userExists' class="nav-link username d-flex justify-content-between" to="">
            <span id='username'>{{user.name}}</span>
            <img src="/static/assets/drop_down_arrow.svg" alt="dropdown arrow" id="dropdown-arrow-icon" class="dropdown-arrow d-inline-block">
          </router-link>
          <div class="dropdown-content rounded">
            <router-link class="nav-link d-flex align-items-center account-settings rounded-top" to="/accountSettings">
              <svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000">
                <g><path d="M0,0h24v24H0V0z" fill="none"/></g>
                <g><g>
                  <path d="M4,18v-0.65c0-0.34,0.16-0.66,0.41-0.81C6.1,15.53,8.03,15,10,15c0.03,0,0.05,0,0.08,0.01c0.1-0.7,0.3-1.37,0.59-1.98 C10.45,13.01,10.23,13,10,13c-2.42,0-4.68,0.67-6.61,1.82C2.51,15.34,2,16.32,2,17.35V20h9.26c-0.42-0.6-0.75-1.28-0.97-2H4z"/>
                  <path d="M10,12c2.21,0,4-1.79,4-4s-1.79-4-4-4C7.79,4,6,5.79,6,8S7.79,12,10,12z M10,6c1.1,0,2,0.9,2,2s-0.9,2-2,2 c-1.1,0-2-0.9-2-2S8.9,6,10,6z"/>
                  <path d="M20.75,16c0-0.22-0.03-0.42-0.06-0.63l1.14-1.01l-1-1.73l-1.45,0.49c-0.32-0.27-0.68-0.48-1.08-0.63L18,11h-2l-0.3,1.49 c-0.4,0.15-0.76,0.36-1.08,0.63l-1.45-0.49l-1,1.73l1.14,1.01c-0.03,0.21-0.06,0.41-0.06,0.63s0.03,0.42,0.06,0.63l-1.14,1.01 l1,1.73l1.45-0.49c0.32,0.27,0.68,0.48,1.08,0.63L16,21h2l0.3-1.49c0.4-0.15,0.76-0.36,1.08-0.63l1.45,0.49l1-1.73l-1.14-1.01 C20.72,16.42,20.75,16.22,20.75,16z M17,18c-1.1,0-2-0.9-2-2s0.9-2,2-2s2,0.9,2,2S18.1,18,17,18z"/>
                </g></g>
              </svg>
              <span class='pl-2'>Account Settings</span>
            </router-link>
            <router-link class="nav-link d-flex logout-btn rounded-bottom" to="/logout">
              <svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000">
                <g><path d="M0,0h24v24H0V0z" fill="none"/></g>
                <g><path d="M17,8l-1.41,1.41L17.17,11H9v2h8.17l-1.58,1.58L17,16l4-4L17,8z M5,5h7V3H5C3.9,3,3,3.9,3,5v14c0,1.1,0.9,2,2,2h7v-2H5V5z"/></g>
              </svg>
              <span class='pl-2'>Sign out</span>
            </router-link>
          </div>
        </li>
      </ul>
    </nav>
  `,
  data() {
    return {
      user: JSON.parse(sessionStorage.getItem('jets_user'))
    }
  },
  created(){
    // If no user data exists in session storage
    if(!this.userExists()){
      // Assign default user
      this.user = {'id': -1, 'name':'default','isAdmin':'False'};
    } else {
      this.user = JSON.parse(sessionStorage.getItem('jets_user'));
    }
  },
  methods: {
    userExists(){
      return sessionStorage.getItem('jets_user') !== null;
    },
    isAdmin(){
      return this.user.isAdmin === 'True';
    }
  }
  
});

app.component('app-footer', {
    name: 'AppFooter',
    template: 
    `
    <footer id='footer'>
        <div class="navbar navbar-expand-lg navbar-dark fixed-bottom">
          <p class="m-auto">Copyright © 2021 | All Rights Reserved</p>
        </div>
    </footer>
    `,
    data() {
        return {
            // year: (new Date).getFullYear()
        }
    }
});

app.component('password-table', {
  name: 'PasswordTable',
  template: `
    <div class="d-flex flex-column justify-content-center">
      <h3 class='text-center'>
        <b>My Account</b>
      </h3>
      <table class="table mt-4" id="account-table">
        <caption class="sr-only">Change Password Table</caption>
        <thead>
          <tr>
            <th scope="col">Username</th>
            <th scope="col">Password</th>
            <th scope="col">Action</th>
          </tr>
        </thead>
        <tbody id='account-table-body'>
          <tr>
            <td class='pt-3'>{{user.name}}</td>
            <td id='td-password'>**************</td>
            <td><change-password-btn data-toggle="modal" data-target="#changePasswordModal"></change-password-btn></td>
          </tr>
        </tbody>
      </table>
      <div class="modal fade" tabindex="-1" role="dialog" id="changePasswordModal">
        <div class="modal-dialog" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title"><b>CHANGE PASSWORD</b></h5>
              <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body">

              <form method="post" @submit.prevent="changePassword" id="change-password-form" class="d-flex flex-column">
                <input type="hidden" name="userID" id='user-id-field' :value="user.id" required/> 
                <div class="form-group">
                  <label for="oldPassword" class="">Old Password</label>
                  <input type="password" name="oldPassword" class='form-control' id='old-password-field' required/> 
                </div>
                <div class="form-group">
                  <label for="newPassword" class="">New Password</label>
                  <input type="password" name="newPassword" class='form-control' id='new-password-field' required/> 
                </div>
                <div class="modal-footer d-flex justify-content-between px-0">
                  <!--<button v-if='status.search(statusStr) >= 0' type="button" class="btn mt-2 close-btn" data-dismiss="modal">Close</button>-->
                  <button type="submit" name="submit-btn" class="btn save-btn d-flex align-items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#ffffff">
                      <path d="M0 0h24v24H0z" fill="none"/>
                      <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
                    </svg>
                  <span>Save changes</span>
                  </button>
                  <transition name="fade" class="mt-3">
                    <div v-if="displayFlash" v-bind:class="[isSuccess ? alertSuccessClass : alertErrorClass]" class="alert">
                        {{ flashMessage }}
                    </div>
                  </transition>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
    `, data() {
      return {
        user: JSON.parse(sessionStorage.getItem('jets_user')),
        status: '',
        statusStr: 'successfully',
        flashMessage: sessionStorage.getItem('flash'),
        displayFlash: false,
        isSuccess: false,
        alertSuccessClass: 'alert-success',
        alertErrorClass: 'alert-danger'
      }
  },
  created() {
    if (!isLoggedIn()){
      this.$router.push('/login');
    }
  },
  methods: {
    changePassword() {
      let self = this;
      //let changePasswordForm = document.getElementById('change-password-form');
      let changePasswordForm = document.forms['change-password-form'];
      let form_data = new FormData(changePasswordForm);
      fetch("/api/users/changePassword", {
          method: 'POST',
          body: form_data,
          headers: {
              'X-CSRFToken': csrf_token,
              'Authorization': 'Bearer ' + sessionStorage.getItem('jets_token')
          },
          credentials: 'same-origin'
      })
      .then(function (response) {
        if (!response.ok) {
          throw Error(response.statusText);
        }
        return response.json();
      })
      .then(function (offenceData) {
        console.log(offenceData)
        self.status = offenceData['message']

        if(self.status.search('successfully') >= 0){
          console.log('Success')
          const oldpswd = document.getElementById('old-password-field');
          oldpswd.value ='';
          const newpswd = document.getElementById('new-password-field');
          newpswd.value ='';
          self.isSuccess = true;
        } else {
          const oldpswd = document.getElementById('old-password-field');
          oldpswd.value ='';
          const newpswd = document.getElementById('new-password-field');
          newpswd.value ='';
        }
        self.displayFlash = true;
        self.flashMessage = self.status;
        setTimeout(function() { 
            self.displayFlash = false;
        }, 3000);
        
      })
      .catch(function (error) {
          console.log(error);
      });
    }
  }
})

app.component('user-management', {
    name: 'UserManagement',
    template: 
    `
      <div id="um-container" class="d-flex flex-column p-5">
        <div class='heading'>User Management</div>
        <div @click=register_user id='add-user-btn' class='user-management-btn'>
          <img src="/static/assets/add_user.svg" alt="add user icon" id="add-user-icon" class="pr-3 pb-1">Add User
        </div>
        <div id='remove-user-btn' class='user-management-btn' data-toggle="modal" data-target="#removeUserModal" @click="$emit('deregister_user')">
          <img src="/static/assets/remove_user.svg" alt="remove user icon" id="remove-user-icon" class="pr-3 pb-1">Remove User
        </div>
        <!-- Modal -->
        <div class="modal fade" id="removeUserModal" tabindex="-1" role="dialog" aria-labelledby="removeUserModalLabel" aria-hidden="true">
          <div class="modal-dialog" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title" id="removeUserModalLabel">User to be removed</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body">
                <input v-model='username' type="text" id="username-tbd" name="username" class="form-control align-self-center">
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                <button @click=deregister_user type="button" class="btn btn-primary">Remove User</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `,
    data() {
        return {
            username: ''
        }
    },
    created(){      
    },
    methods: {
      register_user(){
        console.log('Registering user');
        this.$router.push('/register');
      },
      deregister_user(){
        console.log('Deregistering user')
        if(this.username === JSON.parse(sessionStorage.getItem('jets_user')).name){
          console.log('Deleting your account')
          this.$router.push('/logout')
        }
        fetch(`/api/deregister?q=${this.username}`, {
            method: 'GET',
            headers: {
                'X-CSRFToken': csrf_token,
                'Authorization': 'Bearer ' + sessionStorage.getItem('jets_token')
            },
            credentials: 'same-origin'
        })
        .then(function (response) {
          if (!response.ok) {
            throw Error(response.statusText);
          }
          return response.json();
        })
        .then(function (offenceData) {
          console.log(offenceData)
          self.status = offenceData['message']
          sessionStorage.setItem('flash', self.status)
          flashMessage(this);   
        })
        .catch(function (error) {
          console.log('Something went wrong upon json response');
          console.log(error);
        });
      }
    },
    emits: ['deregister_user']

});

app.component('search-bar', {
    name: 'SearchBar',
    template: 
    `
      <div id="searchbar-container" class="d-flex">
        <input type="text" v-model='query' id="searchbar" name="searchbar" placeholder="Search" class="form-control align-self-center">
        <label for="fname" id='search-btn-label' class="ml-2 align-self-center">
          <!--<img @click='search' src="/static/assets/search_btn.svg" alt="search icon" id="search-icon" class="">-->
          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 15" width="24px" fill="#7F8189" alt="search icon" id="search-icon" @click='search'>
            <path d="M0 0h24v24H0V0z" fill="none"/>
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
        </label>
      </div>
    `,
    data() {
        return {
            query: ''
        }
    },
    created(){      
    },
    methods: {
      search(){
        if (this.query){
          console.log('Searching for ' + this.query)
          searchQuery = this.query; // Store globally for access from other components
          this.$router.push('/searchResults');
        }
      }
    }

});

app.component('simulate-btn', {
    name: 'SimulateBtn',
    template: 
    `
     <div class="btn d-flex justify-content-start align-items-center simulate-btn">
        <img src="/static/assets/simulate.svg" alt="Simulate Icon">
        <span class="d-inline-block pl-2">Simulate</span>
      </div>
    `,
    data() {
        return {
        }
    }
});

app.component('issue-btn', {
    name: 'IssueBtn',
    template: 
    `
     <div @click="$emit('issue_ticket')" class="btn d-flex justify-content-start align-items-center issue-btn">
        <img src="/static/assets/issue_ticket.svg" alt="Issue Icon">
        <span class="d-inline-block pl-2">Issue</span>
      </div>
    `,
    data() {
        return {
        }
    },
    emits: ['issue_ticket']
});

app.component('archive-btn', {
    name: 'ArchiveBtn',
    template: 
    `
     <div class="btn d-flex justify-content-start align-items-center archive-btn">
        <img src="/static/assets/archive.svg" alt="Archive Icon">
        <span class="d-inline-block pl-2">Archive</span>
      </div>
    `,
    data() {
        return {
        }
    }
});

app.component('print-btn', {
    name: 'PrintBtn',
    template: 
    `
     <div class="btn d-flex justify-content-start align-items-center print-btn">
        <img src="/static/assets/print.svg" alt="Print Icon">
        <span class="d-inline-block pl-2">Print</span>
      </div>
    `,
    data() {
        return {
        }
    }
});

app.component('reset-btn', {
    name: 'ResetBtn',
    template: 
    `
     <div class="btn d-flex justify-content-start align-items-center reset-btn">
        <img src="/static/assets/reset.svg" alt="Reset Icon">
        <span class="d-inline-block pl-2">Reset</span>
      </div>
    `,
    data() {
        return {
        }
    }
});

app.component('change-password-btn', {
    name: 'ChangePasswordBtn',
    template: 
    `
     <div id='change-password-btn' class="btn d-flex justify-content-center align-items-center">
        <span class="">Change Password</span>
      </div>
    `,
    data() {
        return {
        }
    }
});

/* CUSTOM MODAL */

// When the user clicks the button, open the modal 
function openModal(){
  // Get the modal
  var modal = document.getElementById("jmodal");
  modal.style.display = "block";
  // Get the button that opens the modal
  //var btn = document.getElementById("myBtn"); 

  // When the user clicks anywhere outside of the modal, close it
  window.onclick = function(event) {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  }
}

function closeModal(){
  var modal = document.getElementById("jmodal");
  // Get the <span> element that closes the modal
  var span = document.getElementsByClassName("close")[0];
  // When the user clicks on <span> (x), close the modal
  modal.style.display = "none";
}

app.component('j-modal', {
  name: 'JModal',
    template: 
    `
      <!-- The Modal -->
      <div id="jmodal" class="jmodal align-self-center">

        <!-- Modal content -->
        <div class="jmodal-content">
          <div class="jmodal-header d-flex justify-content-between align-items-center">
            <h2 class=''>{{headerTitle}}</h2>
            <img src="/static/assets/close.svg" @click=closeModal class="close" alt="Close Icon">
          </div>
          <div class="jmodal-body">
            <label for='user-info'>{{inputLabel}}</label>
            <input type="text" name="user-info" class='form-control' id='modal-input' v-model='inputField' required/>
          </div>
          <div class="jmodal-footer d-flex justify-content-end">
            <div class="btn d-flex justify-content-start align-items-center modal-btn" @click="$emit('submit',inputField); close_by_locate();">
              <img :src="image" alt="Button Icon">
              <span class="d-inline-block pl-2">{{btnText}}</span>
            </div>
          </div>
        </div>

      </div>
    
    `,
    data() {
        return {
          image: '/static/assets/' + this.icon,
          inputField: ''
        }
    },
    created(){
      this.inputField = '';
    },
    methods: {
      openModal(){
        openModal()
      },
      closeModal(){
        closeModal()
      },
      close_by_locate(){
        if(this.inputField){
          closeModal()
        }
      }
    },
    props: ['headerTitle', 'inputLabel', 'icon', 'btnText'],
    emits: ['submit']
})

// Define Routes
const routes = [
    { path: "/", component: Notifications },
    { path: "/flagged", component: Notifications },
    // Put other routes here
    { path: '/register', component: Register },
    { path: '/login', component: Login },
    { path: '/logout', component: Logout },
    { path: '/issued', component: Offenders },
    { path: '/issued/:ticketID', component: ViewIssued },
    { path: '/flagged/:ticketID/:ticketStatus', component: ViewFlagged },
    { path: '/archives/:ticketID/:ticketStatus', component: ViewArchived },
    { path: '/archives', component: Archives },
    { path: '/issueTicket', component: ManualIssue },
    { path: '/searchResults', component: SearchResults },
    { path: '/accountSettings', component: AccountSettings },
    { path: '/stats', component: Stats },

    // This is a catch all route in case none of the above matches
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFound }
];

const router = VueRouter.createRouter({
    history: VueRouter.createWebHistory(),
    routes, // short for `routes: routes`
});

app.use(router);

app.mount('#app');
