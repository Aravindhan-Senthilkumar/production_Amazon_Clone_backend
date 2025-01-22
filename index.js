const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

const app = express();
const port = process.env.PORT;
const cors = require('cors');
app.use(cors());

app.use(bodyParser.urlencoded({ extended:false }));
app.use(bodyParser.json());

dotenv.config();

const jwt = require('jsonwebtoken');

const URI = process.env.MONGO_URI;

mongoose.connect(URI).then(() => {
    console.log('Connected to MongoDB')
}).catch((err) => {
    console.error('Error connecting to MongoDB',err)
});

app.listen(port,() => {
    console.log('Server is running on ' + port)
});

const User = require('./modals/User');
const Order = require('./modals/Order');

//function to send verification Email to the user
const sendVerificationEmail = async (email,verificationToken) => {
    //create a nodemailer transport

    const transporter = nodemailer.createTransport({
        //configure the email service
        service: "gmail",
        auth:{
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    })

    //compose the email message
    const mailOptions = {
        from: `"Amazon Clone" <${process.env.EMAIL_USER}>`,
        to:email,
        subject: "Email Verification",
        text: `Please click the following link to verify your email : http://localhost:8000/verify/${verificationToken}` 
    };

    //send the email
    try{
        await transporter.sendMail(mailOptions);
    }catch(error){
        console.error("Error sending Verification email",error)
    }
};


// endpoint to register in the app
app.post('/register',async (req,res) => {
    try{
        const { name,email,password } = req.body;

        //check if email is already registered
        const existingUser = await User.findOne({ email:email });
        if(existingUser){
            return res.status(400).json({ message: "Email already registered" })
        }

        //create a new User
        const newUser = new User({ name,email,password });

        //generate and store the verification code
        newUser.verificationToken = crypto.randomBytes(20).toString("hex");

        //save the user to the database
        await newUser.save();

        //send verification email to the user
        sendVerificationEmail(newUser.email,newUser.verificationToken);
    }catch(error){
        console.error("Error Registering User",error);
        res.status(500).json({ message:"Registration Failed" })
    }
})

//endpoint to verify the email
app.get('/verify/:token',async (req,res) => {
    try{
        const token = req.params.token;

        //find the user with the given verification token
        const user = await User.findOne({ verificationToken:token })

        if(!user){
            return res.status(404).json({ message: "Invalid verification token" })
        }

        //Mark the user as verified 
        user.verified = true;
        user.verificationToken = undefined;

        await user.save();

        res.status(200).json({ message: "Email verified successfully" });
    }catch(error){
        res.status(500).json({ message: "Email verification Failed" })
    }
})

//function for generating secretkey

const generateSecretKey = () => {
    const secretKey = crypto.randomBytes(32).toString("hex");

    return secretKey;
}

const secretKey = generateSecretKey();

//endpoint to login the
app.post('/login',async (req,res) => {
    try{
        const { email,password } = req.body;
        //check if the user exists
        const user = await User.findOne({ email })

        if(!user){
            return res.status(401).json({ message: "Invalid email or password" });
        }

        //check if the password is correct
        if(user.password !== password){
            return res.status(401).json({ message: "Invalid password" });
        }

        //generate a token
        const token = jwt.sign({ userId:user._id },secretKey);

        res.status(200).json({ token })

    }catch(error){
        res.status(500).json({ message: "Login failed" })
    }
})

//end point to save a address to the backend
app.post('/address', async (req,res) => {
    try{
        const { userId,address } = req.body;

        //find the user by userId
        const user = await User.findById(userId);
        if(!user){
            return res.status(404).json({ message:"User not found" })
        }

        //add the new address to the user's addresses array
        user.addresses.push(address)

        //save the updated user in to the backend
        await user.save();

        res.status(200).json({ message:"Address added successfully" })
    }catch(error){
        res.status(404).json({ message:"Error storing in Address" })
    }
})

//end point to get all the addresses stored of a particular user
app.get('/addresses/:userId',async(req,res)=>{
    try{
        const userId = req.params.userId;

        const user = await User.findById(userId)

        if(!user){
            return res.status(404).json({ message:"User not found" })
        }
        const addresses = user.addresses
        res.status(200).json({addresses})
    }catch(error){
        res.status(500).json({ message:"Error retrieving addresses" })
    }
})

//endpoint to store all the orders 
app.post('/orders',async(req,res) => {
    try{
        const { userId,cartItems,totalPrice,shippingAddress,paymentMethod } = req.body;
        const user = await User.findById(userId);
        if(!user){
            return res.status(404).json({ message:"User not found" });
        }

        //create an array of product objects from the cart item
        const products = cartItems.map((item) => ({
            name:item.title,
            quantity:item.quantity,
            price:item.price,
            image:item.image
        }))

        //create a new order
        const order = new Order({
            user:userId,
            products:products,
            totalPrice:totalPrice,
            shippingAddress:shippingAddress,
            paymentMethod:paymentMethod
        })

        await order.save();

        res.status(200).json({ message:"Order created successfully" })
    }catch(error){
        console.log("Error",error)
        res.status(500).json({ message: "Error creating orders" })
    }
})

//get the user profile
app.get('/profile/:userId',async(req,res) => {
    try{
        const userId = req.params.userId;

        const user = await User.findById(userId);

        if(!user){
            res.status(404).json({ message:"User not found" })
        }

        res.status(200).json({user});
    }catch(error){
        re.status(500).json({ message:"Error retrieving the user profile" })
    }
})

app.get('/orders/:userId',async(req,res)=>{
    try{
        const userId = req.params.userId;

        const orders = await Order.find({ user: userId }).populate("user");

        if(!orders || orders.length === 0){
            return res.status(404).json({ message:"No orders found for this user" })
        }

        res.status(200).json({orders});
    }catch(error){
        res.status(500).json({ message:"Error" })
    }
})