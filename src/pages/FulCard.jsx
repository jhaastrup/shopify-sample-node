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

export function FulCard() {
  const [showBanner, setShowBanner] = useState(false);
  const [fulfillment, setFulfillment] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const data = await axios.get("/dbobj");
      console.log(data, "from use effect");
      if (data.data.dbObj?.fulfillment === true) {
        setFulfillment(true);
      }
    };
    loadData();
  }, []);

  const initialValues = {
    fulfillment,
  };

  return (
    <Formik
      initialValues={initialValues}
      enableReinitialize={true}
      onSubmit={async (values, formikBag) => {
        console.log(values);
        const data = await axios.post("/activate_ful", { values });
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
                title="Fulfillment Settings Saved Successfully"
                status="success"
                onDismiss={() => setShowBanner(false)}
              />
            )}
            <TextContainer spacing="loose">
              <Heading>Fulfillment Settings</Heading>
              <p>
                Activate Fulfillment by sendbox so we can handle all your
                fulfillment request.
              </p>
            </TextContainer>
            <FormLayout>
           
                <>
                  <br />

                  <Checkbox
                    label="Activate Fulfillment by Sendbox"
                    checked={values.fulfillment}
                    onChange={(value) =>
                      handleChange({ target: { id: "fulfillment", value } })
                    }
                    name="fulfillment"
                  />
                </>
              <Button primary submit>
                Submit
              </Button>
            </FormLayout>
          </Form>
        );
      }}
    </Formik>
  );
}
