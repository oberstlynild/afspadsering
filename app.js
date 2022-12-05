//https://www.youtube.com/watch?v=OU2uW4y4UlA&t=660s

const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const app = express()
const moment = require('moment')
const methodOverride = require('method-override')
const session = require('express-session')
var bcrypt = require('bcrypt')
require('dotenv/config')

moment.locale('da')
moment.defaultFormat = 'dddd Do MMMM YYYY [kl. ]H[:]mm'


//Set templating engine as EJS
app.set('view engine', 'ejs')

//Serveing static files
app.use(express.static('public'))

//express session middleware
app.use(session({secret:process.env.SESSION_SECRET, saveUninitialized:false, resave:false}))

//BodyParser middleware
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

//middleware for method override
app.use(methodOverride('_method'))

//connecting app to database
mongoose.connect(process.env.DATABASE_URL,{
    useNewUrlParser:true,
    useUnifiedTopology:true
}).then(console.log('MongoDB connected'))
.catch(err => console.log(err))

//Importing models
const Diary = require('./models/Diary')
const usedTime = require('./models/UsedTime')
const Users = require('./models/User')

//*ROUTING*
//Route for 'homepage'
app.get('/', (req, res) => {
    let sesh = req.session;
    res.render('Home', {loggedIn:sesh.loggedIn})
})

//Route for 'about'
app.get('/about', (req, res) => {
    let sesh = req.session;
    res.render('About', {loggedIn:sesh.loggedIn})
})

//Route for 'diary'
app.get('/diary', (req, res) => {
    let sesh = req.session;
    usedTime.find({username:sesh.username}).then(myTime => {
        Diary.find({username:sesh.username}).sort({"startDate": -1})
        .then(data => {
            let sesh = req.session;
            res.render('Diary', {data:data, usedTime:myTime, moment: moment, loggedIn:sesh.loggedIn})
        })
        .catch(err=>console.log(err))
    })
})

//Route for 'add indslag'
app.get('/add', (req, res) => {
    let sesh = req.session;
    res.render('Add', {loggedIn:sesh.loggedIn})
})

//Route for 'ret afspadsering'
app.get('/ret', (req, res) => {
    let sesh = req.session;
    usedTime.find({username:sesh.username}).then(data => {
        let sesh = req.session;
        res.render('Ret', {data:data, moment: moment, loggedIn:sesh.loggedIn})
    })
})

//Route for 'add indslag'
app.get('/use', (req, res) => {
    let sesh = req.session;
    res.render('Use', {loggedIn:sesh.loggedIn})
})

//Route for 'saving indslag'
app.post('/add-to-diary', (req, res) => {
    //save the data on the database
    let sesh = req.session;
    const Data = new Diary({
        username:sesh.username,
        title:req.body.title,
        description:req.body.description,
        startDate:req.body.startDate,
        endDate:req.body.endDate
    })

    Data.save().then(() => {
        res.redirect('/diary')
    }).catch(err=>console.log(err))
})

//Route for 'using hours'
app.post('/remove-hours', (req, res) => {
    //save the data on the database
    let sesh = req.session;
    const Data = new usedTime({
        username:sesh.username,
        usedTime:req.body.time
    })

    Data.save().then(() => {
        res.redirect('/diary')
    }).catch(err=>console.log(err))
})

//Route for diary ID
app.get('/diary/:id', (req, res) => {
    Diary.findOne({
        _id: req.params.id
    }).then(data=> {
        let sesh = req.session;
        res.render('Page', {data:data, moment:moment, loggedIn:sesh.loggedIn})
    }).catch(err => console.log(err))
})

//Route for diary ID edit
app.get('/diary/edit/:id', (req, res) => {
    Diary.findOne({
        _id: req.params.id
    }).then(data => {
        let sesh = req.session;
        res.render('Edit', {data: data, loggedIn:sesh.loggedIn})
    }).catch(err => console.log(err))
})

//Edit data in database
app.put('/diary/edit/:id', (req, res) => {
    Diary.findOne({
        _id:req.params.id
    }).then(data => {
        data.title = req.body.title
        data.description = req.body.description
        data.startDate = req.body.startDate
        data.endDate = req.body.endDate
        data.save().then(() => {
            let sesh = req.session;
            res.redirect('/diary', {loggedIn:sesh.loggedIn})
        }).catch(err => console.log(err))
    }).catch(err => console.log(err))
})

//delete data from database
app.delete('/data/delete/:id', (req, res) => {
    let sesh = req.session;
    Diary.findByIdAndDelete({
        _id:req.params.id
    }).then(()=> {
        res.redirect('/diary')
    }).catch(err => console.log(err))
})

//Delete 'ret fejl'
app.delete('/hours/delete/:id', (req, res) => {
    usedTime.findByIdAndDelete(req.params.id)
    .then(()=> {
        res.redirect('/ret')
    }).catch(err => console.log(err))
})

/*LOGIN STUFF*/

//Route for 'login'
app.get('/login', (req, res) => {
    let sesh = req.session;
    res.render('Login', {title:'Login', loggedIn:sesh.loggedIn, error:null})
})

//Route for 'register new account'
app.get('/register', (req, res) => {
    let sesh = req.session;
    res.render('Register', {title:'Ny bruger', loggedIn:sesh.loggedIn, error:null})
})

app.get('/logout', (req, res) => {
    req.session.destroy()
    res.redirect('/')
})

app.post('/create-account', async(req, res) => {
    let sesh = req.session;
    let username = req.body.username
    let password = req.body.password
  
    if (username != '' && password != '') {
        let userSearch = await Users.findOne({username: username})
        .then(async (data) => {
            if (!data) {
                let saltRounds = 10
                let passSalt = await bcrypt.genSalt(saltRounds, async(err, salt) => {
                    let passHash = await bcrypt.hash(password, salt, async(err, hash) => {
                        let newUser = Users({username:username, password:hash})
                        newUser.save()
                        res.render('login', {error:'Please login to your new account', title:'Login', loggedIn:sesh.loggedIn})
                    })
                })
            } else {
                res.render('register', {error:'Username taken', title:'Ny bruger', loggedIn:sesh.loggedIn})
            }
        })
    }else {
        res.render('register', {error:'Did you input shit?', title:'Ny bruger', loggedIn:sesh.loggedIn})
    }
});

app.post('/login', async (req, res) => {
    let username = req.body.username
    let password = req.body.password
    let loginSuccess = false;
    let sesh = req.session;
    sesh.loggedIn = false;

    let users = Users;
    let qry = {username:username}

    if (username != '' && password != '') {
        let usersResult = await users.findOne(qry)
        .then(async(data) => {
            if (data) {
                //check if password matches
                let passResult = await bcrypt.compare(password, data.password)
                .then((isMatch) => {
                    //ok - set sessions
                    sesh.loggedIn = true;
                    sesh.username = req.body.username;
                    loginSuccess = true;

                })
            }
        })
    }
    if (loginSuccess === true) {
        res.redirect('/')
    }else {
        res.render('login', {title:'Login', loggedIn:false, error:'Invalid login'})
    }
})

//*CREATE SERVER*
app.listen(process.env.PORT || 3000, () => console.log('server running on port 3000'))

