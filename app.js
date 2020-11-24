const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const Mail = require('./models/mail');
const Creds = require('./creds');
const url = require('url');


const app = express();

function sleep (time) {
    return new Promise((resolve) => setTimeout(resolve, time));
  }

const dbURI = Creds.db;
mongoose.connect(dbURI, {useNewUrlParser: true, useUnifiedTopology: true})
    .then((result) => console.log('connected to db'))
    .catch((err) => console.log(err));




app.get('/', (req, res) => {
    
    var total = 0;
    Mail.countDocuments({}, (err, count) =>{
        total = count;
        if (err) throw err;
    });

    sleep(1000).then(()=>{
    res.send(`Next mail is ${total}`);
    });

})

app.get('/image', (req, res) =>{
    var mail_id = req.query.id;

    Mail.findOne({id : mail_id}, (err, result)=>{

        var date = new Date();
        date = date.toString();

        result.readat.push(date);
        result.save();

        })
        .catch((err)=>{
            if (err) throw err;
        });

    res.sendFile(path.join(__dirname, 'public', '1x1.png'));

})


// TO BE IMPLEMENTED

app.get('/add-mail', (req, res) => {

    var total = 0;
    Mail.countDocuments({}, (err, count) =>{
        total = count;
        if (err) throw err;
    });

    sleep(1000).then(()=>{
        console.log('generating new mail')
        
        const mail = new Mail({
            id: total,
            title: "new mail",
            to: ""
        });

        mail.save()
            .then((result)=>{
                res.send(result)
            })
            .catch((err)=>{
                if (err) throw err;
            });
    });

});

const port = process.env.port || 8080;

app.listen(port, () =>{
    console.log('we started');
} );

