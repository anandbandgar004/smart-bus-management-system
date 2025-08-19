const express = require('express');
const router = express.Router();
const Bus = require('../models/Bus');

router.get('/', async (req, res) => {
    try {
        res.json(await Bus.find({ status: 'active' }));
    } catch (err) { res.status(500).send('Server Error'); }
});
module.exports = router;