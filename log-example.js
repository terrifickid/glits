const ERROR_TYPE = {
  UNCAUGHT_EXCEPTION: "UNHANDLED_EXCEPTION",
  UNHANDLED_REJECTION: "UNHANDLED_REJECTION",
  DATASTORE_ERROR: "DATASTORE_ERROR",
  CONTENTFUL_ERROR: "CONTENTFUL_ERROR",
  GUESTY_API_ERROR: "GUESTY_API_ERROR",
};

if (!process.env.K_SERVICE) require("dotenv-json")();
var _ = require("lodash");
const express = require("express");
var cors = require("cors");
const { header } = require("express/lib/request");
const axios = require("axios"); // Import axios
const { createLogger } = require("./logger");
const { Datastore } = require("@google-cloud/datastore");
//const management = require("contentful-management");
const delivery = require("contentful");
const space_id = "lh9yezkhzosc";
const env_id = "master";
const delivery_access_token = "YOUR_DELIVERY_ACCESS_TOKEN_HERE";
//const management_access_token = "CFPAT_YOUR_MANAGEMENT_TOKEN_HERE";
const token_id = "YOUR_TOKEN_ID_HERE";
const app = express();
app.use(cors());
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: false }));
const logger = createLogger();

var token = { expires_in: 0 };

const datastore = new Datastore({
  projectId: "villabound-api", // Replace with your actual project ID
});

function getManagementClient() {
  return management.createClient({
    // This is the access token for this space. Normally you get the token in the Contentful web app
    accessToken: management_access_token,
  });
}

function getDeliveryClient() {
  return delivery.createClient({
    // This is the space ID. A space is like a project folder in Contentful terms
    space: space_id,
    // This is the access token for this space. Normally you get both ID and the token in the Contentful web app
    accessToken: delivery_access_token,
  });
}

async function queryEntries(type, query) {
  var client = getDeliveryClient();
  var res = await client.getEntries({
    limit: 250,
    content_type: type,
    ...query,
  });
  return res;
}

async function checkTokenExpiry() {
  logger.info("Checking Expiry...");
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const expiresIn = _.get(token, "expires_in", 0);
  if (currentTimestamp >= expiresIn) {
    logger.info("Token expired, fetching new token");
    const newToken = await getNewToken();
    await storeToken(newToken);
  }
}

async function getNewToken() {
  logger.info("Requesting new token...");
  const url = "https://booking.guesty.com/oauth2/token";
  const data = new URLSearchParams();
  data.append("grant_type", "client_credentials");
  data.append("scope", "booking_engine:api");
  data.append("client_id", process.env.CLIENT_ID);
  data.append("client_secret", process.env.CLIENT_SECRET);
  const config = {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cache-Control": "no-cache, no-cache",
      Accept: "application/json",
    },
  };
  try {
    const response = await axios.post(url, data.toString(), config); // Use axios.post
    const responseData = response.data; // axios response.data
    responseData.expires_in =
      Math.floor(Date.now() / 1000) + responseData.expires_in;
    return responseData;
  } catch (error) {
    logger.error(
      {
        type: ERROR_TYPE.GUESTY_API_ERROR,
        functionName: "getNewToken",
        response: error.response,
        exception: error,
      },
      "Axios OAUTH token request ERROR",
    );
  }
}

async function storeToken(t) {
  try {
    if (!_.has(t, "expires_in"))
      throw new Error("Token does not have expires_in property.");
    const key = datastore.key(["Token", "token"]);
    const entity = {
      key: key,
      data: {
        value: t,
      },
    };
    await datastore.save(entity);
    token = t;
    logger.info("Token stored in Datastore.");
  } catch (error) {
    logger.error(
      {
        type: ERROR_TYPE.GUESTY_API_ERROR,
        functionName: "getNewToken",
        response: error.response,
        exception: error,
      },
      "Error storing token",
    );
    throw new Error("Error storing token in Datastore.");
  }
}

async function searchPropertyListingsByQuery(query) {
  try {
    var results = await queryEntries("property", query);
    return _.get(results, "items", []).map((item) => {
      return _.get(item, "fields.json");
    });
  } catch (error) {
    logger.error(
      {
        type: ERROR_TYPE.CONTENTFUL_ERROR,
        functionName: "searchPropertyListingsByQuery",
        functionParams: { query },
        response: error.response,
        exception: error,
      },
      "Error querying property listings",
    );
    return [];
  }
}

async function searchPropertyListingsByKeyword(search) {
  try {
    var results = await queryEntries("property", {
      query: search,
      "fields.tags[in]": "iCal",
    });
    return _.get(results, "items", []).map((item) => {
      return _.get(item, "fields.json");
    });
  } catch (error) {
    console.error("Error:", error);
    return [];
  }
}

async function createInstantReservation(quoteId, ratePlanId, ccToken, guest) {
  const url =
    "https://booking.guesty.com/api/reservations/quotes/" +
    quoteId +
    "/instant";
  const headers = {
    accept: "application/json; charset=utf-8",
    "content-type": "application/json",
    Authorization: "Bearer " + token.access_token,
  };
  try {
    const response = await axios.post(
      url,
      { ratePlanId, ccToken, guest },
      { headers },
    );
    return response.data;
  } catch (error) {
    throw error.response.data.error.data;
  }
}

async function createInquiryReservation(
  quoteId,
  ratePlanId,
  ccToken,
  guest,
  reservedUntil,
) {
  const url =
    "https://booking.guesty.com/api/reservations/quotes/" +
    quoteId +
    "/inquiry";
  const headers = {
    accept: "application/json; charset=utf-8",
    "content-type": "application/json",
    Authorization: "Bearer " + token.access_token,
  };
  try {
    const response = await axios.post(
      url,
      { ratePlanId, ccToken, guest, reservedUntil },
      { headers },
    );
    return response.data;
  } catch (error) {
    logger.error(
      {
        type: ERROR_TYPE.GUESTY_API_ERROR,
        functionName: "createInquiryReservation",
        functionParams: { quoteId, ratePlanId, ccToken, guest, reservedUntil },
        response: error.response,
        exception: error,
      },
      "Error creating inquiry reservation",
    );
    throw error.response.data.error.data;
  }
}

async function init() {
  try {
    console.log("Checking Token...");
    const key = datastore.key(["Token", "token"]);
    const [tokenEntity] = await datastore.get(key);

    if (tokenEntity?.value) {
      console.log("Found Token:", tokenEntity.value);
      token = tokenEntity.value;
    }
  } catch (error) {
    logger.error(
      {
        type: ERROR_TYPE.DATASTORE_ERROR,
        functionName: "init",
        response: error.response,
        exception: error,
      },
      "Error fetching token",
    );
    throw new Error("Error fetching token from Datastore.");
  }
}

async function init() {
  try {
    console.log("Checking Token...");
    const key = datastore.key(["Token", "token"]);
    const [tokenEntity] = await datastore.get(key);
    //Check for Key
    if (tokenEntity && tokenEntity.value) {
      console.log("Found Token...", tokenEntity.value);
      token = tokenEntity.value; // Return the token value
      await checkTokenExpiry();
    } else {
      //No Key Found
      var newToken = await getNewToken();
      await storeToken(newToken);
    }
  } catch (error) {
    logger.error(
      {
        type: ERROR_TYPE.DATASTORE_ERROR,
        functionName: "init",
        response: error.response,
        exception: error,
      },
      "Error fetching token",
    );
    throw new Error("Error fetching token from Datastore.");
  }
}

app.post("/quote", async (req, res) => {
  const url = "https://booking.guesty.com/api/reservations/quotes";
  const headers = {
    accept: "application/json; charset=utf-8",
    "content-type": "application/json",
    Authorization: "Bearer " + token.access_token,
  };

  try {
    const response = await axios.post(url, req.body, { headers });
    res.json(response.data);
  } catch (error) {
    logger.error(
      {
        type: ERROR_TYPE.GUESTY_API_ERROR,
        functionName: "app.post /quote",
        functionParams: { req },
        response: error.response,
        exception: error,
      },
      "Quote Request Error",
    );
    res.status(500).json({ error: error.response.data });
  }
});

app.post("/keyword", async (req, res) => {
  console.log(req.body);
  try {
    var results = await searchPropertyListingsByQuery(req.body);
    res.json(results);
  } catch (error) {
    logger.error(
      {
        type: ERROR_TYPE.CONTENTFUL_ERROR,
        functionName: "app.post /keyword",
        functionParams: { req },
        response: error.response,
        exception: error,
      },
      "Keyword Search Error",
    );
    res.status(500).json({ error: error.message });
  }
});

app.post("/api", async (req, res) => {
  const url = "https://booking.guesty.com/api/" + req.body.query;
  const headers = {
    Authorization: "Bearer " + token.access_token,
    "Content-Type": "application/json",
  };

  try {
    const response = await axios.get(url, { headers });
    res.json(response.data);
  } catch (error) {
    logger.error(
      {
        type: ERROR_TYPE.GUESTY_API_ERROR,
        functionName: "app.post /api",
        functionParams: { req },
        response: error?.response,
        exception: error,
        query: req.body?.query || null,
        guestyError: error?.response?.data?.error || null,
      },
      "API Request Error",
    );

    // Send response with error details
    res.status(500).json({
      error: error?.message || "Request failed",
      code: error?.code || error?.response?.status || "UNKNOWN",
      timestamp: Date.now(),
    });
  }
});

app.post("/book", async (req, res) => {
  try {
    var reservedUntil = -1;
    var booking = await createInquiryReservation(
      req.body.quoteId,
      req.body.ratePlanId,
      req.body.ccToken,
      req.body.guest,
      reservedUntil,
    );
    res.json(booking);
  } catch (e) {
    logger.error(
      {
        type: ERROR_TYPE.GUESTY_API_ERROR,
        functionName: "app.post /book",
        functionParams: { req },
        response: e.response,
        exception: e,
      },
      "Booking Error",
    );
    res.status(500).json(e);
  }
});

app.get("/expire", async (req, res) => {
  try {
    await checkTokenExpiry();
    res.send("success!");
  } catch (error) {
    logger.error(
      {
        type: ERROR_TYPE.GUESTY_API_ERROR,
        functionName: "app.get /expire",
        functionParams: { req },
        response: error.response,
        exception: error,
      },
      "Token Expiry Check Error",
    );
    res.status(500).send(error.message);
  }
});

process.on("uncaughtException", (err, origin) => {
  logger.error(
    {
      type: ERROR_TYPE.UNCAUGHT_EXCEPTION,
      exception: err,
      origin,
      stack: err?.stack,
    },
    "Uncaught exception",
  );
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error(
    {
      type: ERROR_TYPE.UNHANDLED_REJECTION,
      promise,
      reason,
      stack: reason && reason.stack,
    },
    "Unhandled rejection",
  );
  process.exit(1);
});

app.listen(8080, async () => {
  await init();
  console.log("App is listening!");
});
