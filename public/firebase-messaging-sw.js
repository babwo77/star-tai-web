importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAEgTcRrXe12be0yQPC_U5vBnF9fJar484",
  authDomain: "star-tai-reservation.firebaseapp.com",
  projectId: "star-tai-reservation",
  messagingSenderId: "154281928431",
  appId: "1:154281928431:web:e96145e2dfc90bde011d1a"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/favicon.svg"
  });
});