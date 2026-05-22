const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { sub: 'cmpfi4dkg0001ja0unhyffxx7', role: 'owner', type: 'access' },
  'D411hSi2WvoyyGBeeXamZ85t61rugwtN56pAo1+AzUM=',
  { expiresIn: '1h' }
);
console.log(token);
