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
  Layout,
  Card,
  Link,
} from "@shopify/polaris";
import { StoreCard } from "./StoreCard";
import { Formik, Field, FieldArray } from "formik";
import { PricingCard } from "./PricingCard";

export function SettingsForm() {
  const [appId, setAppId] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [showOthers, setShowOthers] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const data = await axios.get("/dbobj");
      console.log(data, "from use effect");
      setAppId(data.data.dbObj?.appId);
      setAuthToken(data.data.dbObj?.authToken);
      if (data.data.dbObj?.appId) {
        setShowOthers(true);
      }
    };
    loadData();
  }, []);

  const initialValues = {
    appId: appId,
    authToken: authToken,
  };

  return (
    <Page fullWidth>
      <Layout>
        <Layout.Section>
          <Card sectioned>
            <Formik
              initialValues={initialValues}
              enableReinitialize={true}
              onSubmit={async (values, formikBag) => {
                console.log(values);
                const data = await axios.post("/verify_auth", { values });
                if (data.status === 200) {
                  setShowOthers(true);
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
                return (
                  <Form onSubmit={handleSubmit}>
                    <TextContainer spacing="loose">
                      <Heading>Authentication Settings</Heading>
                    </TextContainer>
                    <FormLayout>
                      <TextContainer>
                        <p>
                          Login to your{" "}
                          <Link url="https://developers.sendbox.co/">
                            Sendbox Developer
                          </Link>{" "}
                          account and get your required keys
                        </p>
                      </TextContainer>
                      <TextField
                        //value={appId}
                        //onChange={handleAppIdChange}
                        label="APP ID"
                        type="text"
                        placeholder="Enter your App Id"
                        value={values.appId}
                        onChange={(value) =>
                          handleChange({
                            target: { id: "appId", value },
                          })
                        }
                      />

                      <TextField
                        //value={authToken}
                        //onChange={handleAuthTokenChange}
                        label="Authorization Token"
                        type="text"
                        placeholder="Enter your Authorization Token"
                        value={values.authToken}
                        onChange={(value) =>
                          handleChange({
                            target: { id: "authToken", value },
                          })
                        }
                      />

                      <Button primary submit>
                        Submit
                      </Button>
                    </FormLayout>
                  </Form>
                );
              }}
            </Formik>
          </Card>
        </Layout.Section>
        {showOthers && (
          <Layout.Section>
            <Card sectioned>
              <StoreCard />
            </Card>
          </Layout.Section>
        )}
        {showOthers && (
          <Layout.Section>
            <Card sectioned>
              <PricingCard />
            </Card>
          </Layout.Section>
        )}
      </Layout>
    </Page>
  );
}
