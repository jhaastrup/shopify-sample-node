const { Shopify } = require("@shopify/shopify-api"); 
const axios = require('axios'); 
const CountryObj = require('../../countries.js');
const StoreModel = require("../../utils/models/StoreModel");
require("dotenv").config();
const HOST = process.env.SHOPIFY_APP_URL

const Ful = `
query {
  shop {
    assignedFulfillmentOrders(first: 10, assignmentStatus: FULFILLMENT_REQUESTED) {
      edges {
        node {
          id
          destination {
            firstName
            lastName
            address1
            city
            province
            zip
            countryCode
            phone
          }
          lineItems(first: 10) {
            edges {
              node {
                id
                lineItem {
                  name
                  sku
                }
                remainingQuantity
              }
            }
          }
          merchantRequests(first: 10, kind: FULFILLMENT_REQUEST) {
            edges {
              node {
                message
              }
            }
          }
        }
      }
    }
  }
}

`; 

const acceptFul = `
mutation acceptFulfillmentRequest($id: ID!, $message: String){
  fulfillmentOrderAcceptFulfillmentRequest(id: $id, message: $message){
    fulfillmentOrder {
      status
      requestStatus
    }
  }
}

`;

const createFul = `mutation fulfillmentCreateV2($fulfillment: FulfillmentV2Input!) {
  fulfillmentCreateV2(fulfillment: $fulfillment) {
    fulfillment {
      id
      status
      trackingInfo {
        company
        number
        url
      }
    }
    userErrors {
      field
      message
    }
  }
}
`;

const inventoryLevel = `
query getInventoryItemByID($id: ID!) {
  inventoryItem(id: $id) {
    id
    inventoryLevels (first:6) {
      edges {
        node {
          id
          available
        }
      }
    }
  }
}
`;

const updateInventory = `
mutation adjustInventoryLevelQuantity($inventoryAdjustQuantityInput: InventoryAdjustQuantityInput!) {
  inventoryAdjustQuantity(input: $inventoryAdjustQuantityInput) {
    inventoryLevel {
      available
    }
    userErrors {
      field
      message
    }
  }
}
`;

const fulfillmentService = (app) => {

    app.post("/fulfillment_order_notification", async (req, res) => {
        const shop = req.headers["x-shopify-shop-domain"];
        console.log(shop);
        const notifictionResponse = req.body;
        console.log(notifictionResponse);
    
           //check that this is a fulfillment request
          if(notifictionResponse.kind == "FULFILLMENT_REQUEST"){
            console.log(notifictionResponse, "jjjdusy put a st");
            //find accessToken, authToken and appId from db 
            const dbObj = await StoreModel.findOne({shop})
            const accessToken =  dbObj.accessToken;
            const authToken = dbObj.authToken;
            const appId = dbObj.appId;
    
    
        const client = new Shopify.Clients.Graphql(`${shop}`, accessToken);
    
        const { body } = await client.query({
          data: Ful, 
        });
    
        console.log(JSON.stringify(body));
      
        //console.log(body.data.shop.assignedFulfillmentOrders.edges)
        const dets = body.data.shop.assignedFulfillmentOrders.edges;
        console.log(dets);
        //console.log(JSON.stringify(dets));
        const id = dets.map((det) => det.node.id);
        console.log(id[0]);
        const _id = id[0];
        console.log(_id) 
    
        //send the order details to sendbox with then 
        //after they accept you then accept on the shopify side 
    
        //build the order payload 
        const itemDets = dets.map((det) =>det.node.lineItems);
        console.log(itemDets);
        console.log(JSON.stringify(itemDets));
    
        const destination = dets.map((det) =>det.node.destination)
        console.log(destination);
    
        const delivery_address = {
          first_name: destination[0].firstName, 
          last_name:destination[0].lastName, 
          phone:destination[0].phone || "",
          state_zone:destination[0].province,
          city:destination[0].city, 
          state:destination[0].province,
          country:destination[0].countryCode, 
          street:destination[0].address1, 
          post_code:destination[0].zip,
        }
    
        console.log(delivery_address, "checkkkkk");
    
        let _item = {}
        let allItems = []
        let singleItem = {}
    
        itemDets.forEach((obj) => { 
          for (const node in obj){
            obj[node].forEach((itemObj) => {
              for (const item in itemObj){
                singleItem = itemObj[item]
              _item = {name:singleItem.lineItem.name, sku:singleItem.lineItem.sku, quantity:singleItem.remainingQuantity, description:""}
                allItems.push(_item)
              console.log(_item)
              }
            })
          }
        })
    
        const orderPayload ={
          callback_url:`${HOST}/sendbox_order_notification?order_id=${_id}`,
          delivery_address:delivery_address,
          items: allItems,  
          shop_url:shop
        }
        
        console.log(JSON.stringify(orderPayload));
    
        //now post to sendbox 
        try {
          const {data} = await axios.post(`${process.env.BASE_URL}/warehouse/order_request`, orderPayload, {
            headers:{
              "Access-Token":`Basic ${authToken}`, 
              "app-id":`${appId}`,
                "Content-type": "application/json",
            }
        });
        console.log(data);
          
        } catch (error) {
          console.log(error)
        }
    
          } 
        //then create a fulfillment on shopify
        res.status(200).end();
      });

       //endpoint to serve as a callback url for sendbox
  app.post("/sendbox_order_notification", async(req, res) =>{
    const response = req.body
    console.log({response});
    //use shop_url to pull out access_token
    const dbObj = await StoreModel.findOne({shop:response.shop_url})
    const accessToken =  dbObj.accessToken
    const client = new Shopify.Clients.Graphql(`${response.shop_url}`, accessToken);

    const _order_id = req.query.order_id
    console.log({_order_id}); 
    //wait for sendbox to send fulfillment status then accept the fulfillment request on shopify 
    if(response.status == "assign_to_warehouse_agent"){
      //use response.shop_url to check the db and then get the access_token
      //accept on shopify
         const result = await client.query({
        data:{
          query: acceptFul, variables:{id:_order_id, message:"Order has been assigned to Warehouse Agent."}
        }
     });
     console.log(JSON.stringify(result));
    }

    if(response.status == "delivered"){

      //now create the fulfillment on shopify 

      const fulResponse = await client.query({
        data:{
          query: createFul, variables:{
            fulfillment: {
                notifyCustomer: true,
                trackingInfo: {
                    company: "Sendbox",
                    number: response.tracking_code,
                    url: `${HOST}`
                },
                lineItemsByFulfillmentOrder: [
                    {
                        fulfillmentOrderId: _order_id
                    }
                ]
            }
          }     
        }
      });
      console.log(JSON.stringify(fulResponse));
    }
  
    res.status(200).send("Working");
  })

  
   /**
   * Create product endpoint this serves as a webhook for shopify
   * to alert sendbox anytime a new product is created.
   */

    app.post("/create_product", async(req, res) =>{
        //console.log({req});
        const shop = req.headers["x-shopify-shop-domain"];
        console.log(shop);
        const response = req.body
        const _id = req.query.store_id
        console.log(_id);
        //check the db to be sure the store id matches
    
         //find accessToken, authToken and appId from db 
         const dbObj = await StoreModel.findOne({shop})
         const authToken = dbObj.authToken;
         const appId = dbObj.appId;
    
        console.log(JSON.stringify(response));
        //check that the product has shipping method set to sendbox-shipping
        const ful_service = response.variants.map((va) => va.fulfillment_service);
        console.log(JSON.stringify(ful_service));
        if(ful_service == "fulfillment-by-sendbox"){
           //then call warehouse create product  
           //build the payload
           //let result = objArray.map(a => a.foo);
           const images = response.images.map(image => image.src)
           const price = response.variants.map((va)=> va.price)
           const sku = response.variants.map((va)=> va.sku);
           const inventory_id = response.variants.map((va)=>va.inventory_item_id);
           console.log(sku[0]);
           console.log(inventory_id);
           console.log(images, price, sku, inventory_id);
    
           const productPayload ={
             name: response.title, 
             description:response.body_html,
             caption:response.body_html,
             quantity:0, 
             sku:sku[0],
             images:images,
             default_currency:"NGN",
             category:response.product_type || "others",
             region:"NG",
             variants:[],
             prices:[{value:price[0],currency:"NGN"}], 
             condition:"new",  
             inventory_id: `${inventory_id[0]}`,
             shop_url:shop, 
             callback_url:`${HOST}/update_inventory`
    
           }
    
            try {
    
            const {data} =  await axios.post(`${process.env.BASE_URL}/warehouse/product`, productPayload, {
              headers:{
                "Access-Token":`Basic ${authToken}`, 
                "app-id":`${appId}`,
                "Content-type": "application/json",
            }
            })
            console.log(data);
            
           } catch (error) {
              console.log(error)
           }
    
           console.log({productPayload});
        }
        res.status(200).end();
       })

        /***
    * Update product endpoint::this servers as a webhook for 
    * shopify to update sendbox when a product is updated. 
    */

   app.post("/update_product", async(req, res) =>{
    const shop = req.headers["x-shopify-shop-domain"]; 
    const response = req.body 

     //find accessToken, authToken and appId from db 
     const dbObj = await StoreModel.findOne({shop})
     const authToken = dbObj.authToken;
     const appId = dbObj.appId;

    console.log(JSON.stringify(response)); 
      //check that the product has shipping method set to sendbox-shipping
      const ful_service = response.variants.map((va) => va.fulfillment_service); 
      if(ful_service == "fulfillment-by-sendbox"){
        //then call warehouse create product  
        //build the payload
        //let result = objArray.map(a => a.foo);
        const images = response.images.map(image => image.src)
        const price = response.variants.map((va)=> va.price)
        const sku = response.variants.map((va)=> va.sku);
        const inventory_id = response.variants.map((va)=>va.inventory_item_id);
        console.log(sku[0]);
        console.log(inventory_id);
        console.log(images, price, sku, inventory_id);
 
        const productPayload ={
          name: response.title, 
          description:response.body_html,
          caption:response.body_html,
          quantity:0, 
          sku:sku[0],
          images:images,
          default_currency:"NGN",
          category:response.product_type || "others",
          region:"NG",
          variants:[],
          prices:[{value:price[0],currency:"NGN"}], 
          condition:"new",  
          inventory_id: `${inventory_id[0]}`,
          shop_url:shop, 
          callback_url:`${HOST}/update_inventory`
 
        }
 
         try {
 
         const {data} =  await axios.post(`${process.env.BASE_URL}/warehouse/product`, productPayload, {
           headers:{
            "Access-Token":`Basic ${authToken}`, 
            "app-id":`${appId}`,
             "Content-type": "application/json",
         }
         })
         console.log(data);
         
        } catch (error) {
           console.log(error)
        }
 
        console.log({productPayload});
     }


      res.status(200).end();
   })

     /***
    * update inventory
    * serves as a callback for sendbox to update product inventory
    */

      app.post("/update_inventory", async(req, res) =>{
        const response = req.body
        console.log({response})
       //use shop_url to pull out access_token
       const dbObj = await StoreModel.findOne({shop:response.shop_url})
       const accessToken =  dbObj.accessToken
        const client = new Shopify.Clients.Graphql(`${response.shop_url}`, accessToken);
        //retrive inventory level 
        const result = await client.query({
          data:{
            query: inventoryLevel, variables:{id:`gid://shopify/InventoryItem/${response.inventory_id}`}
          }
       });
       console.log(JSON.stringify(result));
    
       //update the qunantity
       const invenLevelId = result.body.data.inventoryItem.inventoryLevels.edges[0].node.id
       console.log(invenLevelId);
    
       const updateResponse = await client.query({
        data:{
          query: updateInventory, variables:{
            inventoryAdjustQuantityInput: {
              inventoryLevelId: `${invenLevelId}`,
              availableDelta: response.quantity
            }
          }
          
        }
       })
    
       console.log(JSON.stringify(updateResponse));
        res.status(200).send("Successful")    
       })
}

module.exports = fulfillmentService

