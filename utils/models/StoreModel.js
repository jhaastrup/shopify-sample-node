const mongoose = require("mongoose");

const StoreSchema = new mongoose.Schema({
  shop: { type: String, required: true, unique: true },
  isActive: { type: Boolean, required: true, default: false },
  accessToken:{type:String},
  appId:{type:String},
  authToken:{type:String},
  storeId:{type:String},
  fullName:{type:String},
  country:{type:String},
  state:{type:String},
  lineAddress1:{type:String},
  lineAddress2:{type:String},
  phone:{type:String},
  increasePrecentage:{type:Number},
  decreasePrecentage:{type:Number},
  amount:{type:Number},
  adjustFee:{type:String},
  carrierId:{type:String},
  activate:{type:Boolean},
  city:{type:String},
  postalCode:{type:String},
  activateFreeShipping:{type:Boolean},
  spendLimit:{type:Number}
});

const StoreModel = mongoose.model("Active_Stores", StoreSchema);

module.exports = StoreModel;
