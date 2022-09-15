const axios = require('axios');
const StoreModel = require("../../utils/models/StoreModel");
const SessionModel = require("../../utils/models/SessionModel");
const {CarrierService, FulfillmentService,Webhook } = require('@shopify/shopify-api/dist/rest-resources/2022-07/index.js');
const { default: Shopify } = require("@shopify/shopify-api");
require("dotenv").config();

const HOST = process.env.SHOPIFY_APP_URL

const registerFulfillment =  `mutation {
  fulfillmentServiceCreate(
    name: "Fulfillment by Sendbox",
    trackingSupport: true, 
    callbackUrl:"https://sleepy-shelf-70000.herokuapp.com",
    fulfillmentOrdersOptIn:true 
    inventoryManagement:true
    ) {
    userErrors {
      message
    }
    fulfillmentService {
      id
      location {
          id
        }
    }
  }
}` 




const verifySettings = (app) => {
    app.post("/verify_auth", async (req, res) => {

      const getShopUrl = req.headers.referer;
      const shopUrl = new URL(getShopUrl);
      const params = new URLSearchParams(shopUrl.search);
      const shop = params.get("shop");
      console.log(shop);
      const response = req.body;
      console.log(response);
      const session = await Shopify.Utils.loadOfflineSession(shop)
      console.log(session, "fffffffffh");
        
            const  data  = await axios.get(
                `https://live.sendbox.co/oauth/profile` ,
                 {
                   headers: {
                     "Access-Token": `Basic ${response.values.authToken}`,
                     "app-id": `${response.values.appId}`,
                   },
                 }
               );
               console.log(data);
             
                //then find the user in the db using shop and update it.
                 await StoreModel.findOneAndUpdate({shop },
                  {
                    authToken: response?.values.authToken,
                    appId: response?.values.appId,
                  }
                );
                res.status(200).send("Successful");   
    })

     //handle submitting store details 
     app.post("/store_details", async (req, res) => {

         //get out the shop url
    const getShopUrl = req.headers.referer;
    const shopUrl = new URL(getShopUrl);
    const params = new URLSearchParams(shopUrl.search);
    const shop = params.get("shop");
    console.log(shop);

    const response = req.body;
    console.log(response);
    const dd = response.values.fullname;
    console.log(dd);

     //use shop url to find store owner in the db then update response
     await StoreModel.findOneAndUpdate({shop },
        {
          fullName: response.values.fullname,
          phone: response.values.phone,
          country: response.values.country,
          state: response.values.state,
          lineAddress1: response.values.lineAddress1,
          lineAddress2: response.values.lineAddress2,
          postalCode: response.values.postal_code,
          city:response.values.city
        }
      );
      res.status(200).send("Successful");
     })

      //handle submitting shipping fee details
  app.post("/shipping_fee", async (req, res) => {
    //get out shop url
    const getShopUrl = req.headers.referer;
    const shopUrl = new URL(getShopUrl);
    const params = new URLSearchParams(shopUrl.search);
    const shop = params.get("shop");
    console.log(shop);

    const response = req.body;
    console.log(response);
    //use shop url to find store owner in the db then update response

    //if activte sendbox-shipping is set to false delete carrier service that has been created
    //find accessToken, authToken and appId from db
    const dbObj = await StoreModel.findOne({shop });
    //const accessToken = dbObj.accessToken;
    const _id = dbObj?.carrierId;
    console.log({ _id });

    //function to update database
    const  _updateDb  = async (rt) =>{
      const gh = await StoreModel.findOneAndUpdate({shop}, rt)
      return gh
   }
   //load store session
   const session = await Shopify.Utils.loadOfflineSession(shop)

    if (response.values.activate === false) {
      //delete the carrier service
      CarrierService.delete({
        session: session,
        id: `${dbObj?.carrierId}`,
      });
      dbObj.activate = response.values?.activate;
      //delete carrier id from db;
      dbObj.carrierId = undefined;
      dbObj.save();
    }

    if (
      response.values.activate == true &&
      response.values.adjustFee == "flat"
    ) {
      //check that carrier service doesn't exist already by checking the db for carrier_id
      if (dbObj.carrierId) {
        _updateDb({
          adjustFee:response.values.adjustFee,
          amount: parseInt(response.values.amount), 
          activate:response.values.activate,
          activateFreeShipping:response.values.freeShipping,
          spendLimit:parseInt(response.values.spendLimit)|| 0
        });
       /*  dbObj.adjust_fee = response.values.adjustFee;
        dbObj.amount = parseInt(response.values.amount);
        dbObj.activate = response.values.activate;
        dbObj.save(); */
      } else {
        //create a new carrier service
        const carrier_service = new CarrierService({ session:session});
        carrier_service.name = "Sendbox Shipping";
        carrier_service.callback_url = `${HOST}/shipping_callback`;
        carrier_service.service_discovery = true;
        await carrier_service.save({});
        //save the carrier service_id, adjustFee type, amount

        const allCarrierService = await CarrierService.all({ session:session });
        console.log(allCarrierService);
        const SCS =  allCarrierService.map((cs) => {
          console.log(cs);
          
          if (cs.name === "Sendbox Shipping") {
         _updateDb({
          adjustFee:response.values.adjustFee,
          amount: parseInt(response.values.amount), 
          activate:response.values.activate,
          carrierId:cs.id,
          activateFreeShipping:response.values.freeShipping,
          spendLimit:parseInt(response.values.spendLimit)
        });
          
            console.log(cs.id, "the id you need");
          }
        });
      }
    }

    //handle increasing shipping fee by percentage
    if (
      response.values.activate == true &&
      response.values.adjustFee == "increase"
    ) {
      //check that carrier service doesn't already exist just save increase details don't create new service
      if (dbObj?.carrierId) {
        _updateDb({
          adjustFee:response.values.adjustFee,
          increasePrecentage:parseInt(response.values.percentage),
          activate:response.values.activate,
          activateFreeShipping:response.values.freeShipping,
          spendLimit:parseInt(response.values.spendLimit)|| 0
        })
       /*  dbObj.adjust_fee = response.values.adjustFee;
        dbObj.increasePrecentage = parseInt(response.values.percentage);
        dbObj.activate = response.values.activate;
        dbObj.save(); */
      } else {
        //create a new carrier service
        const carrier_service = new CarrierService({
          session:session,
        });
        carrier_service.name = "Sendbox Shipping";
        carrier_service.callback_url = `${HOST}/shipping_callback`;
        carrier_service.service_discovery = true;
        await carrier_service.save({});
        //save the carrier service_id, adjustFee type, amount

        const allCarrierService = await CarrierService.all({
          session:session,
        });
        console.log(allCarrierService);
        const SCS = allCarrierService.map((cs) => {
          console.log(cs);
          if (cs.name === "Sendbox Shipping") {
            console.log(cs.id, "the id you need");
            _updateDb({
              adjustFee:response.values.adjustFee,
              increasePrecentage:parseInt(response.values.percentage),
              activate:response.values.activate,
              activateFreeShipping:response.values.freeShipping,
              spendLimit:parseInt(response.values.spendLimit)|| 0,
              carrierId:cs.id
            })
          }
        });
      }
    }

    //handle decreasing shipping fee by percentage

    if (
      response.values.activate == true &&
      response.values.adjustFee == "decrease"
    ) {
      if (dbObj?.carrierId) {
        _updateDb({
          adjustFee:response.values.adjustFee,
          decreasePrecentage:parseInt(response.values.percentage),
          activate:response.values.activate,
          activateFreeShipping:response.values.freeShipping,
          spendLimit:parseInt(response.values.spendLimit)|| 0
        })
      } else {
        //create a new carrier service
        const carrier_service = new CarrierService({
          session:session,
        });
        carrier_service.name = "Sendbox Shipping";
        carrier_service.callback_url = `${HOST}/shipping_callback`;
        carrier_service.service_discovery = true;
        await carrier_service.save({});
        //save the carrier service_id, adjustFee type, amount

        const allCarrierService = await CarrierService.all({
          session:session,
        });
        console.log(allCarrierService);
        const SCS = allCarrierService.map((cs) => {
          console.log(cs);
          if (cs.name === "Sendbox Shipping") {
            console.log(cs.id, "the id you need");
            _updateDb({
              adjustFee:response.values.adjustFee,
              decreasePrecentage:parseInt(response.values.percentage),
              activate:response.values.activate,
              activateFreeShipping:response.values.freeShipping,
              spendLimit:parseInt(response.values.spendLimit)|| 0,
              carrierId:cs.id,
            })
          }
        });
      }
    }

    //handle shipping set to sendbox quotes
    if (
      response.values.activate == true &&
      response.values.adjustFee == "realtime"
    ) {
      if (dbObj?.carrierId) {
        _updateDb({
          adjustFee:response.values.adjustFee,
          activate:response.values.activate,
          activateFreeShipping:response.values.freeShipping,
          spendLimit:parseInt(response.values.spendLimit)|| 0,
        })
      } else {
        //create a new carrier service

        const carrier_service = new CarrierService({
          session:session,
        });
        carrier_service.name = "Sendbox Shipping";
        carrier_service.callback_url = `${HOST}/shipping_callback`;
        carrier_service.service_discovery = true;
        await carrier_service.save({});
        //save the carrier service_id, adjustFee type,

        const allCarrierService = await CarrierService.all({
          session:session,
        });
        console.log(allCarrierService);
        const SCS = allCarrierService.map((cs) => {
          console.log(cs);
          if (cs.name === "Sendbox Shipping") {
            console.log(cs.id, "the id you need");
            _updateDb({
              adjustFee:response.values.adjustFee,
              activate:response.values.activate,
              activateFreeShipping:response.values.freeShipping,
              spendLimit:parseInt(response.values.spendLimit) || 0,
              carrierId:cs.id
            })
          
          }
        });
      }
    }
    res.status(200).send("Successful");
  });

  //endpoint to register sendbox fulfillment service

  app.post("/activate_ful", async (req, res) =>{
    const getShopUrl = req.headers.referer;
    const shopUrl = new URL(getShopUrl);
    const params = new URLSearchParams(shopUrl.search);
    const shop = params.get("shop");
    console.log(shop);

    const response = req.body
    console.log(response)
    if(response.values.fulfillment === true){
      const session = await Shopify.Utils.loadOfflineSession(shop) 
      const client = new Shopify.Clients.Graphql(session.shop, session.accessToken);
      const fulfillment = await client.query({
        data: registerFulfillment,
      }); 
      console.log(JSON.stringify(fulfillment)); 
      await StoreModel.findOneAndUpdate({ shop }, { fulfillment:response.values.fulfillment });
      res.status(200).send("Successful");
    }  
  })

   //send db object to the front
   app.get("/dbobj", async (req, res) => {
    //get out shop url
    const getShopUrl = req.headers.referer;
    const shopUrl = new URL(getShopUrl);
    const params = new URLSearchParams(shopUrl.search);
    const shop = params.get("shop");
    console.log(shop);

    const dbObj = await StoreModel.findOne({shop });
    res.send({ dbObj });
    //res.send("working")
  });

  app.post("/webhooks/app_uninstalled", async (req, res) =>{
    const shop = req.headers["x-shopify-shop-domain"];
    console.log(shop); 

  await StoreModel.findOneAndUpdate({ shop }, { isActive: false}, {carrierId:undefined});
  await SessionModel.deleteMany({ shop });
  res.status(200).end();
  })

 /*  app.post("/check", async (req, res) => {
    const response = req.body
    const shop = 'wavey-test.myshopify.com'
    const session = await Shopify.Utils.loadOfflineSession(shop)
    //console.log(session, "fffffffffh");
    console.log(session.shop, "jjjjkf")
    console.log(session.accessToken);
    const ful_ser = await Webhook.all({
      session: session,
    });
    console.log(ful_ser); 
   res.send("working");
 }); */

}

module.exports = verifySettings 