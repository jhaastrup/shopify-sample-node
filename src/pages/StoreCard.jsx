import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  Form,
  FormLayout,
  TextField,
  Button,
  Page,
  Heading,
  TextContainer,
  Select,
  Grid,
  Banner,
} from "@shopify/polaris";
//import { response } from "express";
import CountryObj from "../../countries_ui.js";

import { Formik, Field, FieldArray } from "formik";

export function StoreCard({ onSubmitted }) {
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [street, setStreet] = useState("");
  const [fullname, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [lineAddress1, setLineAddress1] = useState("");
  const [lineAddress2, setLineAddress2] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [dbCountry, setDbCountry] = useState("");
  const [dbState, setDbState] = useState("");
  const [showBanner, setShowBanner] = useState(false);

  /* const handleAppIdChange = useCallback((value) => setAppId(value), []);
  const handleAuthTokenChange = useCallback((value) => setAuthToken(value), []); */

  useEffect(() => {
    const loadData = async () => {
      const data = await axios.get("/dbobj");
      console.log(data, "from use effect");
      setFullName(data.data.dbObj?.fullName);
      setPhone(data.data.dbObj?.phone);
      setLineAddress1(data.data.dbObj?.lineAddress1);
      setLineAddress2(data.data.dbObj?.lineAddress2);
      setDbCountry(data.data.dbObj?.country);
      setDbState(data.data.dbObj?.state);
      setPostalCode(data.data.dbObj.postalCode);
      setCity(data.data.dbObj?.city);
      console.log(data.data.dbObj?.state);
    };
    loadData();
  }, []);

  const initialValues = {
    fullname: fullname,
    phone: phone,
    lineAddress1: lineAddress1,
    lineAddress2: lineAddress2,
    country: dbCountry,
    state: dbState,
    postal_code:postalCode,
    city:city
  };

  const countries = CountryObj.countries.map((con) => con.name);
  let states;

  if (setCountry) {
    console.log(country, "some string here");
    const con = CountryObj?.countries?.find(({ name }) => name === country);
    console.log(con);
    const states_name = con?.provinces;
    states = states_name?.map((st) => st.name);
    console.log(states);
  }

  return (
    <Formik
      initialValues={initialValues}
      enableReinitialize={true}
      onSubmit={ async (values, formikBag) => {
        console.log(values);
        const data = await axios.post("/store_details", { values });
        if(data.status === 200){
          setShowBanner(true);
        } 
      }}
    >
      {({
        values,
        errors,
        handleChange,
        handleSubmit,
        isValid,
        isSubmitting,
        setValues,
        submitForm,
      }) => {
        console.log({ errors, values });
        /*  const dd = values.country
         console.log(dd); */
        return (
          <Form onSubmit={handleSubmit}>
           {showBanner && <Banner
              title="Store Settings Saved Successfully"
              status="success"
              onDismiss={() => setShowBanner(false)}
            />}
            <TextContainer spacing="loose">
              <Heading>Store Settings</Heading>
              <p>
                Your store information, this will serve as origin details to calculate quotes.
              </p>
            </TextContainer>

            <FormLayout>
              <TextField
                name="fullname"
                label="Fullname"
                placeholder="Enter your fullname"
                value={values.fullname}
                onChange={(value) =>
                  handleChange({
                    target: { id: "fullname", value },
                  })
                }
              />

              <TextField
                name="phone"
                label="Phone Number"
                placeholder="Enter your phone number"
                value={values.phone}
                onChange={(value) =>
                  handleChange({
                    target: { id: "phone", value },
                  })
                }
              />

              <Grid>
                <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
                  <Select
                    label="Country"
                    name="country"
                    options={countries}
                    placeholder="Select your Country"
                    //onChange={handleAppIdChange}
                    onChange={(value) =>
                      handleChange(
                        {
                          target: { id: "country", value },
                        },
                        setCountry(value)
                      )
                    }
                    value={values.country}
                    /*  helpText={<span>Country where your store is located</span>} */
                  />
                </Grid.Cell>

                <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
                  <Select
                    label="State"
                    name="state"
                    options={states}
                    onChange={(value) =>
                      handleChange(
                        {
                          target: { id: "state", value },
                        },
                        setState(value)
                      )
                    }
                    value={values.state}
                    
                    placeholder="Select your state"
                  />
                </Grid.Cell>
              </Grid>

              <Grid>
                <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
                  <TextField
                    value={values.lineAddress1}
                    //onChange={handleAppIdChange}
                    label="Line Address 1"
                    name="lineAddress1"
                    type="text"
                    placeholder="Enter your line address 1"
                    onChange={(value) =>
                      handleChange({
                        target: { id: "lineAddress1", value },
                      })
                    }
                  />
                </Grid.Cell>

                <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
                  <TextField
                    value={values.lineAddress2}
                    //onChange={handleAppIdChange}
                    label="Line Address 2"
                    name="lineAddress2"
                    type="text"
                    placeholder="Enter your line address 2"
                    onChange={(value) =>
                      handleChange({
                        target: { id: "lineAddress2", value },
                      })
                    }
                  />
                </Grid.Cell>
              </Grid>

              <Grid>
                <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
                <TextField
                    value={values.city}
                    label="City"
                    name="city"
                    type="text"
                    placeholder="Enter your city"
                    onChange={(value) =>
                      handleChange({
                        target: { id: "city", value },
                      })
                    }
                  />
                </Grid.Cell> 

                <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
                <TextField
                    value={values.postal_code}
                    label="Postal Code"
                    name="postal_code"
                    type="text"
                    placeholder="Enter your postal code"
                    onChange={(value) =>
                      handleChange({
                        target: { id: "postal_code", value },
                      })
                    }
                  />
                </Grid.Cell> 
              </Grid>

              <Button primary submit>Submit</Button>
            </FormLayout>
          </Form>
        );
      }}
    </Formik>
  );
}
