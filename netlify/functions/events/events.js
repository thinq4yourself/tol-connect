const fetch = require('node-fetch')

const handler = async function (event, context, callback) {
  const { httpMethod } = event;
  // GET requests
  if (httpMethod === "GET") {
    const { queryStringParameters, multiValueQueryStringParameters } = event;
    // fb webhook verification
    // See https://developers.facebook.com/docs/graph-api/webhooks/getting-started
    // Endpoint: https://connect.treeoflight.earth/.netlify/functions/events-background
    // Local Tests: https://treeoflight-2a0244.netlify.live/.netlify/functions/events
    let errorMessage = "No hub was identified";
    console.log("queryStringParameters", queryStringParameters);
    console.log("multiValueQueryStringParameters[0]", multiValueQueryStringParameters);
    const mode = queryStringParameters['hub.mode'];
    const challenge = queryStringParameters['hub.challenge'];
    const verify_token = queryStringParameters['hub.verify_token'];
    console.log("mode", mode);
    console.log("challenge", challenge);
    console.log("verify_token", verify_token);
    if (mode === "subscribe" && challenge) {
      const token = verify_token === process.env.FACEBOOK_EVENTS_WEBHOOK_TOKEN;
      errorMessage = "Your token did not match";
      if (token) {
        return {
          statusCode: 200,
          // Could be a custom message or object i.e. JSON.stringify(err)
          body: challenge,
        }
      }
      return {
        statusCode: 500,
        // Could be a custom message or object i.e. JSON.stringify(err)
        body: JSON.stringify({ mode, challenge, error: errorMessage }),
      }
    }
    return {
      statusCode: 501,
      // Could be a custom message or object i.e. JSON.stringify(err)
      body: JSON.stringify({ error: errorMessage }),
    }
  }
  /* 
  try {
    const response = await fetch('https://icanhazdadjoke.com', {
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) {
      // NOT res.status >= 200 && res.status < 300
      return { statusCode: response.status, body: response.statusText }
    }
    const data = await response.json()

    return {
      statusCode: 200,
      body: JSON.stringify({ msg: data.joke }),
    }
  } catch (error) {
    // output to netlify function log
    console.log(error)
    return {
      statusCode: 500,
      // Could be a custom message or object i.e. JSON.stringify(err)
      body: JSON.stringify({ msg: error.message }),
    }
  }
  */
}

module.exports = { handler }
