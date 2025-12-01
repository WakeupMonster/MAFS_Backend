/* eslint-disable no-undef */
// Firebase service worker for FCM
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js');

// Initialize Firebase with your config
  const firebaseConfig = {
    apiKey: "AIzaSyBe15GMZGXAmaI5NT9_rS4OZjAwSy0oJMo",
    authDomain: "mafswm.firebaseapp.com",
    projectId: "mafswm",
    storageBucket: "mafswm.firebasestorage.app",
    messagingSenderId: "417407456654",
    appId: "1:417407456654:web:856d0e143939b9dbe800df",
    measurementId: "G-R78NDKHSGW"
  };

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/firebase-logo.png' // Optional: path to your icon
  };
  
  return self.registration.showNotification(notificationTitle, notificationOptions);
});