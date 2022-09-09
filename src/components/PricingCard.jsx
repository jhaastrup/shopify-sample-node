import { useEffect, useState, useCallback } from "react";
import axios from "axios";

import {
  Form,
  FormLayout,
  TextField,
  Button,
  Page,
  Heading,
  Select,
  TextContainer,
  RadioButton,
  Stack,
  Grid,
  Banner,
  Checkbox,
} from "@shopify/polaris";
import { Formik, Field, FieldArray } from "formik";

export function PricingCard() {
  const [increase, setIncrease] = useState("no");
  const [increasePercentage, setIncreasePercentage] = useState(0);
  const [decreasePercentage, setDecreasePercentage] = useState(0);
  const [activate, setActivate] = useState(true);
  const [adjustFee, setAdjustFee] = useState("");
  const [dbAdjustFee, setDbAdjustFee] = useState("");
  const [amount, setAmount] = useState(0);
  const [showBanner, setShowBanner] = useState(false);
  const [freeShipping, setFreeShipping] = useState(false);
  const [spendLimit, setSpendLimit] = useState(0);

  const feeOptions = [
    { label: "Flat", value: "flat" },
    { label: "Increase", value: "increase" },
    { label: "Decrease", value: "decrease" },
    { label: "Realtime", value: "realtime" },
  ];

  useEffect(() => {
    const loadData = async () => {
      const data = await axios.get("/dbobj");
      console.log(data, "from use effect");
      console.log(data.data.dbObj?.store_id);
      setDbAdjustFee(data.data.dbObj?.adjust_fee);
      setAmount(data.data.dbObj?.amount);
      setIncreasePercentage(data.data.dbObj?.increasePercentage);
      setDecreasePercentage(data.data.dbObj?.decreasePercentage);
      setSpendLimit(data.data.dbObj?.spendLimit);
      if (data.data.dbObj?.activate === true) {
        setActivate(true);
      }
      if (data.data.dbObj?.activate === false) {
        setActivate(false);
      }
      if (data.data.dbObj?.activate_freeShipping === true) {
        setFreeShipping(true);
      }
    };
    loadData();
  }, []);

  const initialValues = {
    adjustFee: dbAdjustFee,
    amount: amount,
    activate: activate,
    decreasePercentage: decreasePercentage,
    increasePercentage: increasePercentage,
    freeShipping: freeShipping,
    spendLimit: spendLimit,
  };

  return (
    <Formik
      initialValues={initialValues}
      enableReinitialize={true}
      onSubmit={async (values, formikBag) => {
        console.log(values);
        const data = await axios.post("/shipping_fee", { values });
        if (data.status === 200) {
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
        setFieldValue,
      }) => {
        console.log({ errors, values });
        return (
          <Form onSubmit={handleSubmit}>
            {showBanner && (
              <Banner
                title="Shipping Fee Settings Saved Successfully"
                status="success"
                onDismiss={() => setShowBanner(false)}
              />
            )}
            <TextContainer spacing="loose">
              <Heading>Checkout Settings</Heading>
            </TextContainer>
            <FormLayout>
              <Stack vertical>
                <RadioButton
                  label="Enable Shipping Method"
                  checked={values.activate === true}
                  id="activate"
                  name="activate"
                  onChange={() => setFieldValue("activate", true)}
                  helpText="This will use sendbox quotes on checkout"
                />

                <RadioButton
                  label="Disable Shipping Method"
                  checked={values.activate === false}
                  id="deactivate"
                  name="deactivate"
                  onChange={() => setFieldValue("activate", false)}
                  helpText="This disables sendbox quotes on checkout"
                />
              </Stack>

              {values.activate === true && (
                <>
                  <TextContainer spacing="loose">
                    <Heading>Shipping Fee Settings</Heading>
                    <p>
                      Determine if you want to increase or decrease shipping
                      quotes.
                      <br />
                      You can increase or decrease quotes by flat rate or by
                      percentage or use realtime quotes from sendbox
                    </p>
                  </TextContainer>

                  <br />

                  <Grid>
                    <Grid.Cell
                      columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}
                    >
                      <Select
                        label="Adjust Shipping Fee"
                        options={feeOptions}
                        name="adjustFee"
                        placeholder="Select Shipping Fee Adjustment"
                        onChange={(value) =>
                          handleChange(
                            {
                              target: { id: "adjustFee", value },
                            },
                            setAdjustFee(value)
                          )
                        }
                        value={values.adjustFee}
                      />
                    </Grid.Cell>

                    {values?.adjustFee === "flat" && (
                      <Grid.Cell
                        columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}
                      >
                        <TextField
                          value={values.amount}
                          //onChange={handleAppIdChange}
                          label="Amount"
                          name="amount"
                          type="number"
                          placeholder="Enter amount"
                          onChange={(value) =>
                            handleChange({
                              target: { id: "amount", value },
                            })
                          }
                        />
                      </Grid.Cell>
                    )}

                    {values.adjustFee === "increase" && (
                      <Grid.Cell
                        columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}
                      >
                        <TextField
                          value={values.percentage}
                          //onChange={handleAppIdChange}
                          label="Percentage"
                          name="percantage"
                          type="number"
                          placeholder="Enter Percentage"
                          onChange={(value) =>
                            handleChange({
                              target: { id: "percentage", value },
                            })
                          }
                        />
                      </Grid.Cell>
                    )}

                    {values.adjustFee === "decrease" && (
                      <Grid.Cell
                        columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}
                      >
                        <TextField
                          value={values.percentage}
                          //onChange={handleAppIdChange}
                          label="Percentage"
                          name="percantage"
                          type="number"
                          placeholder="Enter Percentage"
                          onChange={(value) =>
                            handleChange({
                              target: { id: "percentage", value },
                            })
                          }
                        />
                      </Grid.Cell>
                    )}
                  </Grid>
                </>
              )}

              <Checkbox
                label="Allow free shipping"
                checked={values.freeShipping}
                onChange={(value) =>
                  handleChange({ target: { id: "freeShipping", value } })
                }
                name="freeShipping"
              />

              {values.freeShipping === true && (
                <TextField
                  value={values.spendLimit}
                  label="Customer spend limit"
                  helpText="This is the amount customer must spend on your site to activate shipping"
                  type="number"
                  name="spendLimit"
                  onChange={(value) =>
                    handleChange({
                      target: { id: "spendLimit", value },
                    })
                  }
                />
              )}

              {/*  {values.activate === true && (
                <Stack vertical>
                  

                  <RadioButton
                    label="Increase Shipping Fee"
                    helpText={
                      <span>
                        You can increase sendbox shipping fee to gain extra cash
                      </span>
                    }
                    checked={values.increase === "yes"}
                    value={values.increase}
                    id="yes"
                    name="yes"
                    onChange={() => setFieldValue("increase", "yes")}
                  />
                  {values.increase === "yes" && (
                    <TextField
                      value={values.increasePercentage}
                      //onChange={handleAppIdChange}
                      label="Increase Percentage"
                      name="increasePercentage"
                      type="number"
                      placeholder="Enter increase percentage"
                      helpText={
                        <span>
                          This is how much percentage you will like to increase
                          shipping fee
                        </span>
                      }
                      onChange={(value) =>
                        handleChange({
                          target: { id: "increasePercentage", value },
                        })
                      }
                    />
                  )}

                  <RadioButton
                    label="Decrease Shipping Fee"
                    helpText={
                      <span>You can decrease sendbox-shipping fee</span>
                    }
                    checked={values.increase === "no"}
                    value={values.increase}
                    id="no"
                    name="no"
                    onChange={() => setFieldValue("increase", "no")}
                  />
                  {values.increase === "no" && (
                    <TextField
                      value={values.decreasePercentage}
                      //onChange={handleAppIdChange}
                      label="Decrease Percentage"
                      name="decreasePercentage"
                      type="number"
                      placeholder="Enter decrease percentage"
                      helpText={
                        <span>
                          This is how much percentage you will like to decrease
                          shipping fee
                        </span>
                      }
                      onChange={(value) =>
                        handleChange({
                          target: { id: "decreasePercentage", value },
                        })
                      }
                    />
                  )}
                </Stack>
              )} */}

              <Button submit>Submit</Button>
            </FormLayout>
          </Form>
        );
      }}
    </Formik>
  );
}
