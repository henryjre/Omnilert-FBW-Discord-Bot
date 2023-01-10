const routes = require('express').Router();
const database = require('./database');
const verification = require('./verification');

routes.use('/database', database);
routes.use('/verification', verification);

routes.get('/', (req, res) => {
  res.status(200).json({ message: 'This is Leviosa API.' });
});

module.exports = routes;