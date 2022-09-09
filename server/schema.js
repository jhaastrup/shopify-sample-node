import mongoose from "mongoose";

//flesh out schema
const shopifyDetails = new mongoose.Schema({
  store_url: String,
  access_token: String,
  app_id: String,
  auth_token: String,
  store_id: String,
  fullname: String,
  country: String,
  state: String,
  lineAddress1: String,
  lineAddress2: String,
  phone: String,
  increasePrecentage: Number,
  decreasePrecentage: Number,
  amount: Number,
  adjust_fee: String,
  carrier_id: String,
  activate: Boolean,
  city: String,
  postal_code: String,
  activate_freeShipping: Boolean,
  spendLimit: Number,
});

//model

const shopifyStoreDetails = mongoose.model(
  "shopifyStoreDetails",
  shopifyDetails
);

export default shopifyStoreDetails;
