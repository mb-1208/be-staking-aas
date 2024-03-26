const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue, Filter } = require('firebase-admin/firestore');

const serviceAccount = require('./firestoreConf/serviceAccountKey.json');

// Initialize Firebase
const firestoreConf = initializeApp({credential: cert(serviceAccount)});
const firestoreDB = getFirestore(firestoreConf);

const clientsCol = firestoreDB.collection('apiClients');
const tokensCol = firestoreDB.collection('apiTokens');
const usersCol = firestoreDB.collection('users');

module.exports = {firestoreDB, Timestamp, clientsCol, tokensCol, usersCol}