const StoreModel = require("../../utils/models/StoreModel"); 

const productsUpdateHandler = async (topic, shop, webhookRequestBody) => {
    console.log(topic);
    //Pass the data here.
    console.log(webhookRequestBody);
  };
  
  module.exports = productsUpdateHandler;
  