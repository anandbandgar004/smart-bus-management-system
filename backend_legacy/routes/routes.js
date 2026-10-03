const express = require('express');
const router = express.Router();
const Route = require('../models/Route');

router.get('/', async (req, res) => {
    try {
        res.json(await Route.find());
    } catch (err) { res.status(500).send('Server Error'); }
});
module.exports = router;
