/* Edit this file to change the site. */
window.SITE = {
  // 1) Paste your Firebase web app settings here (Firebase console > Project settings > Your apps)
  firebase: {
    apiKey: "AIzaSyATO6-GzVthTR7Cy7ijFqVIIa2t2P-9kPo",
    authDomain: "midas-web-46ae8.firebaseapp.com",
    projectId: "midas-web-46ae8",
    storageBucket: "midas-web-46ae8.firebasestorage.app",
    messagingSenderId: "957483278223",
    appId: "1:957483278223:web:fca8de7cd4db116288b5fa"
  },

  // 2) The email of the admin user you create in Firebase Authentication.
  //    The admin password (Dander_Midas) is set in Firebase and is NOT stored in this site.
  adminEmail: "david.d.rodriguez0804@gmail.com",

  // Optional: a relay (TURN) server for the voice room, for networks that block direct connections.
  // ice: [{urls:"stun:stun.l.google.com:19302"},{urls:"turn:YOUR-SERVER:443",username:"...",credential:"..."}],

  // Songs (one per page, they loop). Songs are files, so they are set here.
  settings: {
    song1: "media/song1.mp4", title1: "Midas Touch",
    song2: "media/song2.mp4", title2: "I Turned You to Gold",
    song3: "media/song3.mp4", title3: "Gold Can\u2019t Love Me Back",
    song4: "media/song4.mp4", title4: "Golden Touch",
    song5: "media/song5.mp4", title5: "King Midas Syndrome"
  }
};
