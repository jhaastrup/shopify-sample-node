const axios = require("axios");
const CountryObj = require("../../countries.js");
const StoreModel = require("../../utils/models/StoreModel");
require("dotenv").config();
const HOST = process.env.SHOPIFY_APP_URL;
const Express = require("express");

const createNewCarrier = (app) => {
  app.use(Express.json()); //MARK:- Use middleware here and not before processing webhooks or webhook processor is gonna break.
  //first do the callback that shopify will post shipping details to
  app.post("/shipping_callback", async (req, res) => {
    const data = req.body;
    const shop = req.headers["x-shopify-shop-domain"];
    console.log(shop);
    const dd = JSON.stringify(data);
    console.log(dd);
    //pull out items
    const items = data.rate.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      value: item.price,
      weight: item.grams,
    }));

    //pull out prices
    const prices = data.rate.items.map((item) => item.price);
    let allPrices = 0;
    console.log(prices);
    for (let i = 0; i < prices.length; i++) {
      allPrices += prices[i] / 100;
    }
    console.log({ allPrices });

    //calculate total weight of items
    let total_weight = 0;

    for (let i = 0; i < items.length; i++) {
      total_weight += items[i].weight;
    }
    const weight = total_weight / 1000;

    console.log(weight);

    //console.log(total_weight);
    //make country and state into correct format
    const origin_country_code = data.rate.origin.country;
    const origin_state_code = data.rate.origin.province;
    const destination_country_code = data.rate.destination.country;
    const destination_state_code = data.rate.destination.province;

    //origin information
    const Origin_CO = CountryObj.countries.find(
      ({ code }) => code === origin_country_code
    );
    const origin_country = Origin_CO?.name;

    let origin_state;

    const State_SO = Origin_CO.provinces;
    //check that the country has province
    if (State_SO.length) {
      const sn = State_SO.find(({ code }) => code === origin_state_code);
      origin_state = sn.name;
    }

    //destination information
    const Destination_CO = CountryObj.countries.find(
      ({ code }) => code === destination_country_code
    );
    const destination_country = Destination_CO?.name;

    let destination_state;

    const Dest_State_SO = Destination_CO.provinces;
    if (Dest_State_SO.length) {
      const sn = Dest_State_SO.find(
        ({ code }) => code === destination_state_code
      );
      destination_state = sn.name;
    }

    //build the payload you will then post

    const quotesPayload = {
      //origin_name: data.rate.origin.name,
      origin_name: "Customer X",
      origin_country: origin_country_code,
      origin_state: origin_state,
      origin_city: data.rate.origin.city,
      origin_street: data.rate.origin.address1,
      //origin_phone: '',
      // origin_phone: data.rate.origin.phone,

      destination_name: data.rate.destination.name,
      destination_country: destination_country_code,
      destination_state: destination_state,
      destination_city: data.rate.destination.city,
      destination_street: data.rate.destination.address1,
      //destination_phone: data.rate.destination.phone,
      //destination_phone: null,
      weight: weight,
      items: items,
    };

    console.log({ quotesPayload });

    //use shop to check the db and getout how to adjust the fee
    const dbObj = await StoreModel.findOne({ shop });

    /**
     *
     * @param {*} sendbox_fee
     * @param {*} dbObj
     * @returns
     */
    const calculateFee = (sendbox_fee, dbObj) => {
      let result = 0;
      let adjust_fee = dbObj?.adjustFee;

      if (adjust_fee === "flat") {
        result = (sendbox_fee + dbObj?.amount) * 100;
      } else if (adjust_fee === "increase") {
        result =
          (sendbox_fee + (sendbox_fee * dbObj?.increasePrecentage) / 100) * 100;
      } else if (adjust_fee === "decrease") {
        result =
          (sendbox_fee - (sendbox_fee * dbObj?.decreasePrecentage) / 100) * 100;
      } else {
        result = sendbox_fee * 100;
      }

      return result;
    };
    //console.log({quotesPayload});

    try {
      const { data } = await axios.post(
        `${process.env.BASE_URL}/shipping/shipment_delivery_quote`,
        quotesPayload,
        {
          headers: {
            "Access-Token": `Basic ${dbObj.authToken}`,
            "app-id": `${dbObj.appId}`,
            "Content-type": "application/json",
          },
        }
      );
      console.log(data, "sssssh");

      //finially send the response RATES to shopify in an array of objects
      //pull out shop url, find adjustFee from db and calculate total shipping fee

      const freeRates = data.rates.map((rate) => ({
        service_name: "Free Shipping",
        description: "Powered by Sendbox",
        service_code: rate.key,
        currency: rate.currency,
        total_price: 0.0,
      }));

      const rates = data.rates.map((rate) => ({
        service_name: "Standard Shipping",
        description: `Powered by Sendbox`,
        service_code: rate.key,
        currency: rate.currency,
        total_price: calculateFee(rate.fee, dbObj),
      }));

      if (
        dbObj.activateFreeShipping === true &&
        dbObj.spendLimit === allPrices
      ) {
        res.json({ rates: freeRates });
      } else {
        res.json({ rates: rates });
      }
      console.log(rates);
    } catch (error) {
      console.log(error);
    }
  });

  //lets try first
  app.get("/home", async (req, res) => {
    res.send("You are on Shopify side");
  });
};

module.exports = createNewCarrier;
