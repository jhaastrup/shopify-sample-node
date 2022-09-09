const axios = require('axios');
const StoreModel = require("../../utils/models/StoreModel");
const {CarrierService} = require('@shopify/shopify-api/dist/rest-resources/2022-07/index.js');
require("dotenv").config();

const HOST = process.env.SHOPIFY_APP_URL


const verifySettings = (app) => {
    app.post("/verify_auth", async (req, res) => {
        const getShopUrl = req.headers.referer;
        const shopUrl = new URL(getShopUrl);
        const params = new URLSearchParams(shopUrl.search);
        const shop = params.get("shop");
        console.log(shop);
        const response = req.body;
        console.log(response);

        try {
            const { data } = await axios.get(
                `${process.env.BASE_URL}/oauth/profile` ,
                 {
                   headers: {
                     "Access-Token": `Basic ${response.values.authToken}`,
                     "app-id": `${response.values.appId}`,
                   },
                 }
               );
               console.log(data);

               if (data.pk) {
                res.status(200).send("Successful");
                //then find the user in the db using shop and update it.
                 await StoreModel.findOneAndUpdate({shop },
                  {
                    authToken: response?.values.authToken,
                    appId: response?.values.appId,
                  }
                );
              }
            
        } catch (error) {
            if (error) {
                res
                  .status(500)
                  .send("Invalid Authtoken please get the correct token and try again");
              }
        }
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
    const accessToken = dbObj.accessToken;
    const _id = dbObj?.carrierId;
    console.log({ _id });

    //function to update database
    const  _updateDb  = async (rt) =>{
      const gh = await StoreModel.findOneAndUpdate({shop}, rt)
      return gh
   }

    if (response.values.activate === false) {
      CarrierService.delete({
        session: { shop, accessToken },
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
        const carrier_service = new CarrierService({
          session: { shop, accessToken },
        });
        carrier_service.name = "Sendbox Shipping";
        carrier_service.callback_url = `${HOST}/shipping_callback`;
        carrier_service.service_discovery = true;
        await carrier_service.save({});
        //save the carrier service_id, adjustFee type, amount

       

        const allCarrierService = await CarrierService.all({ 
          session: { shop, accessToken },
        });
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
          session: { shop, accessToken },
        });
        carrier_service.name = "Sendbox Shipping";
        carrier_service.callback_url = `${HOST}/shipping_callback`;
        carrier_service.service_discovery = true;
        await carrier_service.save({});
        //save the carrier service_id, adjustFee type, amount

        const allCarrierService = await CarrierService.all({
          session: { shop, accessToken },
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
          session: { shop, accessToken },
        });
        carrier_service.name = "Sendbox Shipping";
        carrier_service.callback_url = `${HOST}/shipping_callback`;
        carrier_service.service_discovery = true;
        await carrier_service.save({});
        //save the carrier service_id, adjustFee type, amount

        const allCarrierService = await CarrierService.all({
          session: { shop, accessToken },
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
          session: { shop, accessToken },
        });
        carrier_service.name = "Sendbox Shipping";
        carrier_service.callback_url = `${HOST}/shipping_callback`;
        carrier_service.service_discovery = true;
        await carrier_service.save({});
        //save the carrier service_id, adjustFee type,

        const allCarrierService = await CarrierService.all({
          session: { shop, accessToken },
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




}

module.exports = verifySettings 