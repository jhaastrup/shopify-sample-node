import axios from "axios";
import shopifyStoreDetails from "../schema.js";
import { CarrierService } from "@shopify/shopify-api/dist/rest-resources/2022-04/index.js";
import { Shopify } from "@shopify/shopify-api";
import "dotenv/config";
const HOST = process.env.HOST;

export default function verifySettings(app) {
  app.get("/home", async (req, res) => {
    res.send("You are on Shopify side");
  });

  app.post("/verify_auth", async (req, res) => {
    //console.log(req);
    const getShopUrl = req.headers.referer;
    const shopUrl = new URL(getShopUrl);
    const params = new URLSearchParams(shopUrl.search);
    const shop = params.get("shop");
    console.log(shop);
    const response = req.body;
    console.log(response);
    //use the response to call profile to verify the keys

    try {
      const { data } = await axios.get(
        `${process.env.BASE_URL}/oauth/profile`,
        {
          headers: {
            "Access-Token": `Basic ${response.values.authToken}`,
            "app-id": `${response.values.appId}`,
          },
        }
      );
      if (data.pk) {
        res.status(200).send("Successful");
        //then find the user in the db using shop and update it.
        const dbObj = await shopifyStoreDetails.findOneAndUpdate(
          { store_url: shop },
          {
            auth_token: response?.values.authToken,
            app_id: response?.values.appId,
          }
        );
      }
      console.log(data);
    } catch (error) {
      if (error) {
        res
          .status(500)
          .send("Invalid Authtoken please get the correct token and try again");
      }
    }
  });

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
    const dbObj = await shopifyStoreDetails.findOneAndUpdate(
      { store_url: shop },
      {
        fullname: response.values.fullname,
        phone: response.values.phone,
        country: response.values.country,
        state: response.values.state,
        lineAddress1: response.values.lineAddress1,
        lineAddress2: response.values.lineAddress2,
        postal_code: response.values.postal_code,
        city: response.values.city,
      }
    );
    res.status(200).send("Successful");
  });

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
    const dbObj = await shopifyStoreDetails.findOne({ store_url: shop });
    const accessToken = dbObj.access_token;
    const _id = dbObj?.carrier_id;
    console.log({ _id });

    //function to update database
    const _updateDb = async (rt) => {
      const gh = await shopifyStoreDetails.findOneAndUpdate(
        { store_url: shop },
        rt
      );
      return gh;
    };

    /* const createCarrier = async () => { 
          const carrier_service = new CarrierService({ session:{shop, accessToken}});
          carrier_service.name = "Sendbox Shipping";
          carrier_service.callback_url = `${HOST}/shipping_callback`;
          carrier_service.service_discovery = true;
            await carrier_service.save({});           
        }; */

    if (response.values.activate === false) {
      CarrierService.delete({
        session: { shop, accessToken },
        id: `${dbObj?.carrier_id}`,
      });
      dbObj.activate = response.values?.activate;

      //delete carrier id from db;
      dbObj.carrier_id = undefined;
      dbObj.save();
    }

    if (
      response.values.activate == true &&
      response.values.adjustFee == "flat"
    ) {
      //check that carrier service doesn't exist already by checking the db for carrier_id
      if (dbObj.carrier_id) {
        _updateDb({
          adjust_fee: response.values.adjustFee,
          amount: parseInt(response.values.amount),
          activate: response.values.activate,
          activate_freeShipping: response.values.freeShipping,
          spendLimit: parseInt(response.values.spendLimit) || 0,
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
        const SCS = allCarrierService.map((cs) => {
          console.log(cs);

          if (cs.name === "Sendbox Shipping") {
            _updateDb({
              adjust_fee: response.values.adjustFee,
              amount: parseInt(response.values.amount),
              activate: response.values.activate,
              carrier_id: cs.id,
              activate_freeShipping: response.values.freeShipping,
              spendLimit: parseInt(response.values.spendLimit),
            });

            console.log(cs.id, "the id you need");
            /*  dbObj.adjust_fee = response.values.adjustFee;
            dbObj.amount = parseInt(response.values.amount);
            dbObj.activate = response.values.activate;
            dbObj.carrier_id = cs.id;
            dbObj.activate_freeShipping = response.values.freeShipping;
            dbObj.spendLimit =  parseInt(response.values.spendLimit);
            dbObj.save();
            console.log(dbObj); */
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
      if (dbObj?.carrier_id) {
        _updateDb({
          adjust_fee: response.values.adjustFee,
          increasePrecentage: parseInt(response.values.percentage),
          activate: response.values.activate,
          activate_freeShipping: response.values.freeShipping,
          spendLimit: parseInt(response.values.spendLimit) || 0,
        });
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
              adjust_fee: response.values.adjustFee,
              increasePrecentage: parseInt(response.values.percentage),
              activate: response.values.activate,
              activate_freeShipping: response.values.freeShipping,
              spendLimit: parseInt(response.values.spendLimit) || 0,
              carrier_id: cs.id,
            });
            /*   dbObj.adjust_fee = response.values.adjustFee;
            dbObj.increasePrecentage = parseInt(response.values.percentage);
            dbObj.activate = response.values.activate;
            dbObj.carrier_id = cs.id;
            dbObj.save();
            console.log(dbObj); */
          }
        });
      }
    }

    //handle decreasing shipping fee by percentage

    if (
      response.values.activate == true &&
      response.values.adjustFee == "decrease"
    ) {
      if (dbObj?.carrier_id) {
        _updateDb({
          adjust_fee: response.values.adjustFee,
          decreasePrecentage: parseInt(response.values.percentage),
          activate: response.values.activate,
          activate_freeShipping: response.values.freeShipping,
          spendLimit: parseInt(response.values.spendLimit) || 0,
        });
        /*  dbObj.adjust_fee = response.values.adjustFee;
        dbObj.decreasePrecentage = parseInt(response.values.percentage);
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
              adjust_fee: response.values.adjustFee,
              decreasePrecentage: parseInt(response.values.percentage),
              activate: response.values.activate,
              activate_freeShipping: response.values.freeShipping,
              spendLimit: parseInt(response.values.spendLimit) || 0,
              carrier_id: cs.id,
            });
            /*  dbObj.adjust_fee = response.values.adjustFee;
            dbObj.decreasePrecentage = parseInt(response.values.percentage);
            dbObj.activate = response.values.activate;
            dbObj.carrier_id = cs.id;
            dbObj.save();
            console.log(dbObj); */
          }
        });
      }
    }

    //handle shipping set to sendbox quotes
    if (
      response.values.activate == true &&
      response.values.adjustFee == "realtime"
    ) {
      if (dbObj?.carrier_id) {
        _updateDb({
          adjustFee: response.values.adjustFee,
          activate: response.values.activate,
          activate_freeShipping: response.values.freeShipping,
          spendLimit: parseInt(response.values.spendLimit) || 0,
        });
        /*  dbObj.adjust_fee = response.values.adjustFee;
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
              adjustFee: response.values.adjustFee,
              activate: response.values.activate,
              activate_freeShipping: response.values.freeShipping,
              spendLimit: parseInt(response.values.spendLimit) || 0,
              carrier_id: cs.id,
            });
            /*  dbObj.adjust_fee = response.values.adjustFee;
            dbObj.activate = response.values.activate;
            dbObj.carrier_id = cs.id;
            dbObj.update();
            //dbObj.save();
            console.log(dbObj); */
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

    const dbObj = await shopifyStoreDetails.findOne({ store_url: shop });
    res.send({ dbObj });
    //res.send("working")
  });

  //this will act like a webhook that is called when app is uninstalled

  app.post("/uninstall", async (req, res) => {
    const shop = req.body.domain;
    await shopifyStoreDetails.findOneAndDelete({ store_url: shop });
    console.log("STORE DELETED!!");
    res.send(200);
  });
}
