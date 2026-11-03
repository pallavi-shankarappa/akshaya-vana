const mongoose = require('mongoose');
const uri = 'mongodb+srv://smartcity:Y9biZsF1q5YNfYoJ@cluster0.zfvzbxs.mongodb.net/akshayavana?retryWrites=true&w=majority';
console.log('Testing connection with options...');
mongoose.connect(uri, { 
  user: 'smartcity',
  pass: 'Pallavi@9876',
  serverSelectionTimeoutMS: 5000 
})
  .then(() => {
    console.log('SUCCESS: Connected to MongoDB Atlas');
    process.exit(0);
  })
  .catch(err => {
    console.error('FAILURE:', err.message);
    process.exit(1);
  });
