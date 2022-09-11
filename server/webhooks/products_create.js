const StoreModel = require("../../utils/models/StoreModel"); 

const productsCreateHandler = async (topic, shop, webhookRequestBody) => {
  console.log("----> ", topic);
  console.log("---->", shop)
  console.log("----> ", webhookRequestBody);

 /*  const result = await fetch("localhost:5000/api", {
    method: "POST",
    body: webhookRequestBody,
  });

  console.log("----> ", result); */
};

module.exports = productsCreateHandler;

  