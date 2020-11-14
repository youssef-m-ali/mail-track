const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('welcome to the home');
})

app.listen(8000, () =>{
    console.log('we started');
} );

