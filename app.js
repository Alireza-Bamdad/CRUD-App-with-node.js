const express = require("express");
const app = express();
const userModel = require("./models/user");
const postModel = require("./models/post");
const cookieParser = require("cookie-parser");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

app.set('view engine' , 'ejs');
app.use(express.json());
app.use(express.urlencoded({extended : true}));
app.use(cookieParser());
app.use(express.static("public"));



app.get('/',(req , res)=>{
    res.render('index')
})

app.get('/login', (req , res)=>{
    res.render('login')
})

// if login go to profile
app.get('/profile', isLoggedIn , async (req, res)=>{
    let user = await userModel.findOne({email : req.user.email}).populate("posts");
    res.render('profile',{user})
    
});

app.get('/posts',isLoggedIn, async (req, res)=>{
    let user = await userModel.findOne({email : req.user.email}).populate("posts");

    let posts = await postModel.find({});
    // console.log(posts);
    res.render('posts',{posts , user})
    
});

app.get('/logout', (req, res) => {
    res.cookie("token","");
    res.redirect('/login');
})

app.post('/delete/:id', async (req, res)=>{

    let Posts = postModel.findOneAndDelete({ _id : req.params.id });
    console.log(Posts);
    res.redirect('/profile')

})

app.get('/like/:id', isLoggedIn , async (req, res)=>{
    let post = await postModel.findOne({ _id : req.params.id }).populate("user");
    // if not liked => add 
    if ( (post.likes.indexOf(req.user.userid)) === -1 ){
        post.likes.push(req.user.userid);
    }
    else{
        //if liked => remove
        post.likes.splice( post.likes.indexOf(req.user.userid), 1 )
    }
    await post.save()

    // console.log(post);
    res.redirect('/posts');
    
})
app.get('/edit/:id', isLoggedIn , async (req, res)=>{
    let post = await postModel.findOne({ _id : req.params.id }).populate("user");
    res.render('edit', {post});
    
});
app.post('/update/:id', isLoggedIn , async (req, res)=>{

    let post = await postModel.findOneAndUpdate(
        { _id : req.params.id },//get the post by id
        { content : req.body.content } // the ubdate filed
    );

    res.redirect('/profile');
    
})

app.post('/post', isLoggedIn , async (req, res)=>{
    let user = await userModel.findOne({email : req.user.email})
    let {content} = req.body;
    let post = await postModel.create({
        user :user._id,
        username : user.username,
        content,
    });
    user.posts.push(post._id);
    await user.save();
    res.redirect('/profile')
});



app.post('/register', async (req , res)=>{
    let {email, password, name, username, age} = req.body;
    
    let user = await userModel.findOne({email});
    if(user) return res.status(500).redirect('/');

    //hash the password
    bcrypt.genSalt(10, (err, salt)=>{
        bcrypt.hash(password , salt, async (err, hash)=>{
            // pas the information to daqtabase
            let user = await userModel.create({
                username,
                email,
                name,
                age,
                password : hash ,
            })
            let token = jwt.sign({email : email , userid : user._id} , "shhhh");
            res.cookie("token", token);

            res.redirect("/login")
        })
    })    

})

app.get('/delete/:id', async (req, res , next) => {
    let post =  await postModel.findOneAndDelete({ _id : req.params.id})
    res.redirect('/profile')
});

app.post('/login' , async (req , res)=>{
    let {email, password} = req.body;
    
    //check the exist user
    let user = await userModel.findOne({email});

    //if user not exist
    if(!user) return res.status(500).redirect('/login');
    
    //if user exist => check the password 
    bcrypt.compare(password, user.password, function(err, result){
        if(result) {
            let token = jwt.sign({email : email , userid : user._id} , "shhhh");
            res.cookie("token", token);
            res.status(200).redirect('/profile')
        }
        else res.redirect("/login")
    })



})



function isLoggedIn (req, res, next){
    // if not logged in 
    if (req.cookies.token===""){
        res.redirect('/login')
    }
    //if logged 
    else{
        let data = jwt.verify(req.cookies.token, "shhhh");
        req.user = data;
    }
    next();
}

app.listen(5000)