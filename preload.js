const config = require("./config");
const firebase = require('firebase/app');
require("firebase/auth")

const firebaseConfig = {
    apiKey: config.fireBase.apiKey,
    appId: config.fireBase.appId,
};
firebase.initializeApp(firebaseConfig);

window.firebase = firebase;
