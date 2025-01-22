const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true
    },
    verified: {
        type:Boolean,
        default: false
    },
    verificationToken: String,
    addresses: [
        {
            name:String,
            mobileNo:String,
            houseNo:String,
            street:String,
            landmark:String,
            city:String,
            country:String,
            postcode:String
        }
    ],
    orders: [
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"order"
        }
    ],
    createdAt: {
        type:Date,
        default:Date.now
    }
});

const User = mongoose.model("User",userSchema);

module.exports = User;